# syntax=docker/dockerfile:1

ARG V8_BASE_IMAGE=pavlof01/v8-d8:latest
ARG TARGETPLATFORM

########################
# V8 binary stage (force correct arch)
########################
FROM --platform=$TARGETPLATFORM ${V8_BASE_IMAGE} AS v8-binary

########################
# deps
########################
FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

########################
# dev
########################
FROM deps AS dev
ENV NODE_ENV=development

COPY tsconfig.json ./
COPY src ./src

# Keep V8 layout identical to base image
RUN mkdir -p /opt/v8
COPY --from=v8-binary /opt/v8/d8 /opt/v8/d8
COPY --from=v8-binary /opt/v8/snapshot_blob.bin /opt/v8/snapshot_blob.bin

# Make it callable from PATH
RUN ln -sf /opt/v8/d8 /usr/local/bin/d8
RUN ln -sf /opt/v8/snapshot_blob.bin /usr/local/bin/snapshot_blob.bin

# Sanity checks (no 'file' package needed)
RUN set -eux; \
    ls -la /opt/v8/d8 /opt/v8/snapshot_blob.bin; \
    /opt/v8/d8 -e 'print("d8 smoke ok")' >/dev/null

RUN chown -R 1000:1000 /app
USER 1000

EXPOSE 8080
CMD ["npm", "run", "dev"]

########################
# builder
########################
FROM deps AS builder
ENV NODE_ENV=production

COPY tsconfig.json ./
COPY src ./src

RUN npm run build
RUN npm prune --omit=dev

########################
# runner (production)
########################
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN groupadd -r app && useradd -r -g app app

RUN mkdir -p /opt/v8
COPY --from=v8-binary /opt/v8/d8 /opt/v8/d8
COPY --from=v8-binary /opt/v8/snapshot_blob.bin /opt/v8/snapshot_blob.bin
RUN ln -sf /opt/v8/d8 /usr/local/bin/d8
RUN ln -sf /opt/v8/snapshot_blob.bin /usr/local/bin/snapshot_blob.bin

# Ensure readable for non-root
RUN chmod 755 /opt/v8/d8 && chmod 644 /opt/v8/snapshot_blob.bin

# Sanity check
RUN set -eux; \
    ls -la /opt/v8/d8 /opt/v8/snapshot_blob.bin; \
    /opt/v8/d8 -e 'print("d8 smoke ok")' >/dev/null

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

USER app
EXPOSE 8080
CMD ["node", "dist/server.js"]
