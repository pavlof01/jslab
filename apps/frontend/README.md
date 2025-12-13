# Frontend (Next.js UI)

- Source lives in `js-bytecode-web` (untouched UI).
- Build image: `docker build -f apps/frontend/Dockerfile -t jslab-frontend .`
- Run locally: `docker run --rm -p 3000:3000 jslab-frontend`
- Env: provide `.env.local` as needed via `--env-file` when running.
- Image expects existing `package-lock.json` for reproducible `npm ci`.
