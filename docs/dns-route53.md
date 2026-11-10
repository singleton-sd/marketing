# Custom domains — company marketing

DNS stays in **AWS Route53** (`singletonsd.com`). GitHub Pages is the hosting target after cutover.

Live SWA records (until DNS is flipped) are still listed in
[`infra/custom-domains.marketing.json`](../infra/custom-domains.marketing.json).
**Do not apply that file** to point `www` at GitHub Pages — follow
[github-pages-cutover.md](github-pages-cutover.md) for the Route 53 records
(`www` CNAME → `singleton-sd.github.io`, apex A/AAAA → GitHub Pages IPs).

```powershell
# Historical SWA bind/apply only — not for the Pages cutover
pwsh ./scripts/apply-route53-dns.ps1 -ConfigPath ./infra/custom-domains.marketing.json
pwsh ./scripts/bind-custom-domains.ps1 -ConfigPath ./infra/custom-domains.marketing.json
```
