# Custom domains — company marketing

DNS stays in **AWS Route53** (`singletonsd.com`). Azure receives CNAMEs / validation TXT and custom-domain bindings.

Config: [`infra/custom-domains.marketing.json`](../infra/custom-domains.marketing.json)

```powershell
# Fill REPLACE_* placeholders after SWA is created (default hostname + validationId)
pwsh ./scripts/apply-route53-dns.ps1 -ConfigPath ./infra/custom-domains.marketing.json
pwsh ./scripts/bind-custom-domains.ps1 -ConfigPath ./infra/custom-domains.marketing.json
```

Apex (`singletonsd.com`) may require an A/ALIAS record after SWA domain validation — update the JSON from Azure portal / CLI outputs if CNAME-at-apex is rejected.
