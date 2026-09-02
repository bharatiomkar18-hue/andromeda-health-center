import { getStore } from '@netlify/blobs';

const VALID_TYPES = new Set(['1100', 'fraud', 'rm']);
const STORE_NAME = 'andromeda-reports';
const CHUNK_BYTES = 3 * 1024 * 1024;
const MAX_PARTS = 500;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}

export default async (request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const expected = process.env.UPLOAD_PASSWORD;
  if (!expected) return json({ error: 'UPLOAD_PASSWORD is not configured for Functions.' }, 500);
  const supplied = request.headers.get('x-upload-password') || '';
  if (supplied !== expected) return json({ error: 'Wrong upload password.' }, 401);

  const url = new URL(request.url);
  const type = url.searchParams.get('type');
  const action = url.searchParams.get('action') || 'part';
  if (!VALID_TYPES.has(type)) return json({ error: 'Invalid report type.' }, 400);

  try {
    const store = getStore({ name: STORE_NAME, consistency: 'strong' });
    const manifestKey = 'report-' + type + '-manifest';
    const current = await store.get(manifestKey, { type: 'json' });
    const targetSlot = current && current.slot === 'a' ? 'b' : 'a';

    if (action === 'part') {
      const part = Number(url.searchParams.get('part'));
      if (!Number.isInteger(part) || part < 0 || part >= MAX_PARTS) return json({ error: 'Invalid part number.' }, 400);
      const bytes = await request.arrayBuffer();
      if (!bytes.byteLength) return json({ error: 'Empty upload part.' }, 400);
      if (bytes.byteLength > CHUNK_BYTES) return json({ error: 'Upload part is too large.' }, 413);
      await store.set('report-' + type + '-' + targetSlot + '-part-' + part, bytes);
      return json({ ok: true, part, sizeBytes: bytes.byteLength });
    }

    if (action === 'finalize') {
      const parts = Number(url.searchParams.get('parts'));
      const sizeBytes = Number(url.searchParams.get('sizeBytes'));
      const filename = (url.searchParams.get('filename') || 'upload').slice(0, 300);
      if (!Number.isInteger(parts) || parts < 1 || parts > MAX_PARTS) return json({ error: 'Invalid part count.' }, 400);
      if (!Number.isFinite(sizeBytes) || sizeBytes < 1) return json({ error: 'Invalid file size.' }, 400);
      for (let part = 0; part < parts; part += 1) {
        const meta = await store.getMetadata('report-' + type + '-' + targetSlot + '-part-' + part);
        if (!meta) return json({ error: 'Upload is incomplete; part ' + (part + 1) + ' of ' + parts + ' is missing.' }, 409);
      }
      const manifest = { type, filename, uploadedAt: new Date().toISOString(), sizeBytes, parts, chunkBytes: CHUNK_BYTES, slot: targetSlot };
      await store.setJSON(manifestKey, manifest);
      return json({ ok: true, ...manifest });
    }

    return json({ error: 'Invalid upload action.' }, 400);
  } catch (err) {
    console.error('[save-report] failed:', err);
    return json({ error: 'Failed to save report: ' + (err?.message || String(err)) }, 500);
  }
};

export const config = { path: '/.netlify/functions/save-report' };
