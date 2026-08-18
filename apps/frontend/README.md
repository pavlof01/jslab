# Frontend (Next.js UI)

This directory holds only the Dockerfile. The application itself — including its
`package.json` — lives one level down in [`src/`](src/); see
[`src/README.md`](src/README.md) for the source layout and the dev workflow.

- Build image (context is this directory): `docker build -t jslab-frontend apps/frontend`
- Run locally: `docker run --rm -p 3000:3000 jslab-frontend`
- Env: provide `.env.local` as needed via `--env-file` when running.
  `JSLAB_BACKEND_URL` points the server-side route handlers at the api gateway;
  `TRACE_SERVICE_URL` at the trace service.
- The image expects an existing `src/package-lock.json` for a reproducible `npm ci`.
- Targets: `dev` (hot-reload, used by Compose and Skaffold) and the default
  production target used by CI.
