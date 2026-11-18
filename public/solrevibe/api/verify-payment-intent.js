const { setCorsHeaders, stripeRequest } = require('./_stripe');

module.exports = async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const paymentIntentId = String(
      (req.query && (req.query.payment_intent || req.query.paymentIntentId)) ||
        body.paymentIntentId ||
        body.payment_intent ||
        ''
    ).trim();

    if (!/^pi_[a-zA-Z0-9]+$/.test(paymentIntentId)) {
      return res.status(400).json({ error: 'Invalid PaymentIntent identifier.' });
    }

    const intent = await stripeRequest('GET', `/payment_intents/${paymentIntentId}`);

    return res.status(200).json({
      id: intent.id,
      status: intent.status,
      amount: intent.amount,
      currency: intent.currency,
      receipt_email: intent.receipt_email,
      metadata: intent.metadata || {},
      shipping: intent.shipping || null,
    });
  } catch (err) {
    console.error('[verify-payment-intent] Error:', err.message);
    return res.status(err.statusCode || 500).json({
      error: err.message || 'Unable to verify payment status.',
    });
  }
};
