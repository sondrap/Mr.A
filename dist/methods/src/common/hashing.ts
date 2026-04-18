import { createHash } from 'node:crypto';

// sha256 helper for content-body hashing. Used for the manifest endpoint's per-file hash
// and per-chunk `bodyHash` column.
export function sha256(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

// Canonical file-level hash: concatenate chunk bodies in chunk-index order with a
// stable separator, then sha256. The ETL handoff doc specifies this exact algorithm
// so the ETL's local hash matches MRA's computed hash for diff-sync.
export function fileLevelHash(chunkBodies: string[]): string {
  return sha256(chunkBodies.join('\n---\n'));
}
