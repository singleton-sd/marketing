import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '../../../..');
const appRoot = join(here, '../..');

/**
 * @param {string} rel
 * @returns {string}
 */
function readRepo(rel) {
  return readFileSync(join(repoRoot, rel), 'utf8');
}

test('Astro uses www.singletonsd.com and PREVIEW_BASE_PATH for Pages previews', () => {
  const config = readFileSync(join(appRoot, 'astro.config.mjs'), 'utf8');
  assert.match(config, /site:\s*'https:\/\/www\.singletonsd\.com'/);
  assert.match(config, /PREVIEW_BASE_PATH/);
  assert.match(config, /base:\s*previewBase/);
  assert.match(config, /trailingSlash:\s*'always'/);
});

test('public/CNAME is the production custom domain', () => {
  const cname = readFileSync(join(appRoot, 'public/CNAME'), 'utf8');
  assert.equal(cname.trim(), 'www.singletonsd.com');
});

test('header, footer, and layout honor BASE_URL', () => {
  const layout = readFileSync(join(appRoot, 'src/layouts/BaseLayout.astro'), 'utf8');
  const header = readFileSync(join(appRoot, 'src/components/shell/SiteHeader.astro'), 'utf8');
  const footer = readFileSync(join(appRoot, 'src/components/shell/SiteFooter.astro'), 'utf8');
  const button = readFileSync(join(appRoot, 'src/components/ui/Button.astro'), 'utf8');
  assert.match(layout, /import\.meta\.env\.BASE_URL/);
  assert.match(header, /import\.meta\.env\.BASE_URL/);
  assert.match(header, /withBase/);
  assert.match(footer, /withBase/);
  assert.match(button, /withBase/);
});

test('Pages production workflow uses official deploy-pages and keeps previews', () => {
  const workflow = readRepo('.github/workflows/pages.yml');
  const publish = readRepo('.github/workflows/publish-pages.yml');
  assert.match(workflow, /branches:\s*\[main\]/);
  assert.match(workflow, /JamesIves\/github-pages-deploy-action@v4\.8\.0/);
  assert.match(workflow, /branch:\s*gh-pages/);
  assert.match(workflow, /clean-exclude:\s*pr-preview/);
  assert.match(workflow, /uses:\s*\.\/\.github\/workflows\/publish-pages\.yml/);
  assert.match(publish, /actions\/configure-pages@v5/);
  assert.match(publish, /actions\/upload-pages-artifact@v3/);
  assert.match(publish, /actions\/deploy-pages@v4/);
  assert.doesNotMatch(workflow, /Azure\/static-web-apps-deploy/);
  assert.doesNotMatch(publish, /secrets\./);
  assert.doesNotMatch(workflow, /secrets\./);
});

test('PR workflow publishes subpath previews without SWA', () => {
  const workflow = readRepo('.github/workflows/preview.yml');
  assert.match(workflow, /rossjrw\/pr-preview-action@v1\.8\.1/);
  assert.match(workflow, /PREVIEW_BASE_PATH:\s*\/pr-preview\/pr-/);
  assert.match(workflow, /pages-base-url:\s*https:\/\/www\.singletonsd\.com/);
  assert.match(workflow, /umbrella-dir:\s*pr-preview/);
  assert.match(workflow, /pull-requests:\s*write/);
  assert.match(workflow, /pages-preview:start/);
  assert.match(workflow, /sticky-pull-request-comment@v2/);
  assert.match(workflow, /header:\s*pages-preview-marketing/);
  assert.match(workflow, /Retry deploy preview/);
  assert.match(workflow, /Retry remove preview/);
  assert.match(workflow, /publish-pages\.yml/);
  assert.doesNotMatch(workflow, /Azure\/static-web-apps-deploy/);
  assert.doesNotMatch(workflow, /pull_request_target/);
  assert.doesNotMatch(workflow, /secrets\./);
  assert.equal((workflow.match(/rossjrw\/pr-preview-action@v1\.8\.1/g) ?? []).length, 4);
});

test('SWA-only deploy workflows and config are gone', () => {
  const release = readRepo('.github/workflows/release.yml');
  assert.match(release, /gh workflow run pages\.yml --ref main/);
  assert.doesNotMatch(release, /deploy-marketing\.yml/);
  assert.doesNotMatch(readRepo('AGENTS.md'), /preview-marketing\.yml/);
});

test('cutover runbook lists Pages DNS targets', () => {
  const doc = readRepo('docs/github-pages-cutover.md');
  assert.match(doc, /www\.singletonsd\.com/);
  assert.match(doc, /singleton-sd\.github\.io/);
  assert.match(doc, /185\.199\.108\.153/);
  assert.match(doc, /2606:50c0:8000::153/);
  assert.match(doc, /swa-marketing-deployment-token/);
  assert.match(doc, /actions\/deploy-pages/);
});
