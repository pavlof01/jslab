# syntax=docker/dockerfile:1
ARG V8_BASE_IMAGE=pavlof01/v8-d8:latest
FROM ${V8_BASE_IMAGE} AS v8-binary

FROM node:20-bookworm-slim AS builder
WORKDIR /app
ENV NODE_ENV=production
COPY apps/engine-v8/package.json apps/engine-v8/tsconfig.json ./
COPY apps/engine-v8/src ./src
RUN npm install --include=dev
RUN npm run build
RUN npm prune --omit=dev

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN groupadd -r app && useradd -r -g app app
COPY --from=v8-binary /opt/v8/d8 /usr/local/bin/d8
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
USER app
EXPOSE 8080
CMD ["node", "dist/server.js"]
