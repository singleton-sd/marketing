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
| OAuth | Shared `cms-oauth-kit` at `https://auth.singletonsd.com` |
| Secrets | Global KV `ssd-global-kv-prod-ae` |

## Decap `/admin` auth

GitHub backend via the org OAuth proxy. Consumer `config.yml` (already set):

```yaml
backend:
  name: github
  repo: singleton-sd/marketing
  branch: main
  base_url: https://auth.singletonsd.com
  auth_endpoint: auth
```

| Item | Value |
| --- | --- |
| Shared repo | [`singleton-sd/cms-oauth-kit`](https://github.com/singleton-sd/cms-oauth-kit) |
| Public origin | `https://auth.singletonsd.com` |
| Callback | `https://auth.singletonsd.com/callback` |
| GitHub OAuth App | [Singleton SD CMS OAuth](https://github.com/settings/applications/3783537) |

Shared `ORIGINS` already includes `*.singletonsd.com`, apex `singletonsd.com`, and `localhost:4321`. Do **not** maintain a second origin list here. Do **not** open `/admin` on a raw `*.azurestaticapps.net` host.

Add origins, rotate the OAuth App, or deploy the Function only in `cms-oauth-kit`. This repo must not recreate `apps/marketing-oauth` or `infra/decap-oauth.bicep`.

KV `github-decap-oauth-client-secret` is owned by the shared Function. Do not delete it from this cutover.

Local: `http://localhost:4321/admin` (production `base_url`; `ORIGINS` already allows that host).
