# SETUP — Company marketing

## Prerequisites

- Node 20+ / pnpm 9.15
- Azure CLI logged into subscription `01c0bb8b-3770-4765-979a-cb13ae7e3dd2`
- AWS CLI (Route53 for `singletonsd.com`)
- GitHub OAuth App for Decap (see `docs/marketing-astro-decap.md`)

## Local

```powershell
pnpm install
pnpm dev
# http://localhost:4321
# Admin: http://localhost:4321/admin (needs OAuth Function + ORIGINS including localhost:4321)
```

## Azure resources

| Resource | Name |
| --- | --- |
| Global RG | `rg-ssd-global` |
| Global Key Vault | `ssd-global-kv-prod-ae` |
| Marketing RG | `rg-ssd-marketing` |
| SWA | `ssd-mkt-prod-ae` |
| Decap OAuth Function | `ssd-mkt-decap-oauth-prod-ae` |

### Secrets in global KV (tagged `repo=singleton-sd/marketing`)

- `swa-marketing-deployment-token`
- `github-decap-oauth-client-secret`

### GitHub Variables (IDs only)

- `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`
- `DECAP_OAUTH_CLIENT_ID`

Entra app `ssd-mkt-gha-oidc-prod` federated subjects must include both classic and ID-form claims (GitHub may emit either):

- `repo:singleton-sd/marketing:ref:refs/heads/main`
- `repo:singleton-sd/marketing:pull_request`
- `repo:singleton-sd@275041854/marketing@1328843767:ref:refs/heads/main`
- `repo:singleton-sd@275041854/marketing@1328843767:pull_request`

## Deploy

```powershell
az account set --subscription 01c0bb8b-3770-4765-979a-cb13ae7e3dd2
az deployment group create -g rg-ssd-global -f infra/global.bicep
az deployment group create -g rg-ssd-marketing -f infra/marketing.bicep
# After OAuth App + KV secret:
pwsh ./scripts/deploy-decap-oauth.ps1 -OauthClientId '<id>'
pwsh ./scripts/deploy-swa-from-kv.ps1 -ConfigPath ./infra/custom-domains.marketing.json -DeployName marketing
```

## DNS

```powershell
aws login   # if session expired
pwsh ./scripts/apply-route53-dns.ps1 -ConfigPath ./infra/custom-domains.marketing.json
pwsh ./scripts/bind-custom-domains.ps1 -ConfigPath ./infra/custom-domains.marketing.json
```

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

## Releases

Path-aware bumps (same model as poc-plattform-kit): each `@singleton-sd/*`
package versions independently from conventional commits on its watch paths.
On `main`, `.github/workflows/release.yml` runs `pnpm release:ci`, writes
`CHANGELOG.md`, tags `@scope/name@version`, then dispatches deploys.

Dry-run (local):

```powershell
pnpm release
```

CI / real release (bots only — pushes to `main`):

```powershell
pnpm release:ci
```
