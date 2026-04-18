// The core orchestrator for workflow step execution.
//
// Given a workflow run + step index + student input:
//   1. Load step config + prior state
//   2. Build the concept + source context block (grounding)
//   3. Run the generator task agent (runTask with optional web tools, structured output)
//   4. If generation fails parsing, mark workflow run as flagged
//   5. Run the reviewer on the generated artifact
//   6. Act on verdict:
//      - pass   → save artifact as verdict=pass, advance step
//      - revise → regenerate once with critique injected; if 2nd review also fails, treat as surface_issues
//      - surface_issues → save artifact with issues attached, student sees MR. A FLAGGED CONCERNS
//   7. Update workflow_runs row with final status + advance currentStep when ready
//
// Fire-and-forget: this function runs in the background. Callers don't await it.
// All updates go to the database so the frontend polling getWorkflowRun sees progress.

import { mindstudio } from '@mindstudio-ai/agent';
import { WorkflowRuns } from '../tables/workflow_runs';
import { Artifacts } from '../tables/artifacts';
import { Projects } from '../tables/projects';
import { Skills } from '../tables/skills';
import { Reviews } from '../tables/reviews';
import { MODELS, MODEL_CONFIGS } from './models';
import { getStepConfig, type PromptContext, type WorkflowStepConfig } from './workflowSteps';
import { buildConceptsContext } from './conceptRetrieval';
import { reviewArtifact } from './reviewArtifact';

export interface ExecuteStepInput {
  userId: string;
  runId: string;
  stepIndex: number;
  studentInput: Record<string, unknown>;
}

