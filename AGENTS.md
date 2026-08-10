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
| OAuth | Azure Function `ssd-mkt-decap-oauth-prod-ae` |
| Host | Azure SWA Free `ssd-mkt-prod-ae` |
| Secrets | Shared KV `ssd-global-kv-prod-ae` in `rg-ssd-global` |
| App RG | `rg-ssd-marketing` |
| Subscription | `01c0bb8b-3770-4765-979a-cb13ae7e3dd2` (Singleton SD) |

## Delivery

- Feature branches: `feature/MKT-<n>-<kebab>` in a worktree when possible
- Solo agent runs may merge to `main` without PRs; still maintain `preview-marketing.yml` for human PRs
- Never put secrets in GitHub Secrets — OIDC → Key Vault only

## Sources of truth (poc)

When copying patterns from `poc-plattform-kit`, **always** inspect
`origin/main` after `git fetch origin main` (local checkouts are often
detached/behind). Do not rely on a dirty or stale worktree.

## Commands

```bash
pnpm install
pnpm dev
pnpm --filter @singleton-sd/marketing build
pnpm --filter @singleton-sd/marketing-oauth test
pnpm release          # dry-run path-aware package bumps
pnpm release:ci       # bump, CHANGELOG, commit, tag, push (CI only)
pnpm changelog:test   # client-facing changelog unit tests
pnpm changelog:check  # MD ↔ JSON projection drift check
```

## Git conventions tooling

| Tool | Role |
| --- | --- |
| husky | Hooks: commit-msg, pre-commit, post-checkout |
| commitlint | Conventional commits + `MKT-<n>` ticket rule (`.commitlintrc.cjs`) |
| `scripts/release-changed.mjs` | Path-aware SemVer bumps per `@singleton-sd/*` package |
| `scripts/client-changelog.mjs` | Client-facing `/changelog` Markdown + JSON projections |
| release-it | Available for manual/single-package use (`.release-it.json`; git/GitHub off) |
| Root `CHANGELOG.md` | Date sections with package bump index |
| `apps/marketing/CHANGELOG.md` | Canonical product release notes → `/changelog` |

Branch names: `feature/MKT-<n>-slug`, `hotfix/MKT-<n>-slug`, `release/vX.Y.Z`, or `main`.

Package tags: `@singleton-sd/marketing@x.y.z`, `@singleton-sd/marketing-oauth@x.y.z`.
