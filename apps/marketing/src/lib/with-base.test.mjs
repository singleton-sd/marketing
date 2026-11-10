import assert from 'node:assert/strict';
import test from 'node:test';
import { isActivePath, withBase } from './with-base.mjs';

test('withBase leaves external and hash links unchanged', () => {
  assert.equal(withBase('https://example.com/x', '/preview/'), 'https://example.com/x');
  assert.equal(withBase('#section', '/preview/'), '#section');
  assert.equal(withBase('mailto:hi@example.com', '/preview/'), 'mailto:hi@example.com');
});

test('withBase prefixes internal paths for production and preview bases', () => {
  assert.equal(withBase('/', '/'), '/');
  assert.equal(withBase('/services', '/'), '/services');
  assert.equal(withBase('/', '/pr-preview/pr-9/'), '/pr-preview/pr-9/');
  assert.equal(withBase('/services', '/pr-preview/pr-9/'), '/pr-preview/pr-9/services');
});

test('isActivePath matches home only against the home URL', () => {
  assert.equal(isActivePath('/', '/', '/'), true);
  assert.equal(isActivePath('/about/', '/', '/'), false);
  assert.equal(isActivePath('/pr-preview/pr-9/', '/', '/pr-preview/pr-9/'), true);
  assert.equal(isActivePath('/pr-preview/pr-9/about/', '/', '/pr-preview/pr-9/'), false);
});

test('isActivePath matches nested routes after stripping the base', () => {
  assert.equal(isActivePath('/about/', '/about', '/'), true);
  assert.equal(isActivePath('/pr-preview/pr-9/about/', '/about', '/pr-preview/pr-9/'), true);
  assert.equal(isActivePath('/pr-preview/pr-9/services/', '/about', '/pr-preview/pr-9/'), false);
});
