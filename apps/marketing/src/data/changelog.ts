import raw from './changelog.json';

export type ChangelogChangeType = 'Breaking' | 'New' | 'Fixed' | 'Improved';

export type ChangelogChange = {
  type: ChangelogChangeType;
  summary: string;
  reason?: string;
};

export type ChangelogRelease = {
  version: string;
  date: string;
  changes: ChangelogChange[];
};

export type ChangelogData = {
  product: string;
  releases: ChangelogRelease[];
};

/** Typed projection — empty `releases: []` in JSON would otherwise infer `never[]`. */
export const changelog = raw as ChangelogData;
