# syntax=docker/dockerfile:1
ARG HERMES_BASE_IMAGE=pavlof01/hermes:latest
FROM ${HERMES_BASE_IMAGE} AS hermes-binary

FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS dev
ENV NODE_ENV=development
COPY tsconfig.json ./
COPY src ./src
COPY --from=hermes-binary /opt/hermes/bin/hermes /usr/local/bin/hermes
COPY --from=hermes-binary /opt/hermes/bin/hermesc /usr/local/bin/hermesc
COPY --from=hermes-binary /opt/hermes/bin/hbcdump /usr/local/bin/hbcdump
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
