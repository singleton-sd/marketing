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

Releases are committed to `main` by the **singleton-release** GitHub App, which
Pato adds to the main branch ruleset bypass list. The workflow never uses a
PAT and never falls back to `GITHUB_TOKEN` for the push.

On each merge to `main` (unless the head commit is itself a release —
`chore(release)` or `[skip ci]`), `.github/workflows/release.yml`:

1. Mints an installation token from `vars.RELEASE_APP_ID` and
   `secrets.RELEASE_APP_PRIVATE_KEY`
2. Bumps `@singleton-sd/*` `package.json` versions from conventional commits
3. Updates `CHANGELOG.md`, `apps/marketing/CHANGELOG.md`, and
   `apps/marketing/src/data/changelog.json`
4. Commits `chore(release): vX.Y.Z [skip ci]`, tags `@scope/name@version`,
   and pushes the commit then the tags to `main`
5. Creates the GitHub Release
6. Dispatches `pages.yml` so production rebuilds from the committed version
   and changelog (`[skip ci]` skips the push-triggered Pages run)

```sh
pnpm release          # dry-run the next bump and notes
pnpm release:ci       # CI only — bump, commit, tag, push, GitHub Release
```
