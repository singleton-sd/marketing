/**
 * Company /contact form helpers.
 *
 * Browser posts JSON to PostKit `POST /contact` (no API key in the page).
 * Extra fields (company, phone, source) are folded into `message`.
 * `subject` is server-owned (`sales`) — never a user-facing source field.
 */

export const CONTACT_SUBJECT = 'sales';

export const CONTACT_FORM_SOURCE = 'Singleton SD company contact form (/contact)';

export const DEFAULT_POSTKIT_API_BASE_URL = 'https://postkit.singletonsd.com';

export const CONTACT_PREVIEW_HEADER = 'X-PostKit-Contact-Preview';

export const LIMITS = {
  nameMax: 120,
  emailMax: 254,
  companyMax: 120,
  phoneMax: 40,
  noteMax: 4000,
  messageMin: 10,
  messageMax: 5000,
};

/** Practical email shape; rejects CR/LF and angle brackets (PostKit contact). */
const EMAIL_RE = /^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/;

const NAME_CONTROLS_RE = /[\u0000-\u001f\u007f]/;
const MESSAGE_CONTROLS_RE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

/**
 * @param {string | undefined} value
 * @returns {string}
 */
export function resolvePostkitApiBaseUrl(value) {
  const trimmed = (value ?? '').trim().replace(/\/$/, '');
  return trimmed || DEFAULT_POSTKIT_API_BASE_URL;
}

/**
 * @param {string | undefined} pathname
 * @returns {boolean}
 */
export function shouldMarkContactPreview(pathname) {
  return /(?:^|\/)pr-preview(?:\/|$)/.test(pathname ?? '');
}

/**
 * @param {string | undefined} pathname
 * @returns {Record<string, string>}
 */
export function postkitContactHeaders(pathname) {
  /** @type {Record<string, string>} */
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (shouldMarkContactPreview(pathname)) {
    headers[CONTACT_PREVIEW_HEADER] = 'true';
  }
  return headers;
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
function hasNameControls(value) {
  return NAME_CONTROLS_RE.test(value);
}

/**
 * @param {string} phone
 * @returns {boolean}
 */
function isPlausiblePhone(phone) {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 6 && digits.length <= 15 && phone.length <= LIMITS.phoneMax;
}

/**
 * @typedef {{
 *   name: string;
 *   email: string;
 *   company: string;
 *   phone: string;
 *   note: string;
 * }} ContactFormFields
 */

/**
 * @typedef {{
 *   name?: string;
 *   email?: string;
 *   company?: string;
 *   phone?: string;
 *   note?: string;
 * }} ContactFormErrors
 */

/**
 * @param {unknown} input
 * @returns {{ ok: true; errors: ContactFormErrors; value: ContactFormFields } | { ok: false; errors: ContactFormErrors; value: null }}
 */
export function validateContactFields(input) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, errors: { name: 'Enter your name.' }, value: null };
  }

  const raw = /** @type {Record<string, unknown>} */ (input);
  /** @type {ContactFormErrors} */
  const errors = {};

  const name = asTrimmedString(raw.name);
  if (!name || name.length > LIMITS.nameMax || hasNameControls(name)) {
    errors.name = 'Enter your name.';
  }

  const email = asTrimmedString(raw.email);
  if (
    !EMAIL_RE.test(email) ||
    email.length > LIMITS.emailMax ||
    hasNameControls(email)
  ) {
    errors.email = 'Enter a valid email address.';
  }

  const company = asTrimmedString(raw.company);
  if (company && (company.length > LIMITS.companyMax || hasNameControls(company))) {
    errors.company = 'Enter a shorter company name.';
  }

  const phone = asTrimmedString(raw.phone);
  if (phone && (hasNameControls(phone) || !isPlausiblePhone(phone))) {
    errors.phone = 'Enter a valid phone number, or leave it blank.';
  }

  const note = asTrimmedString(raw.note);
  if (note && (note.length > LIMITS.noteMax || MESSAGE_CONTROLS_RE.test(note))) {
    errors.note = 'Enter a shorter note without unsupported characters.';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors, value: null };
  }

  return { ok: true, errors: {}, value: { name, email, company, phone, note } };
}

/**
 * Fold optional fields and the automatic source tag into the PostKit message.
 *
 * @param {Pick<ContactFormFields, 'company' | 'phone' | 'note'>} fields
 * @returns {string}
 */
export function buildContactMessage(fields) {
  const lines = [`Source: ${CONTACT_FORM_SOURCE}`];
  if (fields.company) lines.push(`Company: ${fields.company}`);
  if (fields.phone) lines.push(`Phone: ${fields.phone}`);
  if (fields.note) {
    lines.push('', fields.note);
  }
  return lines.join('\n');
}

/**
 * @param {unknown} input
 * @returns {{
 *   ok: true;
 *   errors: ContactFormErrors;
 *   value: { name: string; email: string; subject: typeof CONTACT_SUBJECT; message: string };
 * } | { ok: false; errors: ContactFormErrors; value: null }}
 */
export function buildContactPayload(input) {
  const validated = validateContactFields(input);
  if (!validated.ok || !validated.value) {
    return { ok: false, errors: validated.errors, value: null };
  }

  const message = buildContactMessage(validated.value);
  if (message.length < LIMITS.messageMin || message.length > LIMITS.messageMax) {
    return {
      ok: false,
      errors: { note: 'Enter a shorter note and try again.' },
      value: null,
    };
  }

  return {
    ok: true,
    errors: {},
    value: {
      name: validated.value.name,
      email: validated.value.email,
      subject: CONTACT_SUBJECT,
      message,
    },
  };
}
