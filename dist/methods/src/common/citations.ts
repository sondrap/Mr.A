// Format helpers for citation metadata used in chat and the source side panel.

export function formatTimestamp(seconds: number | null | undefined): string | null {
  if (seconds === null || seconds === undefined) return null;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

// Format the locator that appears in a citation chip: `14:22` or `p. 14` or null.
export function formatLocator(source: {
  format: string;
  timestampStart?: number | null;
  pageStart?: number | null;
}): string | null {
  if (source.format === 'DOCUMENT') {
    if (source.pageStart !== null && source.pageStart !== undefined) {
      return `p. ${source.pageStart}`;
    }
    return null;
  }
  return formatTimestamp(source.timestampStart ?? null);
}
