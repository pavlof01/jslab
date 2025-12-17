# syntax=docker/dockerfile:1
FROM node:20-bookworm-slim AS deps
WORKDIR /app/frontend
COPY src/package.json src/package-lock.json ./
RUN npm ci

FROM deps AS dev
ENV NODE_ENV=development
COPY src ./
RUN chown -R 1000:1000 /app/frontend
USER 1000
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0", "-p", "3000"]

FROM deps AS builder
ENV NODE_ENV=production
COPY src ./
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
