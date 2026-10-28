# syntax = docker/dockerfile:1
ARG NODE_VERSION=22.21.1
FROM node:${NODE_VERSION}-slim AS base

WORKDIR /app
ENV NODE_ENV="production"

FROM base AS build
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3

# Copia o package.json de dentro da pasta do monorepo usando a raiz como base
COPY artifacts/api-server/package.json ./
RUN npm install --include=dev

# Copia todo o código da API para dentro do container
COPY artifacts/api-server/ ./
RUN npm run build
RUN npm prune --omit=dev

FROM base
COPY --from=build /app /app
EXPOSE 5000
CMD [ "npm", "run", "start" ]
