# syntax = docker/dockerfile:1
ARG NODE_VERSION=22.21.1
FROM node:${NODE_VERSION}-slim AS base

WORKDIR /app
ENV NODE_ENV="production"

FROM base AS build
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3

# Copia o repositório inteiro para o Docker resolver o workspace do monorepo
COPY . .

# Instala as dependências usando a estrutura completa
RUN npm install --include=dev

# Entra na pasta da API, compila e limpa os devDependencies
WORKDIR /app/artifacts/api-server
RUN npm run build
RUN npm prune --omit=dev

FROM base
WORKDIR /app
COPY --from=build /app/artifacts/api-server /app

EXPOSE 5000
CMD [ "npm", "run", "start" ]
