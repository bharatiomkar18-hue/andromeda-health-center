import { getStore } from '@netlify/blobs';

const VALID_TYPES = new Set(['1100', 'fraud', 'rm']);
const STORE_NAME = 'andromeda-reports';

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}

export default async (request) => {
  const url = new URL(request.url);
  const type = url.searchParams.get('type');
  const part = Number(url.searchParams.get('part'));
  if (!VALID_TYPES.has(type)) return json({ error: 'Invalid report type.' }, 400);
  if (!Number.isInteger(part) || part < 0) return json({ error: 'Invalid part number.' }, 400);

  try {
    const store = getStore({ name: STORE_NAME, consistency: 'strong' });
    const manifest = await store.get('report-' + type + '-manifest', { type: 'json' });
    if (!manifest) return json({ error: 'not_found' }, 404);
    if (part >= manifest.parts) return json({ error: 'Part not found.' }, 404);
    const result = await store.getWithMetadata('report-' + type + '-' + manifest.slot + '-part-' + part, { type: 'stream' });
    if (!result) return json({ error: 'Part not found.' }, 404);
    return new Response(result.data, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-Report-Filename': manifest.filename || '',
        'X-Report-Uploaded-At': manifest.uploadedAt || '',
        'X-Report-Part': String(part),
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[get-report] failed:', err);
    return json({ error: 'Failed to retrieve report: ' + (err?.message || String(err)) }, 500);
  }
};

export const config = { path: '/.netlify/functions/get-report' };
