# Singleton SD — Company Marketing

Public landing site for **Singleton Software Development** at [singletonsd.com](https://singletonsd.com).

## Stack

- Astro SSG + Tailwind + `@singleton-sd/tokens` (GitLab npm, `--ssd-*`)
- Decap CMS at `/admin` (GitHub backend)
- GitHub Pages at `www.singletonsd.com` (PR previews at `/pr-preview/pr-<n>/`)
- Decap GitHub OAuth via API gateway `https://api.singletonsd.com` (`v1/cms-auth`)

## Quick start

```sh
pnpm install
pnpm dev
```

See [SETUP.md](SETUP.md), [docs/deployment.md](docs/deployment.md), and [AGENTS.md](AGENTS.md).
