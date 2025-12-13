# syntax=docker/dockerfile:1
FROM node:20-bookworm-slim AS deps
WORKDIR /app/js-bytecode-web
COPY js-bytecode-web/package.json js-bytecode-web/package-lock.json ./
RUN npm ci

FROM node:20-bookworm-slim AS builder
WORKDIR /app/js-bytecode-web
COPY --from=deps /app/js-bytecode-web/node_modules ./node_modules
COPY js-bytecode-web ./
RUN npm run build
RUN npm prune --omit=dev

FROM node:20-bookworm-slim AS runner
WORKDIR /app/js-bytecode-web
ENV NODE_ENV=production
RUN groupadd -r app && useradd -r -g app app
COPY --from=builder /app/js-bytecode-web/public ./public
COPY --from=builder /app/js-bytecode-web/.next ./.next
COPY --from=builder /app/js-bytecode-web/package.json ./package.json
COPY --from=builder /app/js-bytecode-web/node_modules ./node_modules
USER app
EXPOSE 3000
CMD ["npm", "run", "start"]
