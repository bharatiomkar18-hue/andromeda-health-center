// netlify/functions/get-report.js
//
// GET /.netlify/functions/get-report?type=1100|fraud|rm
// Returns the raw bytes of the most recently saved report of that type, streamed
// directly from Blobs storage - this avoids loading the entire file into the
// function's memory before responding, which matters for the ~140MB 1100 report.
//
// Returns 404 if nothing has been uploaded yet for that type (a fresh site, or a
// report type nobody has uploaded). The frontend treats 404 as "nothing shared yet -
// show the normal upload prompt" rather than an error.

import { getStore } from '@netlify/blobs';

const VALID_TYPES = new Set(['1100', 'fraud', 'rm']);

export default async (request, context) => {
  const url = new URL(request.url);
  const type = url.searchParams.get('type');

  if (!VALID_TYPES.has(type)) {
    return new Response(JSON.stringify({ error: `Invalid or missing "type" query param. Must be one of: ${[...VALID_TYPES].join(', ')}` }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const store = getStore('andromeda-reports');
    const result = await store.getWithMetadata(`report-${type}`, { type: 'stream' });

    if (!result) {
      return new Response(JSON.stringify({ error: 'not_found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const meta = result.metadata || {};
    return new Response(result.data, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-Report-Filename': meta.filename || '',
        'X-Report-Uploaded-At': meta.uploadedAt || '',
        'X-Report-Size-Bytes': String(meta.sizeBytes || ''),
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err) {
    console.error('[get-report] failed:', err);
    return new Response(JSON.stringify({ error: 'Failed to retrieve report: ' + err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const config = {
  path: '/.netlify/functions/get-report',
};
