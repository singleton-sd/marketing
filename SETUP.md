# SETUP — Company marketing

## Prerequisites

- Node 20+ / pnpm 9.15
- Decap `/admin` login uses shared `cms-oauth-kit` (see `docs/marketing-astro-decap.md`)

## Local

`@singleton-sd/tokens` comes from GitLab’s npm registry (see `.npmrc`).

```sh
pnpm install
pnpm dev
# http://localhost:4321
# Admin: http://localhost:4321/admin (shared OAuth at https://auth.singletonsd.com; ORIGINS includes localhost:4321)
```

## Hosting

Production is **GitHub Pages** (`www.singletonsd.com`). Agents must not change
GitHub repo settings, Route 53, or Azure resources. Exact Pages settings, DNS
records, and Azure SWA deletion order: [`docs/deployment.md`](docs/deployment.md).

| Resource | Name |
| --- | --- |
| Pages | `gh-pages` branch, custom domain `www.singletonsd.com` |
| Decap OAuth | `https://auth.singletonsd.com` (`singleton-sd/cms-oauth-kit`) |
| Global Key Vault | `ssd-global-kv-prod-ae` in `rg-ssd-global` (OAuth / other apps — not Pages) |
| Previous SWA | `ssd-mkt-prod-ae` in `rg-ssd-marketing` — delete last after DNS cutover |

`github-decap-oauth-client-secret` stays in the global vault for `cms-oauth-kit`.
Do not manage OAuth client id/secret or `ORIGINS` from this repo.

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
| MKT-16 | GitHub Pages hosting |

## Domain & assets

| Host | Role |
| --- | --- |
| `www.singletonsd.com` | Canonical site (GitHub Pages) |
| `singletonsd.com` (apex) | A/AAAA to GitHub Pages IPs; GitHub redirects to www |
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

```sh
pnpm release
pnpm changelog:test
pnpm changelog:check
```

CI / real release (bots only — pushes to `main`):

```sh
pnpm release:ci
```
