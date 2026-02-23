# syntax=docker/dockerfile:1

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

COPY tsconfig.json config.ts ./
COPY src ./src
COPY lib ./lib

RUN chown -R 1000:1000 /app
USER 1000

EXPOSE 8080
CMD ["npm", "run", "dev"]

########################
# builder
########################
FROM deps AS builder
COPY tsconfig.json config.ts ./
COPY src ./src
COPY lib ./lib
RUN npm run build

########################
# prod
########################
FROM node:20-bookworm-slim AS prod
ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

RUN chown -R 1000:1000 /app
USER 1000

EXPOSE 8080
CMD ["npm", "start"]
