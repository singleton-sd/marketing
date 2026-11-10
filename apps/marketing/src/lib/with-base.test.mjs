import assert from 'node:assert/strict';
import test from 'node:test';
import { isActivePath, rehypePrefixBase, withBase } from './with-base.mjs';

test('withBase is a no-op at the site root', () => {
  assert.equal(withBase('/', '/'), '/');
  assert.equal(withBase('/services', '/'), '/services');
  assert.equal(withBase('/services/', '/'), '/services/');
});

test('withBase prefixes GitHub Pages preview subpaths', () => {
  const base = '/pr-preview/pr-12/';
  assert.equal(withBase('/', base), '/pr-preview/pr-12/');
  assert.equal(withBase('/services', base), '/pr-preview/pr-12/services');
  assert.equal(withBase('/changelog/', base), '/pr-preview/pr-12/changelog/');
});

test('withBase leaves external and special-scheme hrefs unchanged', () => {
  const base = '/pr-preview/pr-12/';
  assert.equal(withBase('https://calendar.app.google/x', base), 'https://calendar.app.google/x');
  assert.equal(withBase('http://example.com', base), 'http://example.com');
  assert.equal(withBase('//cdn.example.com/logo.png', base), '//cdn.example.com/logo.png');
  assert.equal(withBase('mailto:support@singletonsd.com', base), 'mailto:support@singletonsd.com');
  assert.equal(withBase('tel:+61000000000', base), 'tel:+61000000000');
  assert.equal(withBase('#main', base), '#main');
});

test('isActivePath matches home only on the base root', () => {
  assert.equal(isActivePath('/', '/', '/'), true);
  assert.equal(isActivePath('/services/', '/', '/'), false);
  assert.equal(isActivePath('/pr-preview/pr-12/', '/', '/pr-preview/pr-12/'), true);
  assert.equal(
    isActivePath('/pr-preview/pr-12/services/', '/', '/pr-preview/pr-12/'),
    false,
  );
});

test('isActivePath matches section links under the preview base', () => {
  assert.equal(isActivePath('/services/', '/services', '/'), true);
  assert.equal(isActivePath('/about/', '/services', '/'), false);
  assert.equal(
    isActivePath('/pr-preview/pr-12/services/', '/services', '/pr-preview/pr-12/'),
    true,
  );
  assert.equal(
    isActivePath('/pr-preview/pr-12/', '/services', '/pr-preview/pr-12/'),
    false,
  );
});

test('isActivePath matches when the runtime pathname omits the preview prefix', () => {
  const base = '/pr-preview/pr-12/';
  assert.equal(isActivePath('/services/', '/services', base), true);
  assert.equal(isActivePath('/', '/', base), true);
  assert.equal(isActivePath('/about/', '/services', base), false);
});

test('rehypePrefixBase prefixes Markdown href and src under a preview base', () => {
  const tree = {
    type: 'root',
    children: [
      {
        type: 'element',
        tagName: 'p',
        properties: {},
        children: [
          {
            type: 'element',
            tagName: 'a',
            properties: { href: '/privacy/' },
            children: [],
          },
          {
            type: 'element',
            tagName: 'img',
            properties: { src: '/uploads/hero.png' },
            children: [],
          },
          {
            type: 'element',
            tagName: 'a',
            properties: { href: 'https://singletonsd.com' },
            children: [],
          },
        ],
      },
    ],
  };
  rehypePrefixBase('/pr-preview/pr-4/')()(tree);
  const [link, image, external] = tree.children[0].children;
  assert.equal(link.properties.href, '/pr-preview/pr-4/privacy/');
  assert.equal(image.properties.src, '/pr-preview/pr-4/uploads/hero.png');
  assert.equal(external.properties.href, 'https://singletonsd.com');
});
