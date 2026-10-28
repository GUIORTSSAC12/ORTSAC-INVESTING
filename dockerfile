# syntax = docker/dockerfile:1
ARG NODE_VERSION=22.21.1
FROM node:${NODE_VERSION}-slim AS base

WORKDIR /app
ENV NODE_ENV="production"

FROM base AS build
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3

# Copia o repositório inteiro para o Docker respeitar o monorepo workspace
COPY . .

# Instala as dependências na raiz ou direto na pasta da API
RUN npm install --include=dev

# Entra na pasta da API, faz o build e limpa os devDependencies
WORKDIR /app/artifacts/api-server
RUN npm run build
RUN npm prune --omit=dev

FROM base
WORKDIR /app
COPY --from=build /app/artifacts/api-server /app

EXPOSE 5000
CMD [ "npm", "run", "start" ]
