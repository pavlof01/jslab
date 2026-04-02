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

RUN chown -R 1000:1000 /app
USER 1000

EXPOSE 8080
CMD ["npm", "run", "dev"]

########################
# prod
########################
FROM node:20-bookworm-slim AS prod
ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY tsconfig.json config.ts ./
COPY src ./src

RUN chown -R 1000:1000 /app
USER 1000

EXPOSE 8080
CMD ["npm", "start"]