export async function executeWorkflowStep(input: ExecuteStepInput): Promise<void> {
  const { runId, stepIndex, studentInput } = input;

  try {
    const run = await WorkflowRuns.get(runId);
    if (!run) {
      console.error(`executeWorkflowStep: run ${runId} not found`);
      return;
    }

    const stepConfig = getStepConfig(run.workflowSlug, stepIndex);
    if (!stepConfig) {
      await WorkflowRuns.update(runId, {
        status: 'flagged',
        lastError: `No step config for workflow ${run.workflowSlug} step ${stepIndex}`,
      });
      return;
    }

    const project = await Projects.get(run.projectId);
    if (!project) {
      console.error(`executeWorkflowStep: project ${run.projectId} not found`);
      return;
    }

    // Load the skill this step maps to (for review context)
    const skill = await Skills.findOne((s) => s.slug === stepConfig.skillSlug);

    // Mark as generating + record the student's input into state
    const updatedState = { ...(run.state ?? {}), [`step${stepIndex}`]: studentInput };
    await WorkflowRuns.update(runId, {
      status: 'generating',
      generationStartedAt: Date.now(),
      lastStreamMessage: `Pulling reference material for step ${stepIndex}: ${stepConfig.title}`,
      state: updatedState,
    });

    // Phase 1 — Build grounding context
    const { contextBlock, sourceIds } = await buildConceptsContext(stepConfig.conceptSlugs);

    await WorkflowRuns.update(runId, {
      lastStreamMessage: `Generating: ${stepConfig.artifactTitle}`,
    });

    // Build prompt context for this step
    const priorNiche = (updatedState['step1'] as { nicheStatement?: string } | undefined)?.nicheStatement;
    const nicheText = project.niche ?? priorNiche ?? '';

    const promptCtx: PromptContext = {
      projectName: project.name,
      partnerName: project.partnerName,
      nicheText,
      priorState: updatedState,
      studentInput,
      conceptsContext: contextBlock,
    };

    // Phase 2 — Run the generator
    const artifactJson = await runGenerator(stepConfig, promptCtx);

    if (!artifactJson.parsedSuccessfully) {
      await WorkflowRuns.update(runId, {
        status: 'flagged',
        lastStreamMessage: `Generation produced invalid output for step ${stepIndex}. See raw output in review row.`,
        lastError: 'generator_parse_failed',
      });
      await saveArtifact({
        run,
        stepConfig,
        body: artifactJson.rawOutput,
        bodyFormat: 'markdown',
        citedSourceIds: sourceIds,
        verdict: 'surface_issues',
        issues: ['The generator produced output that could not be parsed as structured data.'],
        suggestedRevisions: ['Regenerate this step — transient model issue.'],
      });
      return;
    }

    // Phase 3 — Run reviewer
    await WorkflowRuns.update(runId, {
      status: 'reviewing',
      lastStreamMessage: 'Checking the draft against the reference material',
    });

    const review1 = await reviewArtifact({
      skillName: skill?.name ?? stepConfig.title,
      skillDescription: skill?.description ?? '',
      artifactTitle: stepConfig.artifactTitle,
      artifactBodyJson: artifactJson.json,
      referenceMaterial: contextBlock,
      attempt: 1,
    });

    // Record the first review pass
    await Reviews.push({
      entityType: 'artifact',
      entityId: runId,
      verdict: review1.verdict,
      issues: review1.issues,
      suggestedRevisions: review1.suggestedRevisions,
      modelUsed: MODELS.REVIEWER,
      attempt: 1,
    });

    let finalVerdict = review1.verdict;
    let finalIssues = review1.issues;
    let finalSuggestions = review1.suggestedRevisions;
    let finalJson = artifactJson.json;

    if (review1.verdict === 'revise') {
      await WorkflowRuns.update(runId, {
        status: 'revising',
        lastStreamMessage: 'Revising based on review feedback',
      });

      // Regenerate once with critique injected
      const critique = review1.issues
        .map((issue, i) => `- ${issue}\n  (to fix: ${review1.suggestedRevisions[i] ?? ''})`)
        .join('\n');

      const revisedCtx: PromptContext = {
        ...promptCtx,
        studentInput: {
          ...studentInput,
          _reviewerCritique: critique,
        },
      };

      const artifactJson2 = await runGenerator(stepConfig, revisedCtx, true);
      if (artifactJson2.parsedSuccessfully) {
        const review2 = await reviewArtifact({
          skillName: skill?.name ?? stepConfig.title,
          skillDescription: skill?.description ?? '',
          artifactTitle: stepConfig.artifactTitle,
          artifactBodyJson: artifactJson2.json,
          referenceMaterial: contextBlock,
          attempt: 2,
        });
        await Reviews.push({
          entityType: 'artifact',
          entityId: runId,
          verdict: review2.verdict,
          issues: review2.issues,
          suggestedRevisions: review2.suggestedRevisions,
          modelUsed: MODELS.REVIEWER,
          attempt: 2,
        });

        if (review2.verdict === 'pass') {
          finalVerdict = 'pass';
          finalIssues = [];
          finalSuggestions = [];
          finalJson = artifactJson2.json;
        } else {
          finalVerdict = 'surface_issues';
          finalIssues = review2.issues;
          finalSuggestions = review2.suggestedRevisions;
          finalJson = artifactJson2.json;
        }
      } else {
        finalVerdict = 'surface_issues';
      }
    }

    // Phase 4 — Save artifact
    await saveArtifact({
      run,
      stepConfig,
      body: finalJson,
      bodyFormat: 'json',
      citedSourceIds: sourceIds,
      verdict: finalVerdict,
      issues: finalIssues,
      suggestedRevisions: finalSuggestions,
    });

    // Phase 5 — Update run status
    const isLastStep = stepIndex >= run.totalSteps;
    const newStatus = finalVerdict === 'surface_issues' ? 'flagged' : 'ready';
    await WorkflowRuns.update(runId, {
      status: isLastStep && finalVerdict !== 'surface_issues' ? 'ready' : newStatus,
      lastStreamMessage: finalVerdict === 'surface_issues'
        ? `Step ${stepIndex} complete with ${finalIssues.length} concerns to review`
        : `Step ${stepIndex} complete`,
    });

    // Touch project activity
    await Projects.update(project.id, { lastActivityAt: Date.now() });
  } catch (err) {
    console.error('executeWorkflowStep failed:', err);
    const message = err instanceof Error ? err.message : String(err);
    await WorkflowRuns.update(runId, {
      status: 'flagged',
      lastError: `Step execution threw: ${message}`,
      lastStreamMessage: 'Step generation failed. Try regenerating.',
    });
  }
}

