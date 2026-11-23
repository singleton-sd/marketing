import assert from 'node:assert/strict';
import test from 'node:test';
import { serializeJsonLd } from './json-ld.mjs';

test('serializeJsonLd escapes script breakers and round-trips', () => {
  const value = { html: '</script><img src=x onerror=alert(1)>' };
  const out = serializeJsonLd(value);
  assert.equal(out.includes('</script'), false);
  assert.equal(JSON.parse(out).html, value.html);
});
