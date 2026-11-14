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

## Releases

Releases are **tag-only**. Merging to `main` never bumps `package.json`, and the
Release workflow never commits or pushes to `main`.

On each merge to `main`, `.github/workflows/release.yml`:

1. Reads existing git tags (`vX.Y.Z`, plus legacy `@singleton-sd/marketing@x.y.z`)
2. Looks at conventional commits since the last reachable tag (`feat` / `fix` /
   `perf` / breaking)
3. Creates and pushes **only** an annotated `vX.Y.Z` tag
4. Publishes a GitHub Release with notes from those commits
5. Dispatches the Pages deploy so production rebuilds with the new tag

Build-time version comes from `git describe` (shown in the site footer), not
from `package.json`. The marketing `version` field is `0.0.0-development` and
is not the source of truth.

```sh
pnpm release          # dry-run the next tag and notes
pnpm release:ci       # CI only — tag + GitHub Release, never a branch push
```
