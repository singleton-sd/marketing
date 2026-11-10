# Custom domains — company marketing

DNS stays in **AWS Route 53** (`singletonsd.com`). GitHub Pages is the host.

The infrastructure owner applies records; **do not change DNS from an agent.**

Canonical cutover steps (Pages settings, apex A/AAAA, `www` CNAME, then Azure
SWA deletion last): [`deployment.md`](./deployment.md).
