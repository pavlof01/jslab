# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS deps
WORKDIR /app
# Shared engine runtime. install-links (apps/api/.npmrc) copies it into
# node_modules as a real dir — so the multi-stage runner COPY of node_modules
# stays intact — but that copy only carries what is already on disk, so dist has
# to be built here, before the app install.
COPY packages/engine-runtime /packages/engine-runtime
RUN cd /packages/engine-runtime && npm ci && npm run build
COPY apps/api/package.json apps/api/package-lock.json apps/api/.npmrc ./
RUN npm ci

FROM deps AS dev
ENV NODE_ENV=development
COPY apps/api/tsconfig.json ./
COPY apps/api/src ./src
RUN chown -R 1000:1000 /app
USER 1000
EXPOSE 8080
CMD ["npm", "run", "dev"]

FROM deps AS builder
ENV NODE_ENV=production
COPY apps/api/tsconfig.json ./
COPY apps/api/src ./src
RUN npm run build
RUN npm prune --omit=dev

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN groupadd -r app && useradd -r -g app app
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
USER app
EXPOSE 8080
CMD ["node", "dist/server.js"]
