# Client-facing changelog workflow

The marketing site publishes release notes from the same conventional commit messages
that drive version bumps. The product changelog is a generated file; contributors should
describe the user-visible change and its reason in the commit message instead of editing
a release section by hand.

## Where release notes appear

| Product | Canonical history | Client-facing projection | Published location |
| --- | --- | --- | --- |
| Marketing | `apps/marketing/CHANGELOG.md` | `apps/marketing/src/data/changelog.json` | `/changelog` |

The root `CHANGELOG.md` remains the workspace-level version-bump index. It links to the
product history but is not its source.

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

## How a release updates the files

1. The release orchestrator finds changed workspaces and reads conventional commits since
   each workspace's latest tag.
2. It calculates the semantic version bump and uses the same commits to prepend the new
   marketing release to `apps/marketing/CHANGELOG.md`.
3. It regenerates `apps/marketing/src/data/changelog.json` from that Markdown.
4. It updates the root version-bump index, commits all release files, and then creates the
   annotated product tags.
5. CI can run `pnpm changelog:test` and `pnpm changelog:check` to reject malformed or
   stale projections.

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
