// Shared types that cross method boundaries. Kept out of table files so they can be imported
// without pulling in db bindings.

export interface CitationChip {
  num: number;                   // Sequential in message: 1, 2, 3
  sourceId: string;              // Stable source row id
  contextShortName: string;      // CDODU, PSM, etc — UPPERCASED already
  contentName: string;           // UPPERCASED already
  locator: string | null;        // `14:22` or `p. 14` or null
  linkUrl?: string;
}

export interface ArtifactWithReview {
  id: string;
  type: string;
  title: string;
  body: string;
  bodyFormat: 'markdown' | 'json';
  version: number;
  reviewVerdict?: 'pass' | 'revise' | 'surface_issues' | null;
  reviewIssues?: string[];
  reviewSuggestions?: string[];
  citedSourceIds?: string[];
  updatedAt: number;
}
