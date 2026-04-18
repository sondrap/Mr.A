// Shared types used across frontend components.

export interface CitationChip {
  num: number;
  sourceId: string;
  contextShortName: string;
  contentName: string;
  locator: string | null;
  linkUrl?: string;
}
