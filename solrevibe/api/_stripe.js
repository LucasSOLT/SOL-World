/**
 * Shared Stripe configuration & REST helper for SOL REViBE serverless functions.
 * Prefixed with '_' so Vercel does not expose it as a standalone API route.
 */

const STRIPE_API_BASE = 'https://api.stripe.com/v1';

const STRIPE_PUBLISHABLE_FALLBACK =
  'pk_live_51RNscyGYjYbvkxDDieRGNffxUFdRzUPDMFdVAhtvSg1pko7XNu63av6QYkIi2qcCxSr7YU1jpXr9EQbLTmf8nCfp00NLG6yWlF';

const PLAN_CATALOG = {
  experience: {
    key: 'experience',
    amountCents: 199500,
    priceFormatted: '$1,995.00',
    name: 'SOL REViBE Home Experience',
    description: 'OlyLife P90+ device + Therapeutic Audio Guides (TAGs)',
  },
  complete: {
    key: 'complete',
    amountCents: 299500,
    priceFormatted: '$2,995.00',
    name: 'SOL REViBE Complete Home Setup',
    description: 'Complete 14-item turnkey home mind-body station setup',
  },
  b2b: {
    key: 'b2b',
    amountCents: 399500,
    priceFormatted: '$3,995.00',
    name: 'SOL REViBE Business-in-a-Box Station',
    description: 'Commercial-grade PEMF station & showcase allocation package',
  },
};

function resolvePlan(rawPlan) {
  const key = String(rawPlan || 'complete').toLowerCase().trim();
  if (key === 'station' || key === 'commercial') return PLAN_CATALOG.b2b;
  return PLAN_CATALOG[key] || PLAN_CATALOG.complete;
}

function normalizeCountry(rawCountry) {
  const c = String(rawCountry || '').trim();
  if (!c) return 'US';
  const upper = c.toUpperCase();
  if (upper.length === 2) return upper;
  const map = {
    'UNITED STATES': 'US',
    'UNITED STATES OF AMERICA': 'US',
    'USA': 'US',
    'CANADA': 'CA',
    'UNITED KINGDOM': 'GB',
    'UK': 'GB',
    'AUSTRALIA': 'AU',
    'NEW ZEALAND': 'NZ',
    'MEXICO': 'MX',
  };
  return map[upper] || 'US';
}

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
}

async function stripeRequest(method, path, formParams = null) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    const err = new Error('Stripe secret key is not configured on the server.');
    err.statusCode = 500;
    throw err;
  }

  const options = {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
    },
  };

  if (formParams && method !== 'GET') {
    const body = new URLSearchParams();
    Object.entries(formParams).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        body.append(k, String(v));
      }
    });
    options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    options.body = body.toString();
  }

  const response = await fetch(`${STRIPE_API_BASE}${path}`, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      (data && data.error && data.error.message) ||
      `Stripe request failed with status ${response.status}`;
    const err = new Error(message);
    err.statusCode = response.status >= 400 && response.status < 500 ? 400 : 502;
    throw err;
  }

  return data;
}

module.exports = {
  STRIPE_PUBLISHABLE_FALLBACK,
  PLAN_CATALOG,
  resolvePlan,
  normalizeCountry,
  setCorsHeaders,
  stripeRequest,
};