// Helper: run the generator (with or without tools) and return parsed JSON
async function runGenerator(
  stepConfig: WorkflowStepConfig,
  ctx: PromptContext,
  isRevision = false
): Promise<{ json: string; rawOutput: string; parsedSuccessfully: boolean }> {
  const prompt = stepConfig.buildPrompt(ctx);
  const exampleJson = JSON.stringify(stepConfig.structuredOutputExample);

  try {
    if (stepConfig.allowWebTools) {
      // Partner-research step: runTask with web tools
      const taskResult = await mindstudio.runTask({
        prompt,
        input: {
          nicheText: ctx.nicheText,
          partnerName: ctx.partnerName,
          studentInput: ctx.studentInput,
          isRevision,
        },
        tools: ['searchGoogle', 'scrapeUrl', 'searchGoogleNews'],
        structuredOutputExample: exampleJson,
        model: MODELS.WORKFLOW_GENERATOR,
        maxTurns: 15,
      });
      const outputJson = JSON.stringify(taskResult.output ?? {});
      return {
        json: outputJson,
        rawOutput: taskResult.outputRaw ?? outputJson,
        parsedSuccessfully: taskResult.parsedSuccessfully,
      };
    } else {
      // All other steps: simple generateText with structured output
      const result = await mindstudio.generateText({
        message: prompt,
        structuredOutputType: 'json',
        structuredOutputExample: exampleJson,
        modelOverride: MODEL_CONFIGS.WORKFLOW_GENERATOR,
      });
      const raw = result.content ?? '';
      try {
        const parsed = JSON.parse(raw);
        return { json: JSON.stringify(parsed), rawOutput: raw, parsedSuccessfully: true };
      } catch {
        return { json: raw, rawOutput: raw, parsedSuccessfully: false };
      }
    }
  } catch (err) {
    console.error('Generator call failed:', err);
    return { json: '', rawOutput: String(err), parsedSuccessfully: false };
  }
}

// Helper: save or upsert the artifact for this step
async function saveArtifact(args: {
  run: { id: string; userId: string; projectId: string };
  stepConfig: WorkflowStepConfig;
  body: string;
  bodyFormat: 'markdown' | 'json';
  citedSourceIds: string[];
  verdict: 'pass' | 'revise' | 'surface_issues';
  issues: string[];
  suggestedRevisions: string[];
}) {
  const existing = await Artifacts.findOne(
    (a) => a.workflowRunId === args.run.id && a.stepIndex === args.stepConfig.index
  );

  if (existing) {
    await Artifacts.update(existing.id, {
      body: args.body,
      bodyFormat: args.bodyFormat,
      version: existing.version + 1,
      reviewVerdict: args.verdict,
      reviewIssues: args.issues,
      reviewSuggestions: args.suggestedRevisions,
      citedSourceIds: args.citedSourceIds,
    });
  } else {
    await Artifacts.push({
      userId: args.run.userId,
      projectId: args.run.projectId,
      workflowRunId: args.run.id,
      stepIndex: args.stepConfig.index,
      type: args.stepConfig.artifactType,
      title: args.stepConfig.artifactTitle,
      body: args.body,
      bodyFormat: args.bodyFormat,
      version: 1,
      reviewVerdict: args.verdict,
      reviewIssues: args.issues,
      reviewSuggestions: args.suggestedRevisions,
      citedSourceIds: args.citedSourceIds,
      archived: false,
    });
  }
}
