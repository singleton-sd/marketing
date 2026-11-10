import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  CONTACT_FORM_SOURCE,
  CONTACT_PREVIEW_HEADER,
  CONTACT_SUBJECT,
  DEFAULT_POSTKIT_API_BASE_URL,
  LIMITS,
  buildContactMessage,
  buildContactPayload,
  postkitContactHeaders,
  resolvePostkitApiBaseUrl,
  shouldMarkContactPreview,
  validateContactFields,
} from './contact-form.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

function readSrc(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

test('resolvePostkitApiBaseUrl prefers an explicit https URL', () => {
  assert.equal(
    resolvePostkitApiBaseUrl('https://example.test/postkit/'),
    'https://example.test/postkit',
  );
  assert.equal(resolvePostkitApiBaseUrl(''), DEFAULT_POSTKIT_API_BASE_URL);
  assert.equal(resolvePostkitApiBaseUrl(undefined), DEFAULT_POSTKIT_API_BASE_URL);
});

test('preview header is only sent on same-host PR preview paths', () => {
  assert.equal(shouldMarkContactPreview('/contact/'), false);
  assert.equal(shouldMarkContactPreview('/pr-preview/pr-12/contact/'), true);
  const live = postkitContactHeaders('/contact/');
  assert.equal(live['Content-Type'], 'application/json');
  assert.equal(live[CONTACT_PREVIEW_HEADER], undefined);
  const preview = postkitContactHeaders('/pr-preview/pr-12/contact/');
  assert.equal(preview[CONTACT_PREVIEW_HEADER], 'true');
});

test('validateContactFields requires name and email only', () => {
  const ok = validateContactFields({
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    company: '',
    phone: '',
    note: '',
  });
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.value, {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    company: '',
    phone: '',
    note: '',
  });

  const missing = validateContactFields({ name: '  ', email: 'nope' });
  assert.equal(missing.ok, false);
  assert.equal(missing.errors.name, 'Enter your name.');
  assert.equal(missing.errors.email, 'Enter a valid email address.');
  assert.equal(missing.errors.company, undefined);
  assert.equal(missing.errors.phone, undefined);
  assert.equal(missing.errors.note, undefined);
});

test('validateContactFields rejects control characters and overlong fields', () => {
  const badName = validateContactFields({
    name: 'Ada\u0000',
    email: 'ada@example.com',
  });
  assert.equal(badName.ok, false);

  const longCompany = validateContactFields({
    name: 'Ada',
    email: 'ada@example.com',
    company: 'A'.repeat(LIMITS.companyMax + 1),
  });
  assert.equal(longCompany.ok, false);
  assert.equal(longCompany.errors.company, 'Enter a shorter company name.');

  const phone = validateContactFields({
    name: 'Ada',
    email: 'ada@example.com',
    phone: 'call me',
  });
  assert.equal(phone.ok, false);

  const goodPhone = validateContactFields({
    name: 'Ada',
    email: 'ada@example.com',
    phone: '+61 400 000 000',
  });
  assert.equal(goodPhone.ok, true);
});

test('buildContactMessage tags the company contact form and omits empty optionals', () => {
  assert.equal(
    buildContactMessage({ company: '', phone: '', note: '' }),
    `Source: ${CONTACT_FORM_SOURCE}`,
  );
  assert.equal(
    buildContactMessage({
      company: 'Acme Pty Ltd',
      phone: '+61 400 000 000',
      note: 'Need a discovery workshop.',
    }),
    [
      `Source: ${CONTACT_FORM_SOURCE}`,
      'Company: Acme Pty Ltd',
      'Phone: +61 400 000 000',
      '',
      'Need a discovery workshop.',
    ].join('\n'),
  );
});

test('buildContactPayload posts sales subject and no user source field', () => {
  const result = buildContactPayload({
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    company: 'Analytical Engines',
    phone: '',
    note: 'Azure rebuild',
  });
  assert.equal(result.ok, true);
  assert.equal(result.value?.subject, CONTACT_SUBJECT);
  assert.equal(result.value?.subject, 'sales');
  assert.equal(result.value?.name, 'Ada Lovelace');
  assert.equal(result.value?.email, 'ada@example.com');
  assert.equal(Object.keys(result.value ?? {}).sort().join(','), 'email,message,name,subject');
  assert.match(result.value?.message ?? '', /Source: Singleton SD company contact form \(\/contact\)/);
  assert.match(result.value?.message ?? '', /Company: Analytical Engines/);
  assert.match(result.value?.message ?? '', /Azure rebuild/);
  assert.doesNotMatch(result.value?.message ?? '', /how did you hear/i);
  assert.ok((result.value?.message.length ?? 0) >= LIMITS.messageMin);
});

test('empty note still meets the PostKit message minimum via the source tag', () => {
  const result = buildContactPayload({
    name: 'Ada',
    email: 'ada@example.com',
  });
  assert.equal(result.ok, true);
  assert.ok((result.value?.message.length ?? 0) >= 10);
});

test('contact page has no source-of-lead field and no CRM wiring', () => {
  const page = readSrc('src/pages/contact.astro');
  const form = readSrc('src/components/marketing/ContactForm.astro');
  const copy = readSrc('src/content/pages/contact.md');
  const lib = readSrc('src/lib/contact-form.mjs');
  const publicCopy = `${page}\n${form}\n${copy}`;

  assert.match(form, /contact-name/);
  assert.match(form, /contact-email/);
  assert.match(form, /contact-company/);
  assert.match(form, /contact-phone/);
  assert.match(form, /contact-note/);
  assert.match(form, /\$\{apiBase\}\/contact/);
  assert.match(form, /Book a Software Discovery Call|discoveryCta/);
  assert.match(copy, /Software Discovery Call/);

  assert.doesNotMatch(publicCopy, /how did you hear/i);
  assert.doesNotMatch(publicCopy, /where did you hear/i);
  assert.doesNotMatch(form, /name=["']subject["']/);
  assert.doesNotMatch(form, /id=["']contact-subject["']/);
  assert.doesNotMatch(publicCopy, /\bTwenty\b/);
  assert.doesNotMatch(publicCopy, /crm/i);
  assert.doesNotMatch(lib, /twenty/i);

  const textarea = readSrc('src/components/ui/TextArea.astro');
  assert.doesNotMatch(textarea, /<slot\s*\/>/);
  assert.match(textarea, />\{value\}<\/textarea>/);
});
