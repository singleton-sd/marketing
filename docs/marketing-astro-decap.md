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
   - Application name: `Singleton SD Marketing Decap`
   - Homepage: `https://singletonsd.com`
   - Callback: `https://ssd-mkt-decap-oauth-prod-ae.azurewebsites.net/callback`
2. Store id + secret + form metadata in global KV (and GitHub Variable):

```powershell
powershell -File ./scripts/bootstrap-decap-oauth.ps1 -ClientId '<id>' -ClientSecret '<secret>'
```

| KV secret | Purpose |
| --- | --- |
| `github-decap-oauth-client-id` | Client id (also `DECAP_OAUTH_CLIENT_ID` Variable) |
| `github-decap-oauth-client-secret` | Client secret (Function App Key Vault ref) |
| `github-decap-oauth-app-config` | JSON with name / homepage / callback for reuse |

All tagged `project=marketing`, `repo=singleton-sd/marketing`, `component=decap-oauth`.

3. Deploy Function: `powershell -File ./scripts/deploy-decap-oauth.ps1 -OauthClientId '<id>'`

Re-read the form values later:

```powershell
az keyvault secret show --vault-name ssd-global-kv-prod-ae --name github-decap-oauth-app-config --query value -o tsv
```

`ORIGINS` must include `singletonsd.com`, `www.singletonsd.com`, the SWA default/preview prefix pattern, and `localhost:4321`.
