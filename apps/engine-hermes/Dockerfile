# syntax=docker/dockerfile:1
ARG HERMES_BASE_IMAGE=pavlof01/hermes:latest
FROM ${HERMES_BASE_IMAGE} AS hermes-binary

FROM node:20-bookworm-slim AS builder
WORKDIR /app
ENV NODE_ENV=production
COPY apps/engine-hermes/package.json apps/engine-hermes/tsconfig.json ./
COPY apps/engine-hermes/src ./src
RUN npm install --include=dev
RUN npm run build
RUN npm prune --omit=dev

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN groupadd -r app && useradd -r -g app app
COPY --from=hermes-binary /opt/hermes/bin/hermes /usr/local/bin/hermes
COPY --from=hermes-binary /opt/hermes/bin/hermesc /usr/local/bin/hermesc
COPY --from=hermes-binary /opt/hermes/bin/hbcdump /usr/local/bin/hbcdump
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
USER app
EXPOSE 8080
CMD ["node", "dist/server.js"]
