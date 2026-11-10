# SETUP — Company marketing

## Prerequisites

- Node 20+ / pnpm 9.15
- Azure CLI only for the SWA teardown in `docs/github-pages-cutover.md`
- AWS CLI (Route53 for `singletonsd.com`) — DNS is owned outside this repo
- Decap `/admin` login uses shared `cms-oauth-kit` (see `docs/marketing-astro-decap.md`)

## Local

`@singleton-sd/tokens` comes from GitLab’s npm registry (see `.npmrc`).

```powershell
pnpm install
pnpm dev
# http://localhost:4321
# Admin: http://localhost:4321/admin (shared OAuth at https://auth.singletonsd.com; ORIGINS includes localhost:4321)
```

## Hosting (GitHub Pages)

Production is GitHub Pages (`www.singletonsd.com`). Workflows: `.github/workflows/pages.yml` (production), `preview.yml` (PR path previews), `publish-pages.yml` (`actions/deploy-pages`).

Cutover (enable Pages, Route 53, then delete SWA): [docs/github-pages-cutover.md](docs/github-pages-cutover.md).

## Azure resources (legacy SWA — delete after cutover)

| Resource | Name |
| --- | --- |
| Global RG | `rg-ssd-global` |
| Global Key Vault | `ssd-global-kv-prod-ae` |
| Marketing RG | `rg-ssd-marketing` |
| SWA (remove after Pages is verified) | `ssd-mkt-prod-ae` |
| Decap OAuth | `https://auth.singletonsd.com` (`singleton-sd/cms-oauth-kit` in `rg-ssd-global`) |

### Secrets in global KV (tagged `repo=singleton-sd/marketing`)

- `swa-marketing-deployment-token` — delete after SWA is gone (see cutover runbook)

`github-decap-oauth-client-secret` stays in the same vault for `cms-oauth-kit`. Do not manage OAuth client id/secret or `ORIGINS` from this repo.

Pages deploys do not use `AZURE_CLIENT_ID` / OIDC. Those GitHub Variables and Entra app `ssd-mkt-gha-oidc-prod` are unused after SWA deletion.

## Deploy

Push to `main` (or `workflow_dispatch` `.github/workflows/pages.yml`). Do not deploy SWA from this repo.

## DNS

Route 53 is owned outside this repo. Target GitHub Pages records are in [docs/github-pages-cutover.md](docs/github-pages-cutover.md). `infra/custom-domains.marketing.json` still describes the live SWA records until that cutover.

## Ticket map (initial)

| Commit prefix | ClickUp |
| --- | --- |
| MKT-1 | Bootstrap `86d3zhkzc` |
| MKT-2 | Extract Astro `86d3zhkze` |
| MKT-3 | Extract OAuth `86d3zhkzf` |
| MKT-4 | Content `86d3zhkzk` |
| MKT-5 | Azure infra `86d3zhkzj` |
| MKT-6 | CI/CD `86d3zhkzq` |
| MKT-7 | Decap OAuth App `86d3zhkzr` |
| MKT-8 | DNS `86d3zhkzt` |
| MKT-9 | Deploy/SEO `86d3zhkzv` |
| MKT-10 | Docs `86d3zhkzw` |
| MKT-11 | Git conventions / release-it |
| MKT-12 | Path-aware release (poc parity) `86d3zmcm6` |
| MKT-13 | Client `/changelog` What’s new `86d3zmvye` |

## Domain & assets

| Host | Role |
| --- | --- |
| `www.singletonsd.com` | Canonical site (GitHub Pages; SWA until DNS cutover) |
| `singletonsd.com` (apex) | Redirect → `https://www.singletonsd.com/` (GitHub Pages after cutover) |
| `assets.singletonsd.com` | Brand CDN — favicons/OG linked from app; do not vendor binaries into this repo |

Canonical origin in Astro/`config.yml`: `https://www.singletonsd.com`.

## Releases

Path-aware bumps (same model as poc-plattform-kit): each `@singleton-sd/*`
package versions independently from conventional commits on its watch paths.
On `main`, `.github/workflows/release.yml` runs `pnpm release:ci`, writes the
root bump index + marketing product changelog / JSON, tags
`@scope/name@version`, then dispatches `pages.yml`.

Public **What’s new** page: `/changelog` (see `docs/client-changelog.md`).

Dry-run (local):

```powershell
pnpm release
pnpm changelog:test
pnpm changelog:check
```

CI / real release (bots only — pushes to `main`):

```powershell
pnpm release:ci
```
