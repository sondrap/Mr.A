// Parser for the ETL handoff format documented in src/references/etl-handoff.md.
//
// Input: full markdown text of a single file.
// Output: parsed structure with file-level frontmatter + array of chunks.
//
// Forgiving by design: missing optional fields are fine, extra bolded-key lines are ignored,
// `---` separators are optional. Rejected only when required fields are missing or invalid.

import { sha256 } from './hashing';

export interface ParsedChunk {
  chunkIndex: number;
  chunkHeading: string;
  timestampStart: number | null;
  timestampEnd: number | null;
  pageStart: number | null;
  pageEnd: number | null;
  description: string;
  linkUrl: string | null;
  body: string;
  bodyHash: string;
}

export interface ParsedFile {
  contentId: string;
  contentName: string;
  inventoryParentContentId: string;
  inventoryParentContentName?: string;
  type: 'VIDEO' | 'DOCUMENT' | 'LESSON' | 'WORKSHOP' | 'COACHING_CALL';
  linkLive?: string;
  videoDuration?: string;
  chunks: ParsedChunk[];
}

export interface ParseError {
  code: string;
  message: string;
  chunkIndex?: number;
}

export interface ParseResult {
  file: ParsedFile | null;
  errors: ParseError[];
}

// YAML frontmatter parser (very minimal — handles scalar key:value pairs with optional quotes).
// Sufficient for the frontmatter shape documented in etl-handoff.md.
function parseFrontmatter(yamlBlock: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = yamlBlock.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;
    const key = trimmed.slice(0, colonIdx).trim();
    let value = trimmed.slice(colonIdx + 1).trim();
    // Strip surrounding quotes if present
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    // Skip lists/folded blocks (>-, |, [, {) — we only care about scalar fields
    if (value.startsWith('>') || value.startsWith('|') || value.startsWith('[') || value.startsWith('{')) {
      continue;
    }
    result[key] = value;
  }
  return result;
}

// Parse a "HH:MM:SS" or "MM:SS" or bare seconds string into total seconds.
function parseTimestamp(ts: string): number | null {
  const clean = ts.trim();
  if (!clean) return null;
  const parts = clean.split(':').map((p) => p.trim());
  if (parts.some((p) => !/^\d+$/.test(p))) return null;
  if (parts.length === 3) {
    return parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseInt(parts[2], 10);
  }
  if (parts.length === 2) {
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }
  if (parts.length === 1) {
    return parseInt(parts[0], 10);
  }
  return null;
}

