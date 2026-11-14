# Client-facing changelog workflow

The marketing site publishes release notes from the same conventional commit messages
that drive `vX.Y.Z` tags. Contributors should describe the user-visible change and its
reason in the commit message instead of editing a release section by hand.

## Where release notes appear

| Product | Canonical history | Committed snapshot / fallback | Published location |
| --- | --- | --- | --- |
| Marketing | `vX.Y.Z` git tags + GitHub Releases | `apps/marketing/CHANGELOG.md` / `changelog.json` | `/changelog` |

The root `CHANGELOG.md` remains a historical workspace bump index. It is not updated by
the tag-only release workflow.

## Write a client-facing commit

Use a conventional commit subject. Only these types become public release-note entries:

| Commit | Public group | Version effect |
| --- | --- | --- |
| `feat:` | New | Minor |
| `fix:` | Fixed | Patch |
| `perf:` | Improved | Patch |
| `feat!:` or a `BREAKING CHANGE:` footer | Breaking | Major |

The subject becomes the short client-facing summary. The first explanatory prose line in
the body becomes the reason shown beneath it. Ticket IDs and a trailing pull-request
number are removed from the public summary.

```text
feat: MKT-13 Let visitors browse What’s new (#1)

Customers can see website improvements without reading the git log.
```

This produces:

```text
New
Let visitors browse What’s new
Customers can see website improvements without reading the git log.
```

Keep the subject understandable without internal context, and use the body to answer
**why the change helps a visitor**. Bullets, headings, ticket references, and co-author
trailers are not selected as the reason. Commits such as `docs:`, `test:`, `chore:`, and
non-breaking `refactor:` do not create a public entry or version bump.

## How a release publishes notes

Releases are tag-only: CI does not commit changelog files or push to `main`.

1. The release orchestrator reads conventional commits since the latest reachable
   `vX.Y.Z` (or legacy `@singleton-sd/marketing@x.y.z`) tag.
2. It calculates the semantic bump, pushes an annotated `vX.Y.Z` tag, and creates a
   GitHub Release whose notes come from those commits.
3. `/changelog` is generated at build time from the same git tags, so What’s new stays
   current without a version-bump commit. `apps/marketing/CHANGELOG.md` and
   `changelog.json` remain a committed snapshot / fallback.
4. CI can run `pnpm changelog:test` and `pnpm changelog:check` to reject malformed or
   stale committed projections.

Only commits touching `apps/marketing/**` (plus related watch paths) are included.

## Verify before merge

```bash
pnpm changelog:test
pnpm changelog:check
```

To rebuild history from tags (after `git fetch origin --tags`):

```bash
pnpm changelog:backfill:dry-run
pnpm changelog:backfill
```
