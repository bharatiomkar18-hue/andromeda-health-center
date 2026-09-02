# Andromeda Health Center

FM / MM / LM breach-monitoring dashboard with shared site-wide report storage in Netlify Blobs.

## Deployment

- Publish directory: `public`
- Functions directory: `netlify/functions`
- Required Netlify environment variable: `UPLOAD_PASSWORD` (Functions scope)
- Netlify automatically supplies the Project ID and Blob access token to Functions, so no personal access token is stored in this repository.

Uploads are split into 3 MB parts before passing through Netlify Functions. This keeps each binary request below the platform's effective payload limit. A two-slot manifest switch ensures viewers keep seeing the previous complete report until the new upload is fully stored.

Only the upload path requires the password. Reading the latest shared reports is open to dashboard viewers.
