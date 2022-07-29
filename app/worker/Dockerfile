#################################################################
# Base image
#################################################################
FROM node:15.11.0-alpine3.10 as worker

RUN apk --no-cache add \
    bash \
    curl \
    jq \
    docker

###############################################################################
# justfile for running commands, you will mostly interact with just https://github.com/casey/just
###############################################################################
RUN VERSION=1.0.0 ; \
    SHA256SUM=342f8582d929b9212ffcbe9f7749e12908053cf215eb8d4a965c47ea2f24b0a4 ; \
    curl -L -O https://github.com/casey/just/releases/download/$VERSION/just-$VERSION-x86_64-unknown-linux-musl.tar.gz && \
    (echo "$SHA256SUM  just-$VERSION-x86_64-unknown-linux-musl.tar.gz" | sha256sum -c -) && \
    mkdir -p /usr/local/bin && \
    tar -xzf just-$VERSION-x86_64-unknown-linux-musl.tar.gz -C /usr/local/bin just && \
    rm -rf just-$VERSION-x86_64-unknown-linux-musl.tar.gz
# Unify the just binary location on host and container platforms because otherwise the shebang doesn't work properly due to no string token parsing (it gets one giant string)
ENV PATH $PATH:/usr/local/bin
# alias "j" to just, it's just right there index finger
RUN echo -e '#!/bin/bash\njust "$@"' > /usr/bin/j && \
    chmod +x /usr/bin/j

# watchexec for live reloading in development https://github.com/watchexec/watchexec
RUN VERSION=1.14.1 ; \
    SHA256SUM=34126cfe93c9c723fbba413ca68b3fd6189bd16bfda48ebaa9cab56e5529d825 ; \
    curl -L -O https://github.com/watchexec/watchexec/releases/download/$VERSION/watchexec-$VERSION-i686-unknown-linux-musl.tar.xz && \
    (echo "$SHA256SUM  watchexec-${VERSION}-i686-unknown-linux-musl.tar.xz" | sha256sum -c) && \
    tar xvf watchexec-$VERSION-i686-unknown-linux-musl.tar.xz watchexec-$VERSION-i686-unknown-linux-musl/watchexec -C /usr/bin/ --strip-components=1 && \
    rm -rf watchexec-*

RUN npm install -g npm@8.4.1

#################################################################
# code: shared: setup
#################################################################
WORKDIR /app/shared
COPY shared/package.json ./package.json
COPY shared/package-lock.json ./package-lock.json

# https://github.com/nodejs/docker-node/issues/384#issuecomment-305208112
RUN apk --no-cache add --virtual native-deps \
  g++ gcc libgcc libstdc++ linux-headers make python libffi-dev openssl-dev && \
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
  g++ gcc libgcc libstdc++ linux-headers make python libffi-dev openssl-dev && \
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
