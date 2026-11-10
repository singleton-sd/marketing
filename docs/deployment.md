# GitHub Pages deployment

The production site is built from `main` by `.github/workflows/pages.yml` and
published from the root of the `gh-pages` branch to
[https://www.singletonsd.com](https://www.singletonsd.com).

In-repository pull requests run the build gate and publish beneath
`https://www.singletonsd.com/pr-preview/pr-<number>/`. The preview workflow:

1. Builds Astro with `PREVIEW_BASE_PATH=/pr-preview/pr-<number>/` so CSS, JS,
   in-page links, and Markdown `href`/`src` resolve under that prefix. The
   build job uses `contents: read` and `persist-credentials: false`; only the
   publish job has write access to `gh-pages`.
2. Posts a **sticky PR comment** with the live preview link (retried once)
3. Removes the preview folder (`action: remove`) after confirming the PR is
   still closed, then hides the comment

`pages.yml` (production) and the preview publish/cleanup jobs share the
`pages-publish` concurrency group with cancellation disabled so `gh-pages`
writes serialize. Production deploys only from `refs/heads/main`
(`workflow_dispatch` from another ref is ignored).

Path-based GitHub Pages previews share the `www.singletonsd.com` origin with
production `/admin`. A separate preview host would need DNS and Pages settings
changes (out of scope here). Do not keep a Decap session open while reviewing
a preview.

Pull requests from forks are not given write access to publish.

This follows the house pattern in
[`poc-inkads-marketing`](https://github.com/singleton-sd/poc-inkads-marketing)
(`pages.yml` + `rossjrw/pr-preview-action`, custom-domain `CNAME`, preview
umbrella `pr-preview`). Visual-review / PostKit OIDC jobs from that repo are
not copied here: this site has no visual suite, and the contact form on
[`#9`](https://github.com/singleton-sd/marketing/pull/9) is a separate branch.

## One-time GitHub Pages configuration

Do this in the GitHub UI. **Do not change repo settings from an agent.**

1. **Settings → Actions → General → Workflow permissions**: select **Read and
   write permissions** (and allow GitHub Actions to create/approve pull
   requests if that toggle is shown). The workflows also declare their
   narrower `permissions:` blocks.
2. **Settings → Pages**:
   - Source: **Deploy from a branch**
   - Branch: `gh-pages` / `/ (root)`
   - Custom domain: `www.singletonsd.com`
3. After the first successful `pages.yml` run, confirm a `CNAME` file at the
   root of `gh-pages` containing `www.singletonsd.com`. Production builds copy
   `apps/marketing/public/CNAME` into `dist`.
4. GitHub provisions the TLS certificate after DNS resolves (step below).
   Enable **Enforce HTTPS** only after the certificate is available.

Until the custom domain is set, preview URLs on `www.singletonsd.com` will not
resolve. Production `base` is `/` (not `/marketing/`) — do not treat this as a
project-pages site at `singleton-sd.github.io/marketing/`.

## AWS Route 53 records

DNS stays in the public `singletonsd.com` hosted zone (Route 53). **Do not
change DNS from an agent.** The infrastructure owner applies:

| Name | Type | Value | TTL |
| --- | --- | --- | --- |
| `www.singletonsd.com` | `CNAME` | `singleton-sd.github.io` | `300` |
| `singletonsd.com` (apex) | `A` | `185.199.108.153` | `300` |
| `singletonsd.com` (apex) | `A` | `185.199.109.153` | `300` |
| `singletonsd.com` (apex) | `A` | `185.199.110.153` | `300` |
| `singletonsd.com` (apex) | `A` | `185.199.111.153` | `300` |
| `singletonsd.com` (apex) | `AAAA` | `2606:50c0:8000::153` | `300` |
| `singletonsd.com` (apex) | `AAAA` | `2606:50c0:8001::153` | `300` |
| `singletonsd.com` (apex) | `AAAA` | `2606:50c0:8002::153` | `300` |
| `singletonsd.com` (apex) | `AAAA` | `2606:50c0:8003::153` | `300` |

GitHub Pages IPs are documented at
[Managing a custom domain for your GitHub Pages site](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site#configuring-an-apex-domain).
Re-check that page if GitHub publishes new addresses.

Replace the current `www` target (Azure SWA / leftover CloudFront) and any
apex CloudFront / ALIAS records as part of this cutover. Do not point `www`
at the apex name.

With `CNAME` `www.singletonsd.com`, GitHub serves the site at **www** and
redirects the apex to www once both record sets exist.

## Cutover order

1. Merge this change to `main` so `pages.yml` / `preview.yml` exist. Azure SWA
   workflows are removed here; the last SWA upload keeps serving until DNS
   moves.
2. Set the GitHub Pages repo options above (branch `gh-pages`, custom domain
   `www.singletonsd.com`, Actions read/write).
3. Confirm a green **Deploy production GitHub Pages** run on `main`.
4. Apply the Route 53 records (infrastructure owner).
5. Wait for GitHub’s custom-domain TLS certificate, then enable **Enforce
   HTTPS**.
6. Verify:

   ```sh
   dig +short www.singletonsd.com CNAME
   dig +short singletonsd.com A
   curl --fail --head https://www.singletonsd.com/
   curl --fail --head https://singletonsd.com/
   ```

   Expected: `www` CNAME is `singleton-sd.github.io.`; apex A/AAAA match the
   GitHub Pages IPs; HTTPS 200 on www; apex redirects to www.
7. **Last:** delete Azure SWA `ssd-mkt-prod-ae` in `rg-ssd-marketing` (and the
   Key Vault secret `swa-marketing-deployment-token` if unused). Do **not**
   delete `rg-ssd-global`, `ssd-global-kv-prod-ae`, or
   `cms-oauth-kit` / `auth.singletonsd.com`. **Do not delete Azure resources
   from an agent.**

## SWA behaviours vs GitHub Pages

| SWA (`staticwebapp.config.json`) | Pages equivalent |
| --- | --- |
| `/admin` → `/admin/` 301 | Directory index plus a trailing-slash bounce in `admin/index.html` |
| `404` rewrite → `/404.html` | Astro `src/pages/404.astro` → `404.html` at the site root (GitHub Pages default) |
| `trailingSlash: always` | Unchanged; GitHub Pages serves `about/index.html` at `/about/` |
| Custom response headers | **Not available.** GitHub Pages cannot set CSP/HSTS via a repo config file. The previous SWA config did not set any. |
| Unique SWA preview hostnames | Replaced by `/pr-preview/pr-<number>/` on the same custom domain |
| Preview `404.html` | **Not replicated.** GitHub Pages only honours the site-root `404.html`, so unknown preview URLs show the production 404. |

`apps/marketing/public/.nojekyll` is required so GitHub’s Jekyll step does not
ignore Astro’s `_astro/` asset folder.

## Contact form

Keep posting to PostKit. This repo does not wire CRM / lead intake. Open PR
[#9](https://github.com/singleton-sd/marketing/pull/9) adds the form on another
branch; after it merges, follow the InkAds pattern to bake
`PUBLIC_POSTKIT_API_BASE_URL` in `pages.yml` / `preview.yml` if that PR does
not already do so.

## Local checks

```sh
pnpm install
pnpm --filter @singleton-sd/marketing run test
pnpm --filter @singleton-sd/marketing run build
node scripts/check-pages-asset-paths.mjs apps/marketing/dist /
PREVIEW_BASE_PATH=/pr-preview/pr-0/ pnpm --filter @singleton-sd/marketing run build
node scripts/check-pages-asset-paths.mjs apps/marketing/dist /pr-preview/pr-0/
```
