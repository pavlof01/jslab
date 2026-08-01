# syntax=docker/dockerfile:1
ARG HERMES_BASE_IMAGE=pavlof01/hermes:latest

FROM node:20-bookworm-slim AS node-tooling

FROM ${HERMES_BASE_IMAGE} AS deps
WORKDIR /app
ENTRYPOINT []

# Add Node+NPM into the engine base image for build/dev stages.
COPY --from=node-tooling /usr/local/bin/node /usr/local/bin/node
COPY --from=node-tooling /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -sf /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
 && ln -sf /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx

# Shared engine runtime. install-links (apps/engine-hermes/.npmrc) copies it into
# node_modules as a real dir — so the multi-stage runner COPY of node_modules
# stays intact — but that copy only carries what is already on disk, so dist has
# to be built here, before the app install.
COPY packages/engine-runtime /packages/engine-runtime
RUN cd /packages/engine-runtime && npm ci && npm run build
COPY apps/engine-hermes/package.json apps/engine-hermes/package-lock.json apps/engine-hermes/.npmrc ./
RUN npm ci

FROM deps AS dev
ENV NODE_ENV=development
COPY apps/engine-hermes/tsconfig.json ./
COPY apps/engine-hermes/src ./src
RUN chown -R 1000:1000 /app
USER 1000
EXPOSE 8080
CMD ["npm", "run", "dev"]

FROM deps AS builder
ENV NODE_ENV=production
COPY apps/engine-hermes/tsconfig.json ./
COPY apps/engine-hermes/src ./src
RUN npm run build
RUN npm prune --omit=dev

FROM ${HERMES_BASE_IMAGE} AS runner
WORKDIR /app
ENV NODE_ENV=production

# Only Node is needed at runtime (no npm).
COPY --from=node-tooling /usr/local/bin/node /usr/local/bin/node

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

RUN chown -R 1000:1000 /app
USER 1000
EXPOSE 8080
ENTRYPOINT ["node", "dist/server.js"]
