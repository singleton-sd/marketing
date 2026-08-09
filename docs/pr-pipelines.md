# PR pipelines — marketing

| Workflow | Trigger | Purpose |
| --- | --- | --- |
| `deploy-marketing.yml` | push `main` | Production SWA upload |
| `preview-marketing.yml` | pull_request | SWA Free preview env + PR comment |
| `deploy-decap-oauth.yml` | push `main` (oauth paths) | Function infra + zip |

OIDC Variables required: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`. Deploy token from `ssd-global-kv-prod-ae` / `swa-marketing-deployment-token`.
