# Andromeda Health Center — Network Control Dashboard

FM / MM / LM breach monitoring dashboard for last-mile delivery operations, with
shared, site-wide data storage via Netlify Blobs.

## How it works

- **All computation happens in the browser.** The dashboard (`public/index.html`) is
  a single self-contained file: CSV/XLSX parsing, breach attribution, Valid/Invalid
  LM% fraud classification, and RM mapping all run client-side. Nothing about the
  actual business logic runs on a server.
- **Shared storage is a thin layer on top.** Three Netlify Functions
  (`netlify/functions/`) let the dashboard save an uploaded file's raw bytes to
  [Netlify Blobs](https://docs.netlify.com/blobs/overview/) and fetch them back.
  This means: whoever uploads the 1100 Report / Fraud Attempt Report / RM Mapping
  file, every other visitor to the site sees that same data automatically on their
  next visit — no re-uploading required.
  - `save-report.js` — `POST /.netlify/functions/save-report?type=1100|fraud|rm` —
    stores the raw file bytes under a fixed key per type (last upload wins).
  - `get-report.js` — `GET /.netlify/functions/get-report?type=1100|fraud|rm` —
    streams the stored bytes back (404 if nothing uploaded yet for that type).
  - `report-status.js` — `GET /.netlify/functions/report-status` — lightweight
    metadata-only check (filename, upload time) for all three types, without
    downloading the full files.
- **Uploading stays password-gated**; viewing shared data does not. Anyone who
  visits the site sees the last-uploaded data immediately; only someone who knows
  the upload password can overwrite it with a new file.

## Data & calculation logic

Every calculation (breach cascade, lane cutoff table, AOT/DOT/ROT/DSR/FDDS,
Valid/Invalid LM% fraud classification, RM mapping matching) is documented in full
inside the app itself — click the **Rationale** tab.

## Known limitations / things to verify after first deploy

- The 1100 Report can be 100MB+ in real usage. The client-side parser has been
  tested against a real 143MB / 171,000-row file and completes in a few seconds
  with modest memory use. The Netlify Blobs save/fetch path for a file this large
  has **not** been tested end-to-end against a live Netlify deployment — verify a
  full upload/reload cycle works after the first deploy, and watch Netlify's
  function logs if it doesn't.
- Netlify Functions have platform-level request/response size limits that can
  change between plans. If a very large 1100 Report upload fails, check the
  function logs for a size-limit error specifically.
- RM Mapping coverage depends entirely on how many hubs are listed in the
  uploaded `RM_Mapping.xlsx` — a low "RM coverage %" on the dashboard usually means
  the mapping file is incomplete, not a bug in the matching logic.

## Local development

```
npm install
netlify dev
```

Netlify Blobs works automatically when running via `netlify dev` (linked to a
Netlify site) or once deployed — it does not work with a plain static file server,
since the functions need Netlify's runtime.
