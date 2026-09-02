// netlify/functions/report-status.js
//
// GET /.netlify/functions/report-status
// Returns metadata only (no file content) for whichever of the three report types
// have been uploaded so far - lets the frontend show "shared data last updated by X
// at Y" without downloading the full files just to check if they exist.

import { getStore } from '@netlify/blobs';

const TYPES = ['1100', 'fraud', 'rm'];

export default async (request, context) => {
  try {
    const store = getStore('andromeda-reports');
    const status = {};
    for (const type of TYPES) {
      const meta = await store.getMetadata(`report-${type}`);
      status[type] = meta ? meta.metadata : null;
    }
    return new Response(JSON.stringify(status), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
    });
  } catch (err) {
    console.error('[report-status] failed:', err);
    return new Response(JSON.stringify({ error: 'Failed to check report status: ' + err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const config = {
  path: '/.netlify/functions/report-status',
};
