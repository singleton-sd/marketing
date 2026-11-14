# SETUP — Company marketing

## Prerequisites

- Node 20+ / pnpm 9.15
- Decap `/admin` login uses the API gateway (see `docs/marketing-astro-decap.md`)

## Local

`@singleton-sd/tokens` comes from GitLab’s npm registry (see `.npmrc`).

```sh
pnpm install
pnpm dev
# http://localhost:4321
# Admin: http://localhost:4321/admin (OAuth via https://api.singletonsd.com/v1/cms-auth/auth)
```

## Hosting

Production is **GitHub Pages** (`www.singletonsd.com`). Agents must not change
GitHub repo settings, Route 53, or Azure resources. Exact Pages settings, DNS
records, and Azure SWA deletion order: [`docs/deployment.md`](docs/deployment.md).

| Resource | Name |
| --- | --- |
| Pages | `gh-pages` branch, custom domain `www.singletonsd.com` |
| Decap OAuth | `https://api.singletonsd.com` (`v1/cms-auth`) |
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

Path-aware bumps: each `@singleton-sd/*` package versions independently from
conventional commits on its watch paths. The **singleton-release** GitHub App
(on the main ruleset bypass list) commits the bump to `main`. Configure
`vars.RELEASE_APP_ID` and `secrets.RELEASE_APP_PRIVATE_KEY`; the workflow
fails if either is missing and never falls back to `GITHUB_TOKEN` for the
push.

On `main`, `.github/workflows/release.yml` runs `pnpm release:ci`, writes the
root bump index + marketing product changelog / JSON, commits
`chore(release): vX.Y.Z [skip ci]`, tags `@scope/name@version`, creates the
GitHub Release, then dispatches `pages.yml` (the `[skip ci]` commit does not
trigger Pages on push).

Public **What’s new** page: `/changelog` (see `docs/client-changelog.md`).

Dry-run (local):

```sh
pnpm release
pnpm changelog:test
pnpm changelog:check
```

CI / real release (singleton-release app only — pushes to `main`):

```sh
pnpm release:ci
```
