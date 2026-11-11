# Marketing site — Astro + Decap

`[repo=singleton-sd/marketing]`

Locked stack for `singletonsd.com` (GitHub Pages at `www.singletonsd.com`).

## Stack

| Layer | Choice |
| --- | --- |
| SSG | **Astro** (`apps/marketing`) |
| Styling | Tailwind 3 + Singleton SD design tokens |
| Content | Markdown under `apps/marketing/src/content/pages/` |
| CMS | Decap at `/admin` |
| OAuth | API gateway `https://api.singletonsd.com` (`v1/cms-auth`) |
| Host | GitHub Pages (`www.singletonsd.com`) |
| Secrets | Global KV `ssd-global-kv-prod-ae` (OAuth Function — not Pages) |

## Decap `/admin` auth

GitHub backend via the org OAuth proxy. Consumer `config.yml` (already set):

```yaml
backend:
  name: github
  repo: singleton-sd/marketing
  branch: main
  base_url: https://api.singletonsd.com
  auth_endpoint: v1/cms-auth/auth
```

| Item | Value |
| --- | --- |
| Gateway | `https://api.singletonsd.com` |
| Auth endpoint | `v1/cms-auth/auth` |
| Callback | `https://api.singletonsd.com/v1/cms-auth/callback` (server-side) |
| GitHub OAuth App | [Singleton SD CMS OAuth](https://github.com/settings/applications/3783537) |

Do **not** maintain a second origin list here. Prefer `/admin` on `https://www.singletonsd.com`; GitHub Pages preview paths are noindex and are not a supported CMS origin. The gateway requests `public_repo`; this public repo does not set a Decap `scope`.

Add origins, rotate the OAuth App, or deploy CMS auth only on the gateway. This repo must not recreate `apps/marketing-oauth` or `infra/decap-oauth.bicep`.

Local: `http://localhost:4321/admin` (production `base_url`).
