# Handoff — remaining interactive steps

Parent ClickUp: https://app.clickup.com/t/86d3zhkz4

## Done in repo

- Astro + Decap marketing site
- GitHub Pages workflows (`pages.yml`, `preview.yml`)
- PR previews at `/pr-preview/pr-<number>/`
- SWA deploy/preview workflows and SWA-only config removed

## Blocked on infrastructure owner (do not run from an agent)

Follow [`docs/deployment.md`](docs/deployment.md) in this order:

1. GitHub repo **Pages** + **Actions** workflow permissions
2. Route 53: apex A/AAAA to GitHub Pages IPs, `www` CNAME to `singleton-sd.github.io`
3. Enable **Enforce HTTPS** after the GitHub certificate exists
4. Delete Azure SWA `ssd-mkt-prod-ae` **last**

### Decap `/admin` (already live)

Shared org app (do not create a second callback on this repo):

- App: [Singleton SD CMS OAuth](https://github.com/settings/applications/3783537)
- Homepage URL: `https://singletonsd.com`
- Authorization callback URL: `https://auth.singletonsd.com/callback`

OAuth Function code, Bicep, and deploy live in [`singleton-sd/cms-oauth-kit`](https://github.com/singleton-sd/cms-oauth-kit). This site’s `config.yml` `base_url` is `https://auth.singletonsd.com`.
