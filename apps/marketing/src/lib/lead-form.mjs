/**
 * Browser helpers for POST https://api.singletonsd.com/v1/leads.
 *
 * Field names and limits match singleton-sd/job-kit `src/leads/lead-schema.ts`
 * and `lead-request.draft7.json`. Do not add unknown keys (strict objects).
 */

export const DEFAULT_LEADS_API_URL = 'https://api.singletonsd.com/v1/leads';

/** Origins this site may send. Must match the browser Origin (www/apex pair). */
export const COMPANY_SOURCE_SITES = [
  'https://www.singletonsd.com',
  'https://singletonsd.com',
];

export const DEFAULT_SOURCE_SITE = 'https://www.singletonsd.com';

export const CONSENT_TEXT_VERSION = 'ssd-privacy-v1';

export const LEAD_PRODUCTS = ['singleton_sd', 'inkads', 'platform_kit'];

export const LEAD_PRODUCT_LABELS = {
  singleton_sd: 'Singleton SD',
  inkads: 'InkAds',
  platform_kit: 'Platform Kit',
};

export const LEAD_LIMITS = {
  nameMax: 120,
  emailMax: 254,
  companyMax: 160,
  phoneMax: 40,
  messageMax: 4000,
  featureMax: 80,
  sourcePageMax: 500,
  consentTextVersionMax: 64,
  turnstileTokenMax: 4096,
  websiteMax: 500,
  bodyMaxBytes: 16_384,
};

export const FIELD_MESSAGES = {
  name: 'Enter your name.',
  email: 'Enter a valid email address.',
  company: 'Enter a shorter company name.',
  phone: 'Enter a shorter phone number, or leave it blank.',
  message: 'Enter a short message.',
  feature: 'Enter a shorter feature name, or leave it blank.',
  product: 'Select a product.',
  consent: 'Please confirm you agree to the privacy notice.',
  turnstileToken: 'Please complete the bot check.',
  formType: 'This form is not configured correctly.',
  sourceSite: 'This form is not configured correctly.',
  submissionId: 'This form is not configured correctly.',
  consentTextVersion: 'This form is not configured correctly.',
};

export const VALIDATION_SUMMARY = 'Please fix the highlighted fields and try again.';

export const TEMP_UNAVAILABLE =
  'This form is temporarily unavailable. Please try again later.';

export const GENERIC_RETRY = 'We could not send your message. Please try again shortly.';

export const TURNSTILE_FAILED = 'Verification failed. Please try again.';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CONTROLS_RE = /[\u0000-\u001f\u007f]/;
/** Textareas may include tab, LF, and CR; other C0 controls stay rejected. */
const MESSAGE_CONTROLS_RE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

/**
 * @param {string | undefined} value
 * @returns {string}
 */
export function resolveLeadsApiUrl(value) {
  const trimmed = (value ?? '').trim().replace(/\/$/, '');
  return trimmed || DEFAULT_LEADS_API_URL;
}

/**
 * `sourceSite` must match Origin. www and apex of this host are both allowed.
 * Unknown origins (localhost) fall back to www so the body stays schema-valid;
 * the gateway still rejects non-allowlisted Origins.
 *
 * @param {string | undefined} origin
 * @returns {(typeof COMPANY_SOURCE_SITES)[number]}
 */
export function resolveSourceSite(origin) {
  const trimmed = (origin ?? '').trim().replace(/\/$/, '');
  if (trimmed === 'https://www.singletonsd.com' || trimmed === 'https://singletonsd.com') {
    return trimmed;
  }
  return DEFAULT_SOURCE_SITE;
}

/**
 * @param {string | undefined} pathname
 * @returns {string | undefined}
 */
export function resolveSourcePage(pathname) {
  const trimmed = (pathname ?? '').trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, LEAD_LIMITS.sourcePageMax);
}

/**
 * @returns {string}
 */
export function createSubmissionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  throw new Error('UUID generation is not available');
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function asTrimmedString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * @param {string} value
 * @returns {boolean}
 */
function hasControls(value) {
  return CONTROLS_RE.test(value);
}

/**
 * @param {string} value
 * @returns {boolean}
 */
function hasMessageControls(value) {
  return MESSAGE_CONTROLS_RE.test(value);
}

/**
 * @typedef {{
 *   name?: string;
 *   email?: string;
 *   company?: string;
 *   phone?: string;
 *   message?: string;
 *   feature?: string;
 *   product?: string;
 *   consent?: string;
 *   turnstileToken?: string;
 *   formType?: string;
 * }} LeadFormErrors
 */

/**
 * @param {unknown} input
 * @returns {{ ok: true; errors: LeadFormErrors; value: Record<string, string | boolean> } | { ok: false; errors: LeadFormErrors; value: null }}
 */
