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
FROM node:22-bookworm-slim AS deps
WORKDIR /app
# Shared engine runtime. install-links (apps/engine-v8/.npmrc) copies it into
# node_modules as a real dir — so the multi-stage runner COPY of node_modules
# stays intact — but that copy only carries what is already on disk, so dist has
# to be built here, before the app install.
COPY packages/engine-runtime /packages/engine-runtime
RUN cd /packages/engine-runtime && npm ci && npm run build
COPY apps/engine-v8/package.json apps/engine-v8/package-lock.json apps/engine-v8/.npmrc ./
RUN npm ci

########################
# dev
########################
FROM deps AS dev
ENV NODE_ENV=development

COPY apps/engine-v8/tsconfig.json ./
COPY apps/engine-v8/src ./src

# Keep V8 layout identical to base image
RUN mkdir -p /opt/v8
COPY --from=v8-binary /opt/v8/ /opt/v8/

# Make it callable from PATH
RUN ln -sf /opt/v8/d8 /usr/local/bin/d8
RUN if [ -f /opt/v8/snapshot_blob.bin ]; then ln -sf /opt/v8/snapshot_blob.bin /usr/local/bin/snapshot_blob.bin; fi

# Sanity checks (no 'file' package needed)
RUN set -eux; \
    ls -la /opt/v8/d8; \
    [ ! -f /opt/v8/snapshot_blob.bin ] || ls -la /opt/v8/snapshot_blob.bin; \
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

COPY apps/engine-v8/tsconfig.json ./
COPY apps/engine-v8/src ./src

RUN npm run build
RUN npm prune --omit=dev

########################
# runner (production)
########################
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN groupadd -r app && useradd -r -g app app

RUN mkdir -p /opt/v8
COPY --from=v8-binary /opt/v8/ /opt/v8/
RUN ln -sf /opt/v8/d8 /usr/local/bin/d8
RUN if [ -f /opt/v8/snapshot_blob.bin ]; then ln -sf /opt/v8/snapshot_blob.bin /usr/local/bin/snapshot_blob.bin; fi

# Ensure readable for non-root
RUN chmod 755 /opt/v8/d8 && if [ -f /opt/v8/snapshot_blob.bin ]; then chmod 644 /opt/v8/snapshot_blob.bin; fi

# Sanity check
RUN set -eux; \
    ls -la /opt/v8/d8; \
    [ ! -f /opt/v8/snapshot_blob.bin ] || ls -la /opt/v8/snapshot_blob.bin; \
    /opt/v8/d8 -e 'print("d8 smoke ok")' >/dev/null

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

USER app
EXPOSE 8080
CMD ["node", "dist/server.js"]
