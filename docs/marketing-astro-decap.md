# Marketing site — Astro + Decap

`[repo=singleton-sd/marketing]`

Locked stack for `singletonsd.com` (Azure SWA Free `ssd-mkt-prod-ae`).

## Stack

| Layer | Choice |
| --- | --- |
| SSG | **Astro** (`apps/marketing`) |
| Styling | Tailwind 3 + Singleton SD design tokens |
| Content | Markdown under `apps/marketing/src/content/pages/` |
| CMS | Decap at `/admin` |
| OAuth | Function `ssd-mkt-decap-oauth-prod-ae` |
| Secrets | Global KV `ssd-global-kv-prod-ae` |

## Decap bootstrap

1. GitHub → OAuth Apps → New:
   - Homepage: `https://singletonsd.com`
   - Callback: `https://ssd-mkt-decap-oauth-prod-ae.azurewebsites.net/callback`
2. Store client secret in KV as `github-decap-oauth-client-secret` (tags: `project=marketing`, `repo=singleton-sd/marketing`)
3. Set GitHub Variable `DECAP_OAUTH_CLIENT_ID`
4. Deploy Function: `pwsh ./scripts/deploy-decap-oauth.ps1 -OauthClientId '<id>'`

`ORIGINS` must include `singletonsd.com`, `www.singletonsd.com`, the SWA default/preview prefix pattern, and `localhost:4321`.
