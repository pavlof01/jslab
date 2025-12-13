# syntax=docker/dockerfile:1
FROM node:20-bookworm-slim AS deps
WORKDIR /app/frontend
COPY apps/frontend/src/package.json apps/frontend/src/package-lock.json ./
RUN npm ci

FROM node:20-bookworm-slim AS builder
WORKDIR /app/frontend
COPY --from=deps /app/frontend/node_modules ./node_modules
COPY apps/frontend/src ./
RUN npm run build
RUN npm prune --omit=dev

FROM node:20-bookworm-slim AS runner
WORKDIR /app/frontend
ENV NODE_ENV=production
RUN groupadd -r app && useradd -r -g app app
COPY --from=builder /app/frontend/public ./public
COPY --from=builder /app/frontend/.next ./.next
COPY --from=builder /app/frontend/package.json ./package.json
COPY --from=builder /app/frontend/node_modules ./node_modules
USER app
EXPOSE 3000
CMD ["npm", "run", "start"]
