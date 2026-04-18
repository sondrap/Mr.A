// Normalize email for case-insensitive comparison in the access_grants allowlist.
// Lowercases and trims whitespace. Does not strip gmail plus-addressing or dots —
// those are treated as distinct addresses deliberately.
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
