import { expect, test, type Page, type Route } from '@playwright/test';

const LEADS_URL = 'https://api.singletonsd.com/v1/leads';
const TURNSTILE_HOST = 'https://challenges.cloudflare.com/**';

type LeadHandler = (route: Route) => Promise<void>;

async function stubTurnstile(page: Page) {
  await page.route(TURNSTILE_HOST, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `
        window.turnstile = {
          render: function (_el, opts) {
            window.__pwTurnstileCb = opts && opts.callback;
            queueMicrotask(function () {
              if (opts && opts.callback) opts.callback('test-turnstile-token');
            });
            return 'pw-widget';
          },
          reset: function () {
            queueMicrotask(function () {
              if (window.__pwTurnstileCb) window.__pwTurnstileCb('test-turnstile-token');
            });
          },
        };
      `,
    });
  });
}

async function mockLeads(page: Page, handler: LeadHandler) {
  await page.route(LEADS_URL, async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204 });
      return;
    }
    await handler(route);
  });
}

async function fillContact(page: Page) {
  await page.getByLabel('Name').fill('Ada Lovelace');
  await page.getByLabel('Email').fill('ada@example.com');
  await page.getByLabel('Company').fill('Analytical Engines');
  await page.getByLabel('Phone').fill('+61 400 000 000');
  await page.getByLabel('What are you after?').fill('Hello,\nPlease contact me.');
  await page.getByRole('checkbox', { name: /I agree to the/ }).check();
}

async function fillWaitlist(page: Page) {
  await page.getByLabel('Name').fill('Ada Lovelace');
  await page.getByLabel('Email').fill('ada@example.com');
  await page.getByLabel('Product', { exact: true }).selectOption('inkads');
  await page.getByLabel('Feature').fill('venues waitlist');
  await page.getByLabel('Anything else?').fill('Hello,\nPlease contact me.');
  await page.getByRole('checkbox', { name: /I agree to the/ }).check();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.turnstile = {
      render(_el, opts) {
        window.__pwTurnstileCb = opts && opts.callback;
        queueMicrotask(function () {
          if (opts && opts.callback) opts.callback('test-turnstile-token');
        });
        return 'pw-widget';
      },
      reset() {
        queueMicrotask(function () {
          if (window.__pwTurnstileCb) window.__pwTurnstileCb('test-turnstile-token');
        });
      },
    };
  });
  await stubTurnstile(page);
});

test('contact form posts a job-kit contact payload and shows success', async ({ page }) => {
  const bodies: unknown[] = [];
  await mockLeads(page, async (route) => {
    bodies.push(route.request().postDataJSON());
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    });
  });

  await page.goto('/contact/');
  await expect(page.getByRole('button', { name: 'Send message' })).toBeEnabled();
  await fillContact(page);
  await page.getByRole('button', { name: 'Send message' }).click();

  await expect(
    page.getByText('Thanks — your message was sent. We typically respond within 24 hours.'),
  ).toBeVisible();
  expect(bodies).toHaveLength(1);
  const payload = bodies[0] as Record<string, unknown>;
  expect(payload.formType).toBe('contact');
  expect(payload.sourceSite).toBe('https://www.singletonsd.com');
  expect(payload.name).toBe('Ada Lovelace');
  expect(payload.email).toBe('ada@example.com');
  expect(payload.message).toBe('Hello,\nPlease contact me.');
  expect(payload.consent).toBe(true);
  expect(payload.consentTextVersion).toBe('ssd-privacy-v1');
  expect(payload.marketingOptIn).toBe(false);
  expect(payload.turnstileToken).toBe('test-turnstile-token');
  expect(payload.website).toBe('');
  expect(typeof payload.submissionId).toBe('string');
  expect(payload).not.toHaveProperty('subject');
});

test('contact form shows API field errors and a generic retry on 5xx', async ({ page }) => {
  let calls = 0;
  await mockLeads(page, async (route) => {
    calls += 1;
    if (calls === 1) {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'payload_invalid', details: ['email'] }),
      });
      return;
    }
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'upstream_failed' }),
    });
  });

  await page.goto('/contact/');
  await expect(page.getByRole('button', { name: 'Send message' })).toBeEnabled();
  await fillContact(page);
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByText('Please fix the highlighted fields and try again.')).toBeVisible();
  await expect(page.getByText('Enter a valid email address.')).toBeVisible();

  await page.getByLabel('Email').fill('ada@example.com');
  await expect(page.getByRole('button', { name: 'Send message' })).toBeEnabled();
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByText('We could not send your message. Please try again shortly.')).toBeVisible();
});

test('contact submit is disabled in the initial HTML without JavaScript', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  const response = await page.goto('/contact/');
  const raw = (await response?.text()) ?? '';
  expect(raw).toMatch(/method="post"/);
  expect(raw).toMatch(/action="#"/);
  expect(raw).toMatch(/<button[^>]*type="submit"[^>]*disabled/);
  expect(raw).toContain('<noscript>');
  expect(raw).toContain('This form needs JavaScript');
  expect(raw).toContain('mailto:support@singletonsd.com');
  await expect(page.getByRole('button', { name: 'Send message' })).toBeDisabled();
  await context.close();
});

test('contact form maps turnstile_failed and Retry-After', async ({ page }) => {
  let calls = 0;
  await mockLeads(page, async (route) => {
    calls += 1;
    if (calls === 1) {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'turnstile_failed' }),
      });
      return;
    }
    await route.fulfill({
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': '30',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Expose-Headers': 'Retry-After',
      },
      body: JSON.stringify({ error: 'rate_limited' }),
    });
  });

  await page.goto('/contact/');
  await expect(page.getByRole('button', { name: 'Send message' })).toBeEnabled();
  await fillContact(page);
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByText('Verification failed. Please try again.')).toBeVisible();

  await expect(page.getByRole('button', { name: 'Send message' })).toBeEnabled();
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByText('Too many requests. Please try again in 30 seconds.')).toBeVisible();
});

test('waitlist form posts product payload and treats function_disabled as unavailable', async ({
  page,
}) => {
  const bodies: unknown[] = [];
  let calls = 0;
  await mockLeads(page, async (route) => {
    calls += 1;
    bodies.push(route.request().postDataJSON());
    if (calls === 1) {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'function_disabled' }),
      });
      return;
    }
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({ id: '550e8400-e29b-41d4-a716-446655440000' }),
    });
  });

  await page.goto('/waitlist/');
  await expect(page.getByRole('button', { name: 'Join waitlist' })).toBeEnabled();
  await fillWaitlist(page);
  await page.getByRole('button', { name: 'Join waitlist' }).click();
  await expect(
    page.getByText('This form is temporarily unavailable. Please try again later.'),
  ).toBeVisible();

  const first = bodies[0] as Record<string, unknown>;
  expect(first.formType).toBe('waitlist');
  expect(first.product).toBe('inkads');
  expect(first.feature).toBe('venues waitlist');
  expect(first.message).toBe('Hello,\nPlease contact me.');
  expect(first.sourceSite).toBe('https://www.singletonsd.com');
  expect(typeof first.submissionId).toBe('string');

  await expect(page.getByRole('button', { name: 'Join waitlist' })).toBeEnabled();
  await page.getByRole('button', { name: 'Join waitlist' }).click();
  await expect(page.getByText('You are on the list.')).toBeVisible();
  const second = bodies[1] as Record<string, unknown>;
  expect(second.submissionId).toBe(first.submissionId);
});
