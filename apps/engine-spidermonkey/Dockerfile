# syntax=docker/dockerfile:1
ARG SPIDERMONKEY_BASE_IMAGE=pavlof01/spidermonkey:latest

FROM node:20-bookworm-slim AS node-tooling

FROM ${SPIDERMONKEY_BASE_IMAGE} AS deps
WORKDIR /app

# Add Node+NPM into the engine base image for build/dev stages.
COPY --from=node-tooling /usr/local/bin/node /usr/local/bin/node
COPY --from=node-tooling /usr/local/bin/npm /usr/local/bin/npm
COPY --from=node-tooling /usr/local/bin/npx /usr/local/bin/npx
COPY --from=node-tooling /usr/local/lib/node_modules /usr/local/lib/node_modules

COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS dev
ENV NODE_ENV=development
COPY tsconfig.json ./
COPY src ./src
RUN chown -R 1000:1000 /app
USER 1000
EXPOSE 8080
CMD ["npm", "run", "dev"]

FROM deps AS builder
ENV NODE_ENV=production
COPY tsconfig.json ./
COPY src ./src
RUN npm run build
RUN npm prune --omit=dev

FROM ${SPIDERMONKEY_BASE_IMAGE} AS runner
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

