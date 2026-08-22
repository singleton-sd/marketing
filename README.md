# Singleton SD — Company Marketing

Public landing site for **Singleton Software Development** at [singletonsd.com](https://singletonsd.com).

## Stack

- Astro SSG + Tailwind + `@singleton-sd/tokens` (GitLab npm, `--ssd-*`)
- Decap CMS at `/admin` (GitHub backend)
- Azure Static Web Apps Free
- Shared Decap OAuth: [`cms-oauth-kit`](https://github.com/singleton-sd/cms-oauth-kit) at `https://auth.singletonsd.com`
- Shared Key Vault in `rg-ssd-global`

## Quick start

```powershell
pnpm install
pnpm dev
```

See [SETUP.md](SETUP.md) and [AGENTS.md](AGENTS.md).
