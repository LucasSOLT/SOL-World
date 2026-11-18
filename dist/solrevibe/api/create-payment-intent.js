const { resolvePlan, normalizeCountry, setCorsHeaders, stripeRequest } = require('./_stripe');

module.exports = async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const {
      plan,
      fullName = '',
      email = '',
      phone = '',
      govIdLast4 = '',
      shipping = {},
      billing = {},
      sameAsShipping = true,
    } = body;

    const cleanName = String(fullName).trim();
    const cleanEmail = String(email).trim();
    const cleanPhone = String(phone).trim();
    const cleanLine1 = String(shipping.line1 || '').trim();
    const cleanLine2 = String(shipping.line2 || '').trim();
    const cleanCity = String(shipping.city || '').trim();
    const cleanState = String(shipping.state || '').trim();
    const cleanPostal = String(shipping.postalCode || '').trim();
    const cleanCountry = normalizeCountry(shipping.country);

    if (!cleanName || !cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ error: 'Please enter a valid full name and email address.' });
    }

    if (!cleanLine1 || !cleanCity || !cleanState || !cleanPostal) {
      return res.status(400).json({ error: 'Please complete all required shipping address fields.' });
    }

    const planCfg = resolvePlan(plan);
    const sanitizedIdLast4 = String(govIdLast4 || '').replace(/[^a-zA-Z0-9]/g, '').slice(-4);

    const billingSummary = sameAsShipping
      ? `${cleanLine1}${cleanLine2 ? ', ' + cleanLine2 : ''}, ${cleanCity}, ${cleanState} ${cleanPostal}, ${cleanCountry}`
      : [
          billing.line1,
          billing.city,
          `${billing.state || ''} ${billing.postalCode || ''}`.trim(),
        ]
          .filter(Boolean)
          .join(', ');

    const stripeParams = {
      amount: planCfg.amountCents,
      currency: 'usd',
      'automatic_payment_methods[enabled]': 'true',
      description: `${planCfg.name} — ${planCfg.description}`,
      receipt_email: cleanEmail,
      'shipping[name]': cleanName,
      'shipping[phone]': cleanPhone,
      'shipping[address][line1]': cleanLine1,
      'shipping[address][line2]': cleanLine2,
      'shipping[address][city]': cleanCity,
      'shipping[address][state]': cleanState,
      'shipping[address][postal_code]': cleanPostal,
      'shipping[address][country]': cleanCountry,
      'metadata[plan]': planCfg.key,
      'metadata[package_name]': planCfg.name,
      'metadata[customer_name]': cleanName,
      'metadata[customer_email]': cleanEmail,
      'metadata[customer_phone]': cleanPhone,
      'metadata[warranty_id_last4]': sanitizedIdLast4,
      'metadata[billing_same_as_shipping]': String(Boolean(sameAsShipping)),
      'metadata[billing_address]': billingSummary.slice(0, 490),
      'metadata[source]': 'solrevibe.com',
    };

    const intent = await stripeRequest('POST', '/payment_intents', stripeParams);

    return res.status(200).json({
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      amountCents: planCfg.amountCents,
      planKey: planCfg.key,
      planName: planCfg.name,
    });
  } catch (err) {
    console.error('[create-payment-intent] Error:', err.message);
    return res.status(err.statusCode || 500).json({
      error: err.message || 'Unable to initialize Stripe payment.',
    });
  }
};
