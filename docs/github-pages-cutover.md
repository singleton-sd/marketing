# GitHub Pages cutover — company marketing

Move `apps/marketing` off Azure Static Web Apps (`ssd-mkt-prod-ae`) onto GitHub
Pages. **This repository does not change DNS, repo Pages settings, or Azure
resources.** Humans/infra follow the steps below after the workflows in this
PR are on `main`.

Production canonical host stays **`https://www.singletonsd.com`**. Apex
`singletonsd.com` should keep redirecting to `www`.

Pattern: [`singleton-sd/poc-inkads-marketing`](https://github.com/singleton-sd/poc-inkads-marketing)
(Astro `PREVIEW_BASE_PATH`, `public/CNAME`, `gh-pages` + PR previews under
`/pr-preview/pr-<n>/`). Production publish uses the official
`actions/configure-pages` → `actions/upload-pages-artifact` →
`actions/deploy-pages` flow (`.github/workflows/publish-pages.yml`).

## What the repo now does

| Workflow | Trigger | Purpose |
| --- | --- | --- |
| `pages.yml` | push `main` | Production build, sync `apps/marketing/dist` to `gh-pages` (keeps `pr-preview/`), then official Pages deploy |
| `preview.yml` | pull_request | Build with `PREVIEW_BASE_PATH=/pr-preview/pr-<n>/`, publish that folder on `gh-pages`, sticky PR comment, republish Pages |
| `publish-pages.yml` | `workflow_call` / `workflow_dispatch` | Checkout `gh-pages` and deploy it with `actions/deploy-pages` |

`public/CNAME` is `www.singletonsd.com` (copied into `dist/` and the published
tree). `public/.nojekyll` keeps Astro’s `_astro/` assets if Pages is ever
served from the `gh-pages` branch (Jekyll would ignore `_` folders).

## SWA behaviour → Pages

| SWA (`staticwebapp.config.json`) | Pages equivalent |
| --- | --- |
| `trailingSlash: 'always'` (Astro) + directory `index.html` | **Kept** in `astro.config.mjs`. GitHub Pages serves `/about/` from `about/index.html`. |
| `routes`: 301 `/admin` → `/admin/` | **Ported in part.** `admin/index.html` uses relative `config.yml` / CSS / JS so they resolve on `/admin/`. A small inline script appends a trailing slash when the path has none (client-side; not an HTTP 301). Pages also usually redirects directory URLs. |
| `responseOverrides.404` → `/404.html` | **Ported.** Astro already emits `dist/404.html`. GitHub Pages serves that file for unknown paths **at the site root**. Nested preview 404s (`/pr-preview/pr-<n>/missing`) use the **root** `404.html`, not the preview-base 404 page. |
| Custom response headers | **None were configured.** GitHub Pages cannot set arbitrary headers (CSP, HSTS beyond HTTPS). **Dropped / not available.** |
| SWA Free PR hostname `https://{prefix}-{pr}.eastasia.7.azurestaticapps.net` | **Replaced** by same-domain path previews: `https://www.singletonsd.com/pr-preview/pr-<n>/`. |

## One-time GitHub repository settings

Do **not** point Pages at the `gh-pages` branch as the serving source. Official
`actions/deploy-pages` requires **GitHub Actions** as the Pages source. The
`gh-pages` branch is only the content store (production at `/`, previews under
`pr-preview/`).

1. **Settings → Pages**
   - Source: **GitHub Actions**
   - Custom domain: `www.singletonsd.com` (must match `public/CNAME`)
   - After DNS resolves and GitHub issues a certificate, enable **Enforce HTTPS**
2. If GitHub shows a domain verification TXT (`_github-pages-challenge-…`),
   add it in Route 53, wait for verification, then continue.
3. **Settings → Actions → General → Workflow permissions**: **Read and write**.
   Workflows also declare narrower `permissions:` blocks.
4. Do **not** add required reviewers on the `github-pages` environment until
   you want gated production publishes (that environment is used by
   `publish-pages.yml`, including republishes after PR previews).
5. Optional: under **Settings → Pages**, confirm the site URL is
   `https://www.singletonsd.com`.

First successful `pages.yml` run on `main` creates `gh-pages` and the
`github-pages` environment.

## DNS (Route 53) — another owner

Zone: `singletonsd.com`. **Do not run** `scripts/apply-route53-dns.ps1` against
the current `infra/custom-domains.marketing.json`; that file still describes
the **live SWA** records until you replace them.

Target records (TTL 300 is fine):

| Name | Type | Value |
| --- | --- | --- |
| `www` | `CNAME` | `singleton-sd.github.io` |
| `@` (apex `singletonsd.com`) | `A` | `185.199.108.153` |
| `@` | `A` | `185.199.109.153` |
| `@` | `A` | `185.199.110.153` |
| `@` | `A` | `185.199.111.153` |
| `@` | `AAAA` | `2606:50c0:8000::153` |
| `@` | `AAAA` | `2606:50c0:8001::153` |
| `@` | `AAAA` | `2606:50c0:8002::153` |
| `@` | `AAAA` | `2606:50c0:8003::153` |

Those A/AAAA addresses are GitHub Pages’ published apex IPs. Confirm against
[GitHub’s custom domain docs](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)
before applying if GitHub’s list has changed.

Remove the existing `www` CNAME to `*.azurestaticapps.net` (and any CloudFront
apex records that still front the old marketing site) in the **same change
window** so clients do not split between SWA and Pages.

GitHub will HTTP-redirect apex → `www` once both DNS sets point at Pages and
the custom domain is `www.singletonsd.com`.

## Cutover sequence

1. Merge this PR to `main` (does not flip DNS).
2. Enable Pages + custom domain in repo settings (above). Workflow permissions
   must allow `contents: write` / `pages: write`.
3. Confirm `pages.yml` on `main` is green. Check the Actions deployment:
   `https://singleton-sd.github.io/marketing/` should serve the Astro site
   (may 301 to `www` after the custom domain is attached).
4. Apply Route 53 records (www CNAME + apex A/AAAA). Keep TTL low (300s)
   before the change if you can.
5. Wait for DNS and GitHub’s TLS certificate. Then **Enforce HTTPS**.
6. Verify (see below). Decap `/admin/` login still uses
   `https://auth.singletonsd.com` (`cms-oauth-kit`). Shared `ORIGINS` already
   includes `*.singletonsd.com` and apex — no OAuth change in this repo.
7. Only after www has been on Pages long enough to roll back if needed,
   **delete the Azure Static Web App and its deploy secret**. Do not delete
   shared KV, `cms-oauth-kit`, or `rg-ssd-global`.

### Delete SWA (after Pages is proven)

```bash
az account set --subscription 01c0bb8b-3770-4765-979a-cb13ae7e3dd2
az staticwebapp delete -g rg-ssd-marketing -n ssd-mkt-prod-ae --yes
az keyvault secret delete --vault-name ssd-global-kv-prod-ae --name swa-marketing-deployment-token
# Optional purge after the vault’s recovery window if policy allows:
# az keyvault secret purge --vault-name ssd-global-kv-prod-ae --name swa-marketing-deployment-token
```

There is **no** `AZURE_STATIC_WEB_APPS_API_TOKEN` GitHub secret in this repo
(deploy used OIDC → Key Vault `swa-marketing-deployment-token`). After SWA is
gone, GitHub Variables `AZURE_CLIENT_ID` / `AZURE_TENANT_ID` /
`AZURE_SUBSCRIPTION_ID` and Entra app `ssd-mkt-gha-oidc-prod` are unused by
these workflows and can be removed if nothing else in the org still needs
them.

`infra/marketing.bicep` and `infra/custom-domains.marketing.json` remain as a
record of the old SWA until you delete or rewrite them in a follow-up. Do not
run `scripts/bind-custom-domains.ps1` against the SWA after it is deleted.

## Verification

```bash
dig +short www.singletonsd.com CNAME
# expect: singleton-sd.github.io.

dig +short singletonsd.com A
# expect GitHub Pages A records (185.199.108–111.153)

curl -sI https://www.singletonsd.com/
# 200, certificate for www.singletonsd.com

curl -sI https://singletonsd.com/
# 301/302 to https://www.singletonsd.com/

curl -sI https://www.singletonsd.com/admin
# directory redirect or 200 at /admin/

curl -sI https://www.singletonsd.com/this-path-does-not-exist
# 404 body from the marketing 404 page

curl -s https://www.singletonsd.com/ | grep -o '_astro/'
# hashed assets under /_astro/ (not stripped by Jekyll)
```

Open a docs-or-app PR and confirm the sticky comment link
`https://www.singletonsd.com/pr-preview/pr-<n>/` loads CSS/JS (view-source:
asset URLs include `/pr-preview/pr-<n>/_astro/`). Until DNS is flipped, use
`https://singleton-sd.github.io/marketing/pr-preview/pr-<n>/`.

## Rollback

1. Point Route 53 `www` (and apex) back at the SWA default hostname
   (`yellow-bush-0894e2800.7.azurestaticapps.net` in
   `infra/custom-domains.marketing.json`) **only if the SWA resource still
   exists**.
2. If SWA is already deleted, restore from backup/Bicep (`infra/marketing.bicep`)
   before flipping DNS, or revert the GitHub Pages custom domain and keep
   serving `https://singleton-sd.github.io/marketing/`.
3. Reverting the commit on `main` republishes the previous static tree via
   `pages.yml`.

## Local preview subpath

```bash
PREVIEW_BASE_PATH=/pr-preview/pr-0/ pnpm --filter @singleton-sd/marketing build
pnpm --filter @singleton-sd/marketing run test:pages
pnpm --filter @singleton-sd/marketing preview
```
