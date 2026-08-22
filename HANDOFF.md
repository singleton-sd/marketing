# Handoff — remaining interactive steps

Live preview (no custom domain yet):
https://yellow-bush-0894e2800.7.azurestaticapps.net/

Parent ClickUp: https://app.clickup.com/t/86d3zhkz4

## Done

- Repo `singleton-sd/marketing` with Astro + Decap
- Content retargeted to Singleton Software Development + Discovery Call CTA
- `rg-ssd-global` / `ssd-global-kv-prod-ae` (shared KV)
- `rg-ssd-marketing` / SWA `ssd-mkt-prod-ae`
- GHA OIDC app `ssd-mkt-gha-oidc-prod` + Variables + ID-form federated credentials
- Production SWA deploy via Actions succeeding
- Workflows: `deploy-marketing.yml`, `preview-marketing.yml`
- Decap `/admin` OAuth: shared `cms-oauth-kit` at `https://auth.singletonsd.com`

## Blocked on you (interactive)

### 1. AWS Route53 (`aws login`)

Current `singletonsd.com` / `www` point at CloudFront (`13.224.x`). Cutover will replace that site.

```powershell
aws login
cd C:\00Personal\singleton-sd\marketing
powershell -File ./scripts/apply-route53-dns.ps1 -ConfigPath ./infra/custom-domains.marketing.json
# For apex, Azure may require A/ALIAS after validation — adjust JSON if needed
powershell -File ./scripts/bind-custom-domains.ps1 -ConfigPath ./infra/custom-domains.marketing.json
```

ClickUp: https://app.clickup.com/t/86d3zhkzt

### 2. GitHub OAuth App (Decap `/admin`)

Shared org app (do not create a second callback on this repo):

- App: [Singleton SD CMS OAuth](https://github.com/settings/applications/3783537)
- Homepage URL: `https://singletonsd.com`
- Authorization callback URL: `https://auth.singletonsd.com/callback`

OAuth Function code, Bicep, and deploy live in [`singleton-sd/cms-oauth-kit`](https://github.com/singleton-sd/cms-oauth-kit). This site’s `config.yml` `base_url` is `https://auth.singletonsd.com`.

ClickUp: https://app.clickup.com/t/86d3zhkzr
