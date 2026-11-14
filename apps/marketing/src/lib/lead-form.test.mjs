import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  COMPANY_SOURCE_SITES,
  CONSENT_TEXT_VERSION,
  DEFAULT_LEADS_API_URL,
  DEFAULT_SOURCE_SITE,
  FIELD_MESSAGES,
  GENERIC_RETRY,
  LEAD_LIMITS,
  TEMP_UNAVAILABLE,
  TURNSTILE_FAILED,
  VALIDATION_SUMMARY,
  buildLeadPayload,
  createSubmissionId,
  fieldErrorsFromApiBody,
  interpretLeadResponse,
  parseRetryAfterSeconds,
  resolveLeadsApiUrl,
  resolveSourcePage,
  resolveSourceSite,
  validateLeadFields,
} from './lead-form.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const SUBMISSION_ID = '550e8400-e29b-41d4-a716-446655440000';

function readSrc(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

function contactFields(overrides = {}) {
  return {
    formType: 'contact',
    submissionId: SUBMISSION_ID,
    origin: 'https://www.singletonsd.com',
    pathname: '/contact/',
    name: 'Ada Lovelace',
    email: 'Ada@Example.com',
    company: 'Analytical Engines',
    phone: '+61 400 000 000',
    message: 'Please get in touch about a project.',
    consent: true,
    marketingOptIn: false,
    turnstileToken: 'test-turnstile-token',
    website: '',
    ...overrides,
  };
}

function waitlistFields(overrides = {}) {
  return {
    formType: 'waitlist',
    submissionId: SUBMISSION_ID,
    origin: 'https://www.singletonsd.com',
    pathname: '/waitlist/',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    product: 'inkads',
    feature: 'venues waitlist',
    consent: true,
    marketingOptIn: false,
    turnstileToken: 'test-turnstile-token',
    website: '',
    ...overrides,
  };
}

test('resolveLeadsApiUrl defaults to the shared intake URL', () => {
  assert.equal(resolveLeadsApiUrl(''), DEFAULT_LEADS_API_URL);
  assert.equal(resolveLeadsApiUrl(undefined), DEFAULT_LEADS_API_URL);
  assert.equal(
    resolveLeadsApiUrl('https://api.example.test/v1/leads/'),
    'https://api.example.test/v1/leads',
  );
  assert.equal(DEFAULT_LEADS_API_URL, 'https://api.singletonsd.com/v1/leads');
});

test('resolveSourceSite uses Origin when it is www or apex', () => {
  assert.equal(resolveSourceSite('https://www.singletonsd.com'), 'https://www.singletonsd.com');
  assert.equal(resolveSourceSite('https://singletonsd.com/'), 'https://singletonsd.com');
  assert.equal(resolveSourceSite('http://localhost:4321'), DEFAULT_SOURCE_SITE);
  assert.deepEqual(COMPANY_SOURCE_SITES, [
    'https://www.singletonsd.com',
    'https://singletonsd.com',
  ]);
});

test('resolveSourcePage trims and caps at 500 characters', () => {
  assert.equal(resolveSourcePage('/contact/'), '/contact/');
  assert.equal(resolveSourcePage('  '), undefined);
  assert.equal(resolveSourcePage('x'.repeat(600)).length, LEAD_LIMITS.sourcePageMax);
});

test('createSubmissionId returns a UUID v4', () => {
  const id = createSubmissionId();
  assert.match(
    id,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
});

test('validateLeadFields requires contact name, email, message, consent, and token', () => {
  const ok = validateLeadFields(contactFields());
  assert.equal(ok.ok, true);
  assert.equal(ok.value.email, 'ada@example.com');

  const missing = validateLeadFields({
    formType: 'contact',
    name: '  ',
    email: 'nope',
    consent: false,
    turnstileToken: '',
  });
  assert.equal(missing.ok, false);
  assert.equal(missing.errors.name, FIELD_MESSAGES.name);
  assert.equal(missing.errors.email, FIELD_MESSAGES.email);
  assert.equal(missing.errors.message, FIELD_MESSAGES.message);
  assert.equal(missing.errors.consent, FIELD_MESSAGES.consent);
  assert.equal(missing.errors.turnstileToken, FIELD_MESSAGES.turnstileToken);
});

test('waitlist requires a product from the shared allowlist', () => {
  const missing = validateLeadFields(waitlistFields({ product: '' }));
  assert.equal(missing.ok, false);
  assert.equal(missing.errors.product, FIELD_MESSAGES.product);

  const ok = validateLeadFields(waitlistFields({ product: 'platform_kit', message: '' }));
  assert.equal(ok.ok, true);
});

test('contact and waitlist messages allow newlines and tabs', () => {
  const multiline = 'Hello,\nPlease contact me.\tThanks';
  const contact = buildLeadPayload(contactFields({ message: multiline }));
  assert.equal(contact.ok, true);
  assert.equal(contact.value.message, multiline);

  const waitlist = buildLeadPayload(waitlistFields({ message: multiline }));
  assert.equal(waitlist.ok, true);
  assert.equal(waitlist.value.message, multiline);
});

test('message still rejects other control characters; single-line fields stay strict', () => {
  const nul = validateLeadFields(contactFields({ message: 'Hello\u0000there' }));
  assert.equal(nul.ok, false);
  assert.equal(nul.errors.message, FIELD_MESSAGES.message);

  const nameNewline = validateLeadFields(contactFields({ name: 'Ada\nLovelace' }));
  assert.equal(nameNewline.ok, false);
  assert.equal(nameNewline.errors.name, FIELD_MESSAGES.name);

  const emailNewline = validateLeadFields(contactFields({ email: 'ada\n@example.com' }));
  assert.equal(emailNewline.ok, false);
  assert.equal(emailNewline.errors.email, FIELD_MESSAGES.email);

  const companyTab = validateLeadFields(contactFields({ company: 'Acme\tPty' }));
  assert.equal(companyTab.ok, false);
  assert.equal(companyTab.errors.company, FIELD_MESSAGES.company);
});

test('buildLeadPayload matches the job-kit contact schema exactly', () => {
  const result = buildLeadPayload(contactFields());
  assert.equal(result.ok, true);
  assert.deepEqual(result.value, {
    sourceSite: 'https://www.singletonsd.com',
    sourcePage: '/contact/',
    submissionId: SUBMISSION_ID,
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    company: 'Analytical Engines',
    phone: '+61 400 000 000',
    consent: true,
    consentTextVersion: CONSENT_TEXT_VERSION,
    marketingOptIn: false,
    turnstileToken: 'test-turnstile-token',
    website: '',
    formType: 'contact',
    message: 'Please get in touch about a project.',
  });
  assert.equal(CONSENT_TEXT_VERSION, 'ssd-privacy-v1');
  assert.deepEqual(
    Object.keys(result.value).sort(),
    [
      'company',
      'consent',
      'consentTextVersion',
      'email',
      'formType',
      'marketingOptIn',
      'message',
      'name',
      'phone',
      'sourcePage',
      'sourceSite',
      'submissionId',
      'turnstileToken',
      'website',
    ].sort(),
  );
});

test('buildLeadPayload uses apex sourceSite when Origin is apex', () => {
  const result = buildLeadPayload(
    contactFields({ origin: 'https://singletonsd.com', company: '', phone: '' }),
  );
  assert.equal(result.ok, true);
  assert.equal(result.value.sourceSite, 'https://singletonsd.com');
  assert.equal(result.value.company, undefined);
  assert.equal(result.value.phone, undefined);
});

test('buildLeadPayload waitlist includes product and omits empty optionals', () => {
  const result = buildLeadPayload(
    waitlistFields({ company: '', phone: '', message: '  ', feature: 'venues waitlist' }),
  );
  assert.equal(result.ok, true);
  assert.equal(result.value.formType, 'waitlist');
  assert.equal(result.value.product, 'inkads');
  assert.equal(result.value.feature, 'venues waitlist');
  assert.equal(result.value.message, undefined);
  assert.equal(result.value.company, undefined);
  assert.ok(!('subject' in result.value));
});

test('buildLeadPayload reuses the provided submissionId', () => {
  const first = buildLeadPayload(contactFields());
  const second = buildLeadPayload(contactFields());
  assert.equal(first.value.submissionId, SUBMISSION_ID);
  assert.equal(second.value.submissionId, SUBMISSION_ID);
});

test('buildLeadPayload rejects unknown keys by never emitting them', () => {
  const result = buildLeadPayload(
    contactFields({ subject: 'sales', howDidYouHear: 'search', isTest: true }),
  );
  assert.equal(result.ok, true);
  assert.equal(result.value.subject, undefined);
  assert.equal(result.value.howDidYouHear, undefined);
  assert.equal(result.value.isTest, undefined);
  assert.ok(!('subject' in result.value));
});

test('marketingOptIn stays false unless checked', () => {
  const off = buildLeadPayload(contactFields({ marketingOptIn: false }));
  const on = buildLeadPayload(contactFields({ marketingOptIn: true }));
  assert.equal(off.value.marketingOptIn, false);
  assert.equal(on.value.marketingOptIn, true);
});

test('interpretLeadResponse maps 202, 400 field lists, 404, and retry statuses', () => {
  assert.equal(interpretLeadResponse(202, { id: SUBMISSION_ID }).kind, 'success');
  const invalid = interpretLeadResponse(400, {
    error: 'payload_invalid',
    details: ['email', 'message'],
  });
  assert.equal(invalid.kind, 'invalid');
  assert.equal(invalid.message, VALIDATION_SUMMARY);
  assert.equal(invalid.fieldErrors.email, FIELD_MESSAGES.email);
  assert.equal(invalid.fieldErrors.message, FIELD_MESSAGES.message);

  const disabled = interpretLeadResponse(404, { error: 'function_disabled' });
  assert.equal(disabled.kind, 'unavailable');
  assert.equal(disabled.message, TEMP_UNAVAILABLE);

  assert.equal(interpretLeadResponse(403, { error: 'origin_not_allowed' }).message, GENERIC_RETRY);
  const turnstile = interpretLeadResponse(403, { error: 'turnstile_failed' });
  assert.equal(turnstile.message, TURNSTILE_FAILED);
  assert.equal(turnstile.fieldErrors.turnstileToken, TURNSTILE_FAILED);
  assert.equal(interpretLeadResponse(429, {}).kind, 'retry');
  assert.equal(
    interpretLeadResponse(429, { error: 'rate_limited' }, { 'Retry-After': '30' }).message,
    'Too many requests. Please try again in 30 seconds.',
  );
  assert.equal(parseRetryAfterSeconds({ 'Retry-After': '1' }), 1);
  assert.equal(interpretLeadResponse(503, { error: 'queue_unavailable' }).kind, 'retry');
  assert.equal(interpretLeadResponse(500, {}).kind, 'retry');
});

test('fieldErrorsFromApiBody accepts field objects with messages', () => {
  const errors = fieldErrorsFromApiBody({
    details: [{ field: 'email', message: 'Email is already registered.' }],
  });
  assert.equal(errors.email, 'Email is already registered.');
});

test('forms post to /v1/leads and never mention PostKit or CRM APIs', () => {
  const contactPage = readSrc('src/pages/contact.astro');
  const waitlistPage = readSrc('src/pages/waitlist.astro');
  const form = readSrc('src/components/marketing/LeadForm.astro');
  const lib = readSrc('src/lib/lead-form.mjs');
  const combined = `${contactPage}\n${waitlistPage}\n${form}\n${lib}`;

  assert.match(form, /data-lead-form/);
  assert.match(form, /method=["']post["']/);
  assert.match(form, /action=["']#["']/);
  assert.match(form, /data-lead-submit[\s\S]{0,120}disabled/);
  assert.match(form, /<noscript>/);
  assert.match(form, /mailto:support@singletonsd\.com/);
  assert.match(form, /GENERIC_RETRY/);
  assert.doesNotMatch(form, /Check your connection/);
  assert.match(form, /cf-turnstile|data-lead-turnstile/);
  assert.match(form, /name=["']website["']/);
  assert.match(form, /name=["']consent["']/);
  assert.match(form, /name=["']marketingOptIn["']/);
  assert.match(lib, /api\.singletonsd\.com\/v1\/leads/);
  assert.match(form, /v1\/leads|data-leads-api/);
  assert.doesNotMatch(combined, /postkit/i);
  assert.doesNotMatch(combined, /PUBLIC_POSTKIT/);
  assert.doesNotMatch(combined, /twenty/i);
  assert.doesNotMatch(form, /name=["']subject["']/);
});

test('site is published at www.singletonsd.com with apex on the certificate pair', () => {
  const cname = readFileSync(join(root, 'public/CNAME'), 'utf8').trim();
  const astro = readSrc('astro.config.mjs');
  const site = readSrc('src/lib/site.ts');
  assert.equal(cname, 'www.singletonsd.com');
  assert.match(astro, /site:\s*'https:\/\/www\.singletonsd\.com'/);
  assert.match(site, /SITE_ORIGIN = 'https:\/\/www\.singletonsd\.com'/);
});
