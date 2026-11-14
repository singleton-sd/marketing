# AGENTS — singleton-sd/marketing

Company marketing landing for **Singleton Software Development** (`singletonsd.com`).

## Repo tag

ClickUp tickets must include `[repo=singleton-sd/marketing]`.

## ClickUp

- List: [Landing Page](https://app.clickup.com/90161394355/v/li/901616382438) (`list_id=901616382438`)
- Statuses: `to do` → `planning` → `in progress` → `complete`
- Ticket prefix for commits: `MKT-<n>` (map ClickUp task ids in commit body when useful)

## Stack

| Layer | Choice |
| --- | --- |
| Site | Astro SSG (`apps/marketing`) |
| CMS | Decap at `/admin` (GitHub backend) |
| OAuth | API gateway `https://api.singletonsd.com` (`v1/cms-auth`) |
| Host | GitHub Pages (`www.singletonsd.com`, CNAME `singleton-sd.github.io`) |
| Preview | `/pr-preview/pr-<number>/` on the same custom domain |
| Assets CDN | `assets.singletonsd.com` (favicons/OG — link only, no binaries in repo) |

Azure SWA `ssd-mkt-prod-ae` is the previous host. Leave it in place until DNS
has moved, then delete it last. Do not change DNS, GitHub Pages settings, or
Azure resources from an agent. See [`docs/deployment.md`](docs/deployment.md).

## Delivery

- Feature branches: `feature/MKT-<n>-<kebab>` in a worktree when possible
- Human PRs get Pages previews from `.github/workflows/preview.yml`
- Never put secrets in GitHub Secrets — hosting uses `GITHUB_TOKEN` only

## Sources of truth (poc)

When copying patterns from `poc-inkads-marketing` or `poc-plattform-kit`,
**always** inspect `origin/main` after `git fetch origin main` (local checkouts
are often detached/behind). Do not rely on a dirty or stale worktree.

## Commands

```bash
pnpm install
pnpm dev
pnpm --filter @singleton-sd/marketing build
pnpm release          # dry-run the next vX.Y.Z tag + GitHub Release notes
pnpm release:ci       # tag + GitHub Release only (CI; never commits or pushes main)
pnpm changelog:test   # client-facing changelog unit tests
pnpm changelog:check  # MD ↔ JSON projection drift check
```

## Git conventions tooling

| Tool | Role |
| --- | --- |
| husky | Hooks: commit-msg, pre-commit, post-checkout |
| commitlint | Conventional commits + `MKT-<n>` ticket rule (`.commitlintrc.cjs`) |
| `scripts/release-changed.mjs` | Tag-only `vX.Y.Z` + GitHub Release from conventional commits |
| `scripts/client-changelog.mjs` | Client-facing `/changelog` Markdown + JSON projections |
| release-it | Available for manual/single-package use (`.release-it.json`; git/GitHub off) |
| Root `CHANGELOG.md` | Date sections with package bump index |
| `apps/marketing/CHANGELOG.md` | Canonical product release notes → `/changelog` |

Branch names: `feature/MKT-<n>-slug`, `hotfix/MKT-<n>-slug`, `release/vX.Y.Z`, or `main`.

Release tags: `vX.Y.Z` (legacy `@singleton-sd/marketing@x.y.z` tags are still
read when computing the next version).

Decap `/admin` login uses the API gateway
(`https://api.singletonsd.com/v1/cms-auth/auth`). Callback is
`https://api.singletonsd.com/v1/cms-auth/callback` (server-side).
Add origins or deploy CMS auth only on the gateway — not here.
