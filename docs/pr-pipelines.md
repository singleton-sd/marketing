# PR pipelines — marketing

| Workflow | Trigger | Purpose |
| --- | --- | --- |
| `pages.yml` | push `main` | Production GitHub Pages (sync `gh-pages`, then `actions/deploy-pages`) |
| `preview.yml` | pull_request | Path preview at `/pr-preview/pr-<n>/` + sticky PR comment |
| `publish-pages.yml` | `workflow_call` / `workflow_dispatch` | Official `actions/deploy-pages` of the `gh-pages` tree |
| `release.yml` | push `main` | Path-aware package bump; dispatches `pages.yml` after a marketing version bump |

Decap OAuth deploys in [`singleton-sd/cms-oauth-kit`](https://github.com/singleton-sd/cms-oauth-kit), not this repository.

Pages deploys do not use Azure OIDC or a SWA token. Cutover (DNS, repo Pages settings, deleting `ssd-mkt-prod-ae`) is documented in [github-pages-cutover.md](github-pages-cutover.md).
