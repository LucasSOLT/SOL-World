export const config = {
  runtime: 'edge',
  regions: ['iad1'],
};

export default async function handler() {
  return new Response(
    JSON.stringify({
      error: 'Authorize.net gateway has been retired. Use /api/create-payment-intent for Stripe payments.',
    }),
    {
      status: 410,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    }
  );
}
