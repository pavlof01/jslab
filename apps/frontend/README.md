# Frontend (Next.js UI)

- Source lives in `apps/frontend/src` (UI code unchanged).
- Build image: `docker build -f apps/frontend/Dockerfile -t jslab-frontend .`
- Run locally: `docker run --rm -p 3000:3000 jslab-frontend`
- Env: provide `.env.local` as needed via `--env-file` when running.
- Image expects existing `package-lock.json` for reproducible `npm ci`.
