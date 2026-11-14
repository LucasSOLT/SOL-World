export const config = {
  runtime: 'edge',
  regions: ['iad1'],
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
};

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Please use POST.' }),
      {
        status: 405,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload.' }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        }
      );
    }

    const openingNumber = Number(body.openingNumber);
    const endingNumber = Number(body.endingNumber);
    if (
      !Number.isInteger(openingNumber) ||
      openingNumber < 1 ||
      openingNumber > 10 ||
      !Number.isInteger(endingNumber) ||
      endingNumber < 1 ||
      endingNumber > 10
    ) {
      return new Response(
        JSON.stringify({ error: 'Opening and ending numbers must be integers from 1 to 10.' }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        }
      );
    }

    const payload = {
      formType: String(body.formType || 'thought_loop_clearing_reflection'),
      submittedAt: String(body.submittedAt || new Date().toISOString()),
      videoId: body.videoId ?? 2,
      vimeoId: String(body.vimeoId || '1239524014'),
      videoTitle: String(body.videoTitle || 'TAG 1 - Thought Loop Clearing'),
      stationLocation: String(body.stationLocation || '').slice(0, 200),
      openingNumber,
      endingNumber,
      pointDrop: openingNumber - endingNumber,
      distance: Math.abs(openingNumber - endingNumber),
      encouragerTitle: String(body.encouragerTitle || '').slice(0, 240),
      loopAppearance: String(body.loopAppearance || '').slice(0, 4000),
      loopAppearanceVoiceDataUrl: typeof body.loopAppearanceVoiceDataUrl === 'string' ? body.loopAppearanceVoiceDataUrl : '',
      loopAppearanceVoiceDurationSec: Number(body.loopAppearanceVoiceDurationSec || 0),
      bodyLocation: String(body.bodyLocation || '').slice(0, 2000),
      bodyLocationVoiceDataUrl: typeof body.bodyLocationVoiceDataUrl === 'string' ? body.bodyLocationVoiceDataUrl : '',
      bodyLocationVoiceDurationSec: Number(body.bodyLocationVoiceDurationSec || 0),
      userAgent: req.headers.get('user-agent') || '',
    };

    const sheetsUrl = process.env.TLC_GOOGLE_SHEETS_WEBAPP_URL || '';
    const webhookUrl = process.env.TLC_WEBHOOK_URL || '';

    const tasks = [];
    if (sheetsUrl) {
      tasks.push(
        fetch(sheetsUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
          redirect: 'follow',
        })
      );
    }
    if (webhookUrl) {
      tasks.push(
        fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload),
        })
      );
    }

    if (tasks.length > 0) {
      await Promise.allSettled(tasks);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        forwardedToSheets: Boolean(sheetsUrl),
        forwardedToWebhook: Boolean(webhookUrl),
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Failed to process reflection submission.' }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  }
}
