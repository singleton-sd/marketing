# PR pipelines — marketing

| Workflow | Trigger | Purpose |
| --- | --- | --- |
| `pages.yml` | push `main` | Production GitHub Pages publish (`gh-pages` root, keep `pr-preview/`) |
| `preview.yml` | pull_request | Read-only build with `PREVIEW_BASE_PATH=/pr-preview/pr-<n>/`, then publish to `gh-pages` + sticky comment |
| `release.yml` | push `main` | Path-aware package bump; dispatches `pages.yml` after a release commit |

Decap GitHub OAuth is served by the API gateway
(`https://api.singletonsd.com/v1/cms-auth`), not this repository.

`gh-pages` pushes mint the singleton-release GitHub App token
(`vars.RELEASE_APP_ID` + `secrets.RELEASE_APP_PRIVATE_KEY`) in a deploy job
that does not run install/build. There is no `GITHUB_TOKEN` fallback on the
push path. Sticky PR comments still use `GITHUB_TOKEN`.

See [`deployment.md`](./deployment.md) for repo settings, DNS, and cutover order.
