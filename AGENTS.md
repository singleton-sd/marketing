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

## Commands

```bash
pnpm install
pnpm dev
pnpm --filter @singleton-sd/marketing build
pnpm --filter @singleton-sd/marketing-oauth test
pnpm release          # dry-run changelog / version bump
pnpm release:ci       # real release (tag + GitHub Release + CHANGELOG)
```

## Git conventions tooling

| Tool | Role |
| --- | --- |
| husky | Hooks: commit-msg, pre-commit, post-checkout |
| commitlint | Conventional commits + `MKT-<n>` ticket rule (`.commitlintrc.cjs`) |
| release-it | SemVer bump, `CHANGELOG.md`, GitHub Release (`.release-it.json`) |
| `@release-it/conventional-changelog` | Changelog from conventional commits |

Branch names: `feature/MKT-<n>-slug`, `hotfix/MKT-<n>-slug`, `release/vX.Y.Z`, or `main`.
