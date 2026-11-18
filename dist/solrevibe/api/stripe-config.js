const { STRIPE_PUBLISHABLE_FALLBACK, setCorsHeaders } = require('./_stripe');

module.exports = async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY || STRIPE_PUBLISHABLE_FALLBACK;
  return res.status(200).json({ publishableKey });
};