export function validateLeadFields(input) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, errors: { name: FIELD_MESSAGES.name }, value: null };
  }

  const raw = /** @type {Record<string, unknown>} */ (input);
  /** @type {LeadFormErrors} */
  const errors = {};
  const formType = asTrimmedString(raw.formType);

  if (formType !== 'contact' && formType !== 'waitlist') {
    errors.formType = FIELD_MESSAGES.formType;
  }

  const name = asTrimmedString(raw.name);
  if (!name || name.length > LEAD_LIMITS.nameMax || hasControls(name)) {
    errors.name = FIELD_MESSAGES.name;
  }

  const email = asTrimmedString(raw.email).toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > LEAD_LIMITS.emailMax || hasControls(email)) {
    errors.email = FIELD_MESSAGES.email;
  }

  const company = asTrimmedString(raw.company);
  if (company && (company.length > LEAD_LIMITS.companyMax || hasControls(company))) {
    errors.company = FIELD_MESSAGES.company;
  }

  const phone = asTrimmedString(raw.phone);
  if (phone && (phone.length > LEAD_LIMITS.phoneMax || hasControls(phone))) {
    errors.phone = FIELD_MESSAGES.phone;
  }

  const message = asTrimmedString(raw.message);
  if (formType === 'contact') {
    if (!message || message.length > LEAD_LIMITS.messageMax || hasMessageControls(message)) {
      errors.message = FIELD_MESSAGES.message;
    }
  } else if (message && (message.length > LEAD_LIMITS.messageMax || hasMessageControls(message))) {
    errors.message = FIELD_MESSAGES.message;
  }

  const feature = asTrimmedString(raw.feature);
  if (feature && (feature.length > LEAD_LIMITS.featureMax || hasControls(feature))) {
    errors.feature = FIELD_MESSAGES.feature;
  }

  const product = asTrimmedString(raw.product);
  if (formType === 'waitlist') {
    if (!LEAD_PRODUCTS.includes(product)) {
      errors.product = FIELD_MESSAGES.product;
    }
  } else if (product && !LEAD_PRODUCTS.includes(product)) {
    errors.product = FIELD_MESSAGES.product;
  }

  if (raw.consent !== true) {
    errors.consent = FIELD_MESSAGES.consent;
  }

  const turnstileToken = asTrimmedString(raw.turnstileToken);
  if (!turnstileToken || turnstileToken.length > LEAD_LIMITS.turnstileTokenMax) {
    errors.turnstileToken = FIELD_MESSAGES.turnstileToken;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors, value: null };
  }

  return {
    ok: true,
    errors: {},
    value: {
      formType,
      name,
      email,
      company,
      phone,
      message,
      feature,
      product,
      consent: true,
      turnstileToken,
      website: asTrimmedString(raw.website).slice(0, LEAD_LIMITS.websiteMax),
      marketingOptIn: raw.marketingOptIn === true,
    },
  };
}

/**
 * @param {unknown} value
 * @returns {string | undefined}
 */
function present(value) {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * @param {{
 *   origin?: string;
 *   pathname?: string;
 *   submissionId: string;
 *   formType: 'contact' | 'waitlist';
 *   name?: string;
 *   email?: string;
 *   company?: string;
 *   phone?: string;
 *   message?: string;
 *   feature?: string;
 *   product?: string;
 *   consent?: boolean;
 *   marketingOptIn?: boolean;
 *   turnstileToken?: string;
 *   website?: string;
 * }} input
 * @returns {{
 *   ok: true;
 *   errors: LeadFormErrors;
 *   value: Record<string, unknown>;
 * } | { ok: false; errors: LeadFormErrors; value: null }}
 */
export function buildLeadPayload(input) {
  const submissionId = asTrimmedString(input?.submissionId);
  if (!UUID_RE.test(submissionId)) {
    return {
      ok: false,
      errors: { submissionId: FIELD_MESSAGES.submissionId },
      value: null,
    };
  }

  const validated = validateLeadFields(input);
  if (!validated.ok || !validated.value) {
    return { ok: false, errors: validated.errors, value: null };
  }

  const fields = validated.value;
  const formType = fields.formType;
  const sourceSite = resolveSourceSite(input.origin);
  const sourcePage = resolveSourcePage(input.pathname);

  /** @type {Record<string, unknown>} */
  const payload = {
    sourceSite,
    submissionId,
    name: fields.name,
    email: fields.email,
    consent: true,
    consentTextVersion: CONSENT_TEXT_VERSION,
    marketingOptIn: fields.marketingOptIn,
    turnstileToken: fields.turnstileToken,
    website: fields.website,
    formType,
  };

  if (sourcePage) payload.sourcePage = sourcePage;
  const company = present(fields.company);
  if (company) payload.company = company;
  const phone = present(fields.phone);
  if (phone) payload.phone = phone;

  if (formType === 'contact') {
    payload.message = fields.message;
    const product = present(fields.product);
    if (product) payload.product = product;
  } else if (formType === 'waitlist') {
    payload.product = fields.product;
    const feature = present(fields.feature);
    if (feature) payload.feature = feature;
    const message = present(fields.message);
    if (message) payload.message = message;
  } else {
    const exhaustive = formType;
    throw new Error(`unhandled form type: ${exhaustive}`);
  }

  const bytes = new TextEncoder().encode(JSON.stringify(payload)).length;
  if (bytes > LEAD_LIMITS.bodyMaxBytes) {
    return {
      ok: false,
      errors: { message: FIELD_MESSAGES.message },
      value: null,
    };
  }

  return { ok: true, errors: {}, value: payload };
}

/**
 * @param {unknown} body
 * @returns {Record<string, string>}
 */
export function fieldErrorsFromApiBody(body) {
  /** @type {Record<string, string>} */
  const errors = {};
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return errors;
  }
  const details = /** @type {{ details?: unknown }} */ (body).details;
  if (!Array.isArray(details)) {
    return errors;
  }
  for (const item of details) {
    if (typeof item === 'string') {
      const field = item.split('.')[0] ?? item;
      if (field && !item.includes(' ')) {
        errors[field] = FIELD_MESSAGES[field] ?? 'Please check this field.';
      }
      continue;
    }
    if (item && typeof item === 'object') {
      const record = /** @type {Record<string, unknown>} */ (item);
      const fieldRaw = record.field ?? record.path ?? record.name;
      const field = typeof fieldRaw === 'string' ? fieldRaw.split('.')[0] : '';
      const message = typeof record.message === 'string' ? record.message.trim() : '';
      if (!field) continue;
      errors[field] = message || FIELD_MESSAGES[field] || 'Please check this field.';
    }
  }
  return errors;
}

