# syntax=docker/dockerfile:1
FROM node:20-bookworm-slim AS builder
WORKDIR /app
ENV NODE_ENV=production
COPY apps/api/package.json apps/api/tsconfig.json ./
COPY apps/api/src ./src
RUN npm install --include=dev
RUN npm run build
RUN npm prune --omit=dev

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN groupadd -r app && useradd -r -g app app
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
USER app
EXPOSE 8080
CMD ["node", "dist/server.js"]
