# PR pipelines — marketing

| Workflow | Trigger | Purpose |
| --- | --- | --- |
| `pages.yml` | push `main` | Production GitHub Pages publish (`gh-pages` root, keep `pr-preview/`) |
| `preview.yml` | pull_request | Read-only build with `PREVIEW_BASE_PATH=/pr-preview/pr-<n>/`, then publish to `gh-pages` + sticky comment |
| `release.yml` | push `main` | Path-aware package bump; dispatches `pages.yml` after a release commit |

Decap OAuth deploys in [`singleton-sd/cms-oauth-kit`](https://github.com/singleton-sd/cms-oauth-kit), not this repository.

GitHub Pages uses `GITHUB_TOKEN` (contents write on `gh-pages`). No Azure SWA
deploy token and no GitHub Actions secrets are required for hosting.

See [`deployment.md`](./deployment.md) for repo settings, DNS, and cutover order.
