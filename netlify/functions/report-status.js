import { getStore } from '@netlify/blobs';

const TYPES = ['1100', 'fraud', 'rm'];

export default async () => {
  try {
    const store = getStore({ name: 'andromeda-reports', consistency: 'strong' });
    const status = {};
    for (const type of TYPES) status[type] = await store.get('report-' + type + '-manifest', { type: 'json' });
    return new Response(JSON.stringify(status), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[report-status] failed:', err);
    return new Response(JSON.stringify({ error: 'Failed to check report status: ' + (err?.message || String(err)) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const config = { path: '/.netlify/functions/report-status' };
