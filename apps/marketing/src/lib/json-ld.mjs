/**
 * Serialize JSON-LD for an inline script. Escape `<` so a value cannot
 * close the script element.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function serializeJsonLd(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
