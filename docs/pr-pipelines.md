# PR pipelines — marketing

| Workflow | Trigger | Purpose |
| --- | --- | --- |
| `pages.yml` | push `main` | Production GitHub Pages publish (`gh-pages` root, keep `pr-preview/`) |
| `preview.yml` | pull_request | Read-only build with `PREVIEW_BASE_PATH=/pr-preview/pr-<n>/`, then publish to `gh-pages` + sticky comment |
| `release.yml` | push `main` | Path-aware package bump via singleton-release GitHub App; dispatches `pages.yml` after the release commit |

Decap GitHub OAuth is served by the API gateway
(`https://api.singletonsd.com/v1/cms-auth`), not this repository.

GitHub Pages uses `GITHUB_TOKEN` (contents write on `gh-pages`). Hosting needs
no extra secrets. Releases authenticate as the singleton-release GitHub App
(`vars.RELEASE_APP_ID`, `secrets.RELEASE_APP_PRIVATE_KEY`).

See [`deployment.md`](./deployment.md) for repo settings, DNS, and cutover order.