// Parse "## Chunk N: {locator} | {title}" into structured parts.
// Supports timestamp locators (HH:MM:SS - HH:MM:SS), page locators (p. 4-6 or p. 4),
// or no locator at all.
function parseChunkHeading(line: string): {
  index: number | null;
  locator: string | null;
  title: string;
} | null {
  const match = line.match(/^##\s+Chunk\s+(\d+):\s*(.*)$/i);
  if (!match) return null;
  const index = parseInt(match[1], 10);
  const rest = match[2].trim();

  // Try "{locator} | {title}"
  const pipeIdx = rest.indexOf('|');
  if (pipeIdx !== -1) {
    const locator = rest.slice(0, pipeIdx).trim();
    const title = rest.slice(pipeIdx + 1).trim();
    return { index, locator: locator || null, title: title || '' };
  }
  // No pipe = no locator, whole rest is title
  return { index, locator: null, title: rest };
}

function extractLocator(
  locator: string | null,
  type: ParsedFile['type']
): { tsStart: number | null; tsEnd: number | null; pageStart: number | null; pageEnd: number | null } {
  if (!locator) return { tsStart: null, tsEnd: null, pageStart: null, pageEnd: null };

  // Page locator: "p. 4" or "p. 4-6"
  const pageMatch = locator.match(/^p\.\s*(\d+)(?:\s*-\s*(\d+))?$/i);
  if (pageMatch) {
    return {
      tsStart: null,
      tsEnd: null,
      pageStart: parseInt(pageMatch[1], 10),
      pageEnd: pageMatch[2] ? parseInt(pageMatch[2], 10) : null,
    };
  }

  // Timestamp range: "HH:MM:SS - HH:MM:SS" (or MM:SS variants)
  const rangeMatch = locator.match(/^([\d:]+)\s*-\s*([\d:]+)$/);
  if (rangeMatch) {
    const tsStart = parseTimestamp(rangeMatch[1]);
    const tsEnd = parseTimestamp(rangeMatch[2]);
    if (tsStart !== null && tsEnd !== null) {
      return { tsStart, tsEnd, pageStart: null, pageEnd: null };
    }
  }

  return { tsStart: null, tsEnd: null, pageStart: null, pageEnd: null };
}

export function parseChunkedMarkdown(content: string): ParseResult {
  const errors: ParseError[] = [];

  // Split off frontmatter
  const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!frontmatterMatch) {
    errors.push({ code: 'invalid_yaml_frontmatter', message: 'Missing or malformed --- frontmatter block' });
    return { file: null, errors };
  }

  const frontmatter = parseFrontmatter(frontmatterMatch[1]);
  const bodyText = frontmatterMatch[2];

  // Validate required fields
  const required = ['content_id', 'content_name', 'inventory_parent_content_id', 'type'] as const;
  for (const field of required) {
    if (!frontmatter[field]) {
      errors.push({ code: 'missing_required_field', message: `Missing required field: ${field}` });
    }
  }
  if (errors.length > 0) return { file: null, errors };

  const allowedTypes = ['VIDEO', 'DOCUMENT', 'LESSON', 'WORKSHOP', 'COACHING_CALL'];
  const type = frontmatter.type.toUpperCase();
  if (!allowedTypes.includes(type)) {
    errors.push({ code: 'invalid_type', message: `type must be one of ${allowedTypes.join(', ')}; got ${frontmatter.type}` });
    return { file: null, errors };
  }

  // Parse chunks: split the body by the "## Chunk N: ..." heading markers.
  // We find all heading positions first, then slice between them. Simple and non-recursive.
  const chunkRegex = /^##\s+Chunk\s+\d+:.*$/gim;
  const positions: number[] = [];
  let match: RegExpExecArray | null;
  while ((match = chunkRegex.exec(bodyText)) !== null) {
    positions.push(match.index);
  }

  const parts: string[] = [];
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i];
    const end = i + 1 < positions.length ? positions[i + 1] : bodyText.length;
    parts.push(bodyText.slice(start, end));
  }

  const chunks: ParsedChunk[] = [];
  const seenIndexes = new Set<number>();

  for (const part of parts) {
    if (!part.trim()) continue;
    const lines = part.split('\n');
    const headingLine = lines[0];
    const parsed = parseChunkHeading(headingLine);
    if (!parsed || parsed.index === null) {
      errors.push({ code: 'malformed_chunk_heading', message: `Could not parse: ${headingLine.slice(0, 120)}` });
      continue;
    }

    if (seenIndexes.has(parsed.index)) {
      errors.push({ code: 'duplicate_chunk_index', chunkIndex: parsed.index, message: `Duplicate chunk index ${parsed.index}` });
      continue;
    }
    seenIndexes.add(parsed.index);

    const { tsStart, tsEnd, pageStart, pageEnd } = extractLocator(parsed.locator, type as ParsedFile['type']);

    // Walk remaining lines. Pull **Description:** and **Source Link:** lines into metadata; rest is body.
    let description = '';
    let linkUrl: string | null = null;
    const bodyLines: string[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const descMatch = line.match(/^\*\*Description:\*\*\s*(.*)$/);
      if (descMatch && !description) {
        description = descMatch[1].trim();
        continue;
      }
      const linkMatch = line.match(/^\*\*Source Link:\*\*\s*(.*)$/);
      if (linkMatch && !linkUrl) {
        linkUrl = linkMatch[1].trim();
        continue;
      }
      // Other bolded-key metadata lines are tolerated and dropped
      if (/^\*\*[A-Za-z][^*:]*:\*\*/.test(line)) {
        continue;
      }
      // Strip horizontal rule separators between chunks
      if (line.trim() === '---') continue;
      bodyLines.push(line);
    }

    const body = bodyLines.join('\n').trim();
    chunks.push({
      chunkIndex: parsed.index,
      chunkHeading: parsed.title,
      timestampStart: tsStart,
      timestampEnd: tsEnd,
      pageStart,
      pageEnd,
      description,
      linkUrl: linkUrl ?? frontmatter.link_live ?? null,
      body,
      bodyHash: sha256(body),
    });
  }

  if (chunks.length === 0) {
    errors.push({ code: 'no_chunks_found', message: 'File had frontmatter but no parseable chunks' });
  }

  const file: ParsedFile = {
    contentId: frontmatter.content_id,
    contentName: frontmatter.content_name,
    inventoryParentContentId: frontmatter.inventory_parent_content_id,
    inventoryParentContentName: frontmatter.inventory_parent_content_name,
    type: type as ParsedFile['type'],
    linkLive: frontmatter.link_live,
    videoDuration: frontmatter.video_duration,
    chunks,
  };

  return { file, errors };
}

// Format a source ID from contentId + chunkIndex with zero-padded index.
export function sourceId(contentId: string, chunkIndex: number): string {
  return `${contentId}-${String(chunkIndex).padStart(2, '0')}`;
}
