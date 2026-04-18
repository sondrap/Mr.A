// Adversarial review agent. Takes a generated artifact + its generator's source context + skill
// rules and critiques it. Uses a different model family (Gemini) than the generator (Claude) to
// avoid shared blind spots.
//
// Returns a structured verdict that the workflow orchestrator uses to decide pass / revise / surface_issues.

import { mindstudio } from '@mindstudio-ai/agent';
import { MODELS, MODEL_CONFIGS } from './models';

export interface ReviewInput {
  skillName: string;
  skillDescription: string;
  artifactTitle: string;
  artifactBodyJson: string;                  // The JSON-serialized artifact the generator produced
  referenceMaterial: string;                 // The concept + source context block the generator saw
  attempt: number;                           // 1 for first review, 2 if we're re-reviewing after revise
}

export interface ReviewResult {
  verdict: 'pass' | 'revise' | 'surface_issues';
  issues: string[];                          // Specific concerns
  suggestedRevisions: string[];              // Paired with issues
  rawOutput: string;                         // For debugging
  parsedSuccessfully: boolean;
}

const REVIEWER_SYSTEM_PROMPT = `
You are an adversarial reviewer for generated coaching artifacts inside Mojo Results Accelerator.

Your job is to critique the artifact against FOUR criteria:
1. GROUNDING: Does every substantive claim trace to the reference material provided? If the generator made up facts, guidance, or frameworks not in the reference, flag it.
2. SKILL FIDELITY: Does the artifact honor the rules of the skill being practiced? (E.g., T1 emails must be short with one ask and no link; niche docs can't be "people"; prospect lists must cite web-verified companies.)
3. VOICE: Does it match Mr. A's voice — grounded, direct, no marketing fluff, no em-dash-heavy lowercase impersonation of Travis? No bullet points dressed up as prose. No "leverage / unlock / supercharge / empower" vocabulary. No emoji.
4. COMPLETENESS: Are the required fields filled in? If they're empty or obviously thin, flag it.

OUTPUT CONTRACT:
Return ONLY JSON matching this exact shape:
{
  "verdict": "pass" | "revise" | "surface_issues",
  "issues": ["one concise concern", "another concise concern"],
  "suggestedRevisions": ["how to address issue 1", "how to address issue 2"]
}

DECISION RULES:
- "pass" = artifact is solid on all 4 criteria. No substantive issues. Empty issues and suggestedRevisions arrays.
- "revise" = artifact has fixable issues worth regenerating for. Use this when regeneration would clearly produce a better output (e.g. the generator missed a key concept that was in scope, or produced a T1 with a link and we need to remove it).
- "surface_issues" = artifact has concerns worth telling the student about, but regeneration won't clearly fix them (e.g. the student's input was vague, or the reference material genuinely didn't cover what's needed). This mode is HONESTY MODE — we'd rather ship the artifact with visible flags than pretend.

Issues and suggestedRevisions MUST be paired 1:1. Keep them concise (one sentence each). No markdown.
`;

export async function reviewArtifact(input: ReviewInput): Promise<ReviewResult> {
  const userMessage = `
REVIEWING ARTIFACT: ${input.artifactTitle}
Skill being practiced: ${input.skillName}
${input.skillDescription}

ATTEMPT: ${input.attempt}

ARTIFACT (JSON):
${input.artifactBodyJson}

REFERENCE MATERIAL THE GENERATOR SAW (the only grounding):
${input.referenceMaterial.slice(0, 12000)}

Evaluate against the four criteria. Return your structured verdict.
`;

  try {
    const result = await mindstudio.generateText({
      message: userMessage,
      structuredOutputType: 'json',
      structuredOutputExample: JSON.stringify({
        verdict: 'pass',
        issues: [],
        suggestedRevisions: [],
      }),
      modelOverride: {
        ...MODEL_CONFIGS.REVIEWER,
        preamble: REVIEWER_SYSTEM_PROMPT,
      },
    });

    const raw = result.content ?? '';
    try {
      const parsed = JSON.parse(raw);
      if (!parsed.verdict || !['pass', 'revise', 'surface_issues'].includes(parsed.verdict)) {
        return {
          verdict: 'pass',
          issues: [],
          suggestedRevisions: [],
          rawOutput: raw,
          parsedSuccessfully: false,
        };
      }
      return {
        verdict: parsed.verdict,
        issues: Array.isArray(parsed.issues) ? parsed.issues : [],
        suggestedRevisions: Array.isArray(parsed.suggestedRevisions) ? parsed.suggestedRevisions : [],
        rawOutput: raw,
        parsedSuccessfully: true,
      };
    } catch (parseErr) {
      console.error('Reviewer returned non-JSON output:', raw.slice(0, 500));
      return {
        verdict: 'pass',
        issues: [],
        suggestedRevisions: [],
        rawOutput: raw,
        parsedSuccessfully: false,
      };
    }
  } catch (err) {
    console.error('Reviewer call failed:', err);
    // Fail-open on reviewer errors — better to ship without review than to block the student
    return {
      verdict: 'pass',
      issues: [],
      suggestedRevisions: [],
      rawOutput: '',
      parsedSuccessfully: false,
    };
  }
}
