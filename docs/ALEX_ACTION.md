# ONE ACTION

Add the same two secrets in two places.

## GitHub Actions secrets
https://github.com/alexandercurtis2024-create/roof-measurement-engine/settings/secrets/actions

- APP_BASE_URL = https://roof-measurement-engine.vercel.app
- WORKER_SECRET = a long random string

## Vercel env (Production + Preview)

- WORKER_SECRET = the exact same string
- GITHUB_DISPATCH_TOKEN = GitHub PAT with repo scope

Until then jobs stay queued. Footprint + manual pitch still works.
