# Handoff — remaining interactive steps

Live preview (no custom domain yet):
https://yellow-bush-0894e2800.7.azurestaticapps.net/

Parent ClickUp: https://app.clickup.com/t/86d3zhkz4

## Done

- Repo `singleton-sd/marketing` with Astro + Decap + OAuth Function code
- Content retargeted to Singleton Software Development + Discovery Call CTA
- `rg-ssd-global` / `ssd-global-kv-prod-ae` (shared KV)
- `rg-ssd-marketing` / SWA `ssd-mkt-prod-ae` + plan `ssd-mkt-plan-prod-ae`
- GHA OIDC app `ssd-mkt-gha-oidc-prod` + Variables + ID-form federated credentials
- Production SWA deploy via Actions succeeding
- Workflows: `deploy-marketing.yml`, `preview-marketing.yml`, `deploy-decap-oauth.yml`

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

Create OAuth App (UI only): https://github.com/settings/developers

- Homepage URL: `https://singletonsd.com`
- Authorization callback URL: `https://ssd-mkt-decap-oauth-prod-ae.azurewebsites.net/callback`

```powershell
powershell -File ./scripts/bootstrap-decap-oauth.ps1 -ClientId '<id>' -ClientSecret '<secret>'
# Saves to global KV: client-id, client-secret, and app-config JSON (name/homepage/callback)
powershell -File ./scripts/deploy-decap-oauth.ps1 -OauthClientId '<id>'
```

ClickUp: https://app.clickup.com/t/86d3zhkzr
