// Concept linker task agent. Reads a chunk + the concept catalog and returns structured
// concept_sources links with depth and role. Also surfaces candidate new concepts.

import { db, mindstudio } from '@mindstudio-ai/agent';
import { Concepts } from '../tables/concepts';
import { ConceptSources, conceptSourceLinkKey } from '../tables/concept_links';
import { CandidateConcepts } from '../tables/ontology_candidates';
import { Sources } from '../tables/sources';
import { MODEL_CONFIGS } from './models';

// Source row shape needed by the linker. Defining it here so callers can
// pre-fetch sources in bulk and pass them in directly without re-reading
// each one (the per-call Sources.get was the main contributor to DB pool
// pressure that caused mass relink failures at high concurrency).
export interface SourceForLinker {
  id: string;
  chunkHeading?: string | null;
  description?: string | null;
  contentName?: string | null;
  body: string;
}

export interface LinkResult {
  sourceId: string;
  linksCreated: number;
  candidatesSurfaced: number;
  error?: string;
}

const TRANSIENT_HINTS = [
  'ambiguous column name',
  'AppDbService error 500',
  'fetch failed',
  'ECONNRESET',
  'ETIMEDOUT',
  'rate_limit',
  '503',
  '504',
];

function isTransient(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return TRANSIENT_HINTS.some((h) => msg.includes(h));
}

async function withRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  // 4 attempts with longer backoffs because pool-exhaustion errors stay
  // transient for tens of seconds, not 1-2s. Full retry budget is roughly
  // 2 + 6 + 18 = 26 seconds, which has been enough in practice to ride
  // out the platform's worst sustained pressure window.
  const BACKOFFS_MS = [2000, 6000, 18000];
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= BACKOFFS_MS.length || !isTransient(err)) throw err;
      const base = BACKOFFS_MS[attempt];
      const jitter = Math.random() * 1000;
      console.warn(`[linker] ${label} failed, retrying in ${Math.round(base + jitter)}ms (attempt ${attempt + 2}):`, err);
      await new Promise((r) => setTimeout(r, base + jitter));
      attempt += 1;
    }
  }
}

// Original ID-based entry point. Fetches the source row then delegates.
// Kept for any callers that still pass IDs (the relink path now uses the
// pre-fetched variant below for much better DB efficiency).
export async function linkConceptsForSource(
  sourceId: string,
  conceptCatalog: Array<{ slug: string; name: string; description: string; aliases: string[] }>
): Promise<LinkResult> {
  let source: SourceForLinker | null = null;
  try {
    // Wrapping Sources.get in an explicit async fn so its Query becomes
    // a real Promise (Query is then-able but not Promise-typed).
    source = await withRetry(`Sources.get(${sourceId})`, async () => Sources.get(sourceId));
  } catch (err) {
    return {
      sourceId,
      linksCreated: 0,
      candidatesSurfaced: 0,
      error: err instanceof Error ? err.message : 'source_get_failed',
    };
  }
  if (!source) return { sourceId, linksCreated: 0, candidatesSurfaced: 0, error: 'source_not_found' };
  return linkConceptsForSourceData(source, conceptCatalog);
}

// New entry point: caller has already fetched the source row, so we don't
// hit the DB to read it. Used by the relink advance helper, which bulk-
// fetches all sources for the batch in a single query before forking.
export async function linkConceptsForSourceData(
  source: SourceForLinker,
  conceptCatalog: Array<{ slug: string; name: string; description: string; aliases: string[] }>
): Promise<LinkResult> {
  const sourceId = source.id;
  try {
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

    const result = await withRetry(`generateText(${sourceId})`, () =>
      mindstudio.generateText({
        message: prompt,
        structuredOutputType: 'json',
        structuredOutputExample: JSON.stringify({
          links: [{ conceptSlug: 'EXAMPLE', depth: 5, role: 'primary_teaching', extract: 'quote' }],
          candidate_new_concepts: [],
        }),
        modelOverride: MODEL_CONFIGS.CONCEPT_LINKER,
      }),
    );

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

    // Combine all writes for this chunk into one batched round-trip,
    // wrapped in retry so transient platform errors don't lose the work.
    if (linkWrites.length > 0 || candidateWrites.length > 0) {
      await withRetry(`db.batch(${sourceId} writes)`, () =>
        db.batch(...linkWrites, ...candidateWrites),
      );
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
