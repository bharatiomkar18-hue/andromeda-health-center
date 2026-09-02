// netlify/functions/save-report.js
//
// POST /.netlify/functions/save-report?type=1100|fraud|rm
// Body: the raw file bytes (CSV text or XLSX binary), sent as-is (no JSON wrapping,
// no base64) to avoid inflating large files. Metadata travels in query params/headers.
//
// Stores the file under a fixed key per report type in the "andromeda-reports" Blobs
// store, so every visitor to the site sees the same, most-recently-uploaded data -
// this is the "stored & visible to everyone" requirement. Overwrites any previous
// upload of the same type (last upload wins), matching the dashboard's existing
// "re-upload replaces" behavior for RM Mapping.

import { getStore } from '@netlify/blobs';

const VALID_TYPES = new Set(['1100', 'fraud', 'rm']);

export default async (request, context) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get('type');
  const filename = url.searchParams.get('filename') || 'upload';

  if (!VALID_TYPES.has(type)) {
    return new Response(JSON.stringify({ error: `Invalid or missing "type" query param. Must be one of: ${[...VALID_TYPES].join(', ')}` }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const bytes = await request.arrayBuffer();
    if (!bytes || bytes.byteLength === 0) {
      return new Response(JSON.stringify({ error: 'Empty request body - no file data received.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const store = getStore('andromeda-reports');
    await store.set(`report-${type}`, bytes, {
      metadata: {
        filename,
        uploadedAt: new Date().toISOString(),
        sizeBytes: bytes.byteLength,
      },
    });

    return new Response(JSON.stringify({ ok: true, type, filename, sizeBytes: bytes.byteLength }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[save-report] failed:', err);
    return new Response(JSON.stringify({ error: 'Failed to save report: ' + err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const config = {
  path: '/.netlify/functions/save-report',
};
