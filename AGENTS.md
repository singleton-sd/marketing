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
```