/**
 * @param {unknown} headers
 * @returns {string}
 */
function retryAfterHeader(headers) {
  if (!headers || typeof headers !== 'object') return '';
  const wanted = 'retry-after';
  const withGet = /** @type {{ get?: (key: string) => unknown; forEach?: Function }} */ (headers);
  if (typeof withGet.get === 'function') {
    const value = withGet.get('Retry-After') ?? withGet.get('retry-after');
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  if (typeof withGet.forEach === 'function') {
    let found = '';
    withGet.forEach((value, key) => {
      if (String(key).toLowerCase() === wanted && typeof value === 'string') {
        found = value.trim();
      }
    });
    if (found) return found;
  }
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === wanted && typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

/**
 * @param {unknown} headers
 * @returns {number | undefined}
 */
export function parseRetryAfterSeconds(headers) {
  const raw = retryAfterHeader(headers);
  if (!raw) return undefined;
  if (/^\d+$/.test(raw)) {
    const seconds = Number.parseInt(raw, 10);
    return Number.isFinite(seconds) && seconds > 0 ? seconds : undefined;
  }
  const dateMs = Date.parse(raw);
  if (Number.isNaN(dateMs)) return undefined;
  const seconds = Math.ceil((dateMs - Date.now()) / 1000);
  return seconds > 0 ? seconds : undefined;
}

/**
 * @param {unknown} headers
 * @returns {string}
 */
export function retryAfterMessage(headers) {
  const seconds = parseRetryAfterSeconds(headers);
  if (!seconds) return GENERIC_RETRY;
  if (seconds < 60) {
    return `Too many requests. Please try again in ${seconds} second${seconds === 1 ? '' : 's'}.`;
  }
  const minutes = Math.ceil(seconds / 60);
  return `Too many requests. Please try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`;
}

/**
 * @param {number} status
 * @param {unknown} body
 * @param {unknown} [headers]
 * @returns {{
 *   kind: 'success' | 'invalid' | 'unavailable' | 'retry';
 *   message: string;
 *   fieldErrors: Record<string, string>;
 *   id?: string;
 * }}
 */
export function interpretLeadResponse(status, body, headers) {
  if (status === 202) {
    const id =
      body && typeof body === 'object' && !Array.isArray(body) && typeof body.id === 'string'
        ? body.id
        : undefined;
    return { kind: 'success', message: '', fieldErrors: {}, id };
  }

  const errorCode =
    body && typeof body === 'object' && !Array.isArray(body) && typeof body.error === 'string'
      ? body.error
      : '';

  if (status === 400) {
    return {
      kind: 'invalid',
      message: VALIDATION_SUMMARY,
      fieldErrors: fieldErrorsFromApiBody(body),
    };
  }

  if (status === 404 || errorCode === 'function_disabled') {
    return { kind: 'unavailable', message: TEMP_UNAVAILABLE, fieldErrors: {} };
  }

  if (status === 403 && errorCode === 'turnstile_failed') {
    return {
      kind: 'retry',
      message: TURNSTILE_FAILED,
      fieldErrors: {},
    };
  }

  if (status === 429 || status === 503) {
    return { kind: 'retry', message: retryAfterMessage(headers), fieldErrors: {} };
  }

  if (status === 403 || status >= 500) {
    return { kind: 'retry', message: GENERIC_RETRY, fieldErrors: {} };
  }

  return { kind: 'retry', message: GENERIC_RETRY, fieldErrors: {} };
}

/**
 * @returns {Record<string, string>}
 */
export function leadRequestHeaders() {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}
