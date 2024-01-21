#################################################################
# Base image
#################################################################
FROM node:21-alpine3.17 as worker

RUN apk --no-cache add \
    bash \
    curl \
    jq \
    docker

###############################################################################
# justfile for running commands, you will mostly interact with just https://github.com/casey/just
###############################################################################
RUN apk add --no-cache -X https://dl-cdn.alpinelinux.org/alpine/edge/community \
    just
# alias "j" to just, it's just right there index finger
RUN echo -e '#!/bin/bash\njust "$@"' > /usr/bin/j && \
    chmod +x /usr/bin/j
ENV JUST_SUPPRESS_DOTENV_LOAD_WARNING=1

###############################################################################
# watchexec for fast development reloading
###############################################################################
RUN apk add --no-cache -X https://dl-cdn.alpinelinux.org/alpine/edge/community \
    watchexec

RUN npm install -g npm@8.4.1

#################################################################
# code: shared: setup
#################################################################
WORKDIR /app/shared
COPY shared/package.json ./package.json
COPY shared/package-lock.json ./package-lock.json

# https://github.com/nodejs/docker-node/issues/384#issuecomment-305208112
RUN apk --no-cache add --virtual native-deps \
  g++ gcc libgcc libstdc++ linux-headers make python3 libffi-dev openssl-dev && \
  npm install --quiet node-gyp -g &&\
  npm install && \
  apk del native-deps

#################################################################
# code: monorepo shared module setup
#################################################################
WORKDIR /app
COPY package.json ./package.json
COPY tsconfig.workspace.json ./tsconfig.workspace.json

#################################################################
# code: worker: setup
#################################################################
WORKDIR /app/worker
COPY worker/package-lock.json ./package-lock.json
COPY worker/package.json ./package.json

# WORKDIR /app
# https://github.com/nodejs/docker-node/issues/384#issuecomment-305208112
RUN apk --no-cache add --virtual native-deps \
  g++ gcc libgcc libstdc++ linux-headers make python3 libffi-dev openssl-dev && \
  npm install --quiet node-gyp -g &&\
  npm install && \
  apk del native-deps

#################################################################
# code: shared: build
#################################################################
WORKDIR /app/shared
COPY shared/justfile ./justfile
COPY shared/tsconfig.json ./tsconfig.json
COPY shared/tsconfig-base.json ./tsconfig-base.json

#################################################################
# code: root npm install
#################################################################

WORKDIR /app/shared

COPY shared/src ./src

RUN just build

# WORKDIR /app
# https://github.com/nodejs/docker-node/issues/384#issuecomment-305208112
# RUN apk --no-cache add --virtual native-deps \
#   g++ gcc libgcc libstdc++ linux-headers make python libffi-dev openssl-dev && \
#   npm install --quiet node-gyp -g &&\
#   npm install && \
#   apk del native-deps


#################################################################
# code: root npm install
#################################################################



#################################################################
# code: worker: build
#################################################################

WORKDIR /app/worker
COPY worker/justfile ./justfile
COPY worker/tsconfig.json ./tsconfig.json
COPY worker/src ./src
COPY worker/bin ./bin
ARG DOCKER_TAG=local
ENV DOCKER_TAG=$DOCKER_TAG
RUN just build

ENTRYPOINT ["node", "--experimental-specifier-resolution=node", "./dist/bin/index.js"]
