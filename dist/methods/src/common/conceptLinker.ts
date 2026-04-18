// Concept linker task agent. Reads a chunk + the concept catalog and returns structured
// concept_sources links with depth and role. Also surfaces candidate new concepts.

import { mindstudio } from '@mindstudio-ai/agent';
import { Concepts } from '../tables/concepts';
import { ConceptSources, conceptSourceLinkKey } from '../tables/concept_links';
import { CandidateConcepts } from '../tables/ontology_candidates';
import { Sources } from '../tables/sources';
import { MODEL_CONFIGS } from './models';

export interface LinkResult {
  sourceId: string;
  linksCreated: number;
  candidatesSurfaced: number;
  error?: string;
}

export async function linkConceptsForSource(
  sourceId: string,
  conceptCatalog: Array<{ slug: string; name: string; description: string; aliases: string[] }>
): Promise<LinkResult> {
  try {
    const source = await Sources.get(sourceId);
    if (!source) return { sourceId, linksCreated: 0, candidatesSurfaced: 0, error: 'source_not_found' };

    const catalogSummary = conceptCatalog
      .map((c) => `- ${c.slug}: ${c.name} — ${c.description.slice(0, 200)}`)
      .join('\n');

    const prompt = `
Analyze this chunk of training content and identify which of the known concepts it teaches.

CONCEPT CATALOG (use exact slugs from this list):
${catalogSummary}

CHUNK METADATA:
Heading: ${source.chunkHeading}
Description: ${source.description}
Content name: ${source.contentName}

CHUNK BODY (first 3000 chars):
${source.body.slice(0, 3000)}

Return ONLY JSON matching this example:
{
  "links": [
    { "conceptSlug": "GIVING_FUNNEL", "depth": 5, "role": "primary_teaching", "extract": "one short quote showing the teaching" },
    { "conceptSlug": "COFFEE_DATE_MODEL", "depth": 3, "role": "applied_example", "extract": "brief extract" }
  ],
  "candidate_new_concepts": [
    { "suggestedSlug": "REVERSE_RFP", "suggestedName": "Reverse RFP", "suggestedDescription": "short description", "evidence": "quote from the chunk" }
  ]
}

RULES:
- depth is 1-5. 5 = this chunk is the primary teaching of the concept. 3 = applied example. 1 = passing reference.
- role must be one of: primary_teaching, applied_example, reference_mention.
- Only include concepts that are actually taught or applied in THIS chunk. No speculation.
- Only surface candidate new concepts if the chunk is clearly teaching something substantial that isn't in the catalog. Empty array is fine.
- Keep extracts under 200 characters.
- If the chunk doesn't teach any concept from the catalog, return empty links array.
`;

    const result = await mindstudio.generateText({
      message: prompt,
      structuredOutputType: 'json',
      structuredOutputExample: JSON.stringify({
        links: [{ conceptSlug: 'EXAMPLE', depth: 5, role: 'primary_teaching', extract: 'quote' }],
        candidate_new_concepts: [],
      }),
      modelOverride: MODEL_CONFIGS.CONCEPT_LINKER,
    });

    const raw = result.content ?? '';
    let parsed: {
      links: Array<{ conceptSlug: string; depth: number; role: string; extract?: string }>;
      candidate_new_concepts: Array<{
        suggestedSlug: string;
        suggestedName: string;
        suggestedDescription: string;
        evidence: string;
      }>;
    };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { sourceId, linksCreated: 0, candidatesSurfaced: 0, error: 'parse_failed' };
    }

    const validConceptSlugs = new Set(conceptCatalog.map((c) => c.slug));

    // Concept links
    const linkInputs = (parsed.links ?? [])
      .filter((link) => validConceptSlugs.has(link.conceptSlug))
      .filter((link) => link.depth >= 1 && link.depth <= 5)
      .filter((link) => ['primary_teaching', 'applied_example', 'reference_mention'].includes(link.role));

    const linkWrites = linkInputs.map((link) =>
      ConceptSources.upsert('linkKey', {
        linkKey: conceptSourceLinkKey(link.conceptSlug, source.id),
        conceptSlug: link.conceptSlug,
        sourceId: source.id,
        depth: link.depth,
        role: link.role as 'primary_teaching' | 'applied_example' | 'reference_mention',
        extract: (link.extract ?? '').slice(0, 220),
      })
    );

    // Candidate new concepts
    const candidateInputs = (parsed.candidate_new_concepts ?? []).map((cand) => {
      const slug = cand.suggestedSlug.toUpperCase().replace(/[^A-Z0-9_]/g, '_').slice(0, 60);
      if (!slug || validConceptSlugs.has(slug)) return null;
      return {
        suggestedSlug: slug,
        suggestedName: cand.suggestedName.slice(0, 200),
        suggestedDescription: cand.suggestedDescription.slice(0, 1000),
        evidence: cand.evidence.slice(0, 500),
        foundInSourceId: source.id,
        timesObserved: 1,
        status: 'pending' as const,
      };
    }).filter((c): c is NonNullable<typeof c> => c !== null);

    const candidateWrites = candidateInputs.map((c) =>
      CandidateConcepts.upsert('suggestedSlug', c)
    );

    if (linkWrites.length > 0 || candidateWrites.length > 0) {
      await Promise.all([...linkWrites, ...candidateWrites]);
    }

    return {
      sourceId,
      linksCreated: linkWrites.length,
      candidatesSurfaced: candidateWrites.length,
    };
  } catch (err) {
    console.error(`Concept linker error for source ${sourceId}:`, err);
    return {
      sourceId,
      linksCreated: 0,
      candidatesSurfaced: 0,
      error: err instanceof Error ? err.message : 'unknown',
    };
  }
}

export async function loadConceptCatalog() {
  const concepts = await Concepts.toArray();
  return concepts.map((c) => ({
    slug: c.slug,
    name: c.name,
    description: c.description,
    aliases: c.aliases ?? [],
  }));
}
