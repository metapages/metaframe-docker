##################################################################
# Base image
#################################################################
FROM node:15.11.0-alpine3.10 as server

RUN apk --no-cache add \
    bash \
    curl

# justfile https://github.com/casey/just
RUN VERSION=0.8.4 ; \
    SHA256SUM=c361b0df74dcd64f7a8aeb839dce5ae2bb0d14b8ceb2046b4828ee042ec7c98e ; \
    curl -L -O https://github.com/casey/just/releases/download/v$VERSION/just-v$VERSION-x86_64-unknown-linux-musl.tar.gz && \
    (echo "$SHA256SUM  just-v$VERSION-x86_64-unknown-linux-musl.tar.gz" | sha256sum  -c -) && \
    mkdir -p /tmp/just && mv just-v$VERSION-x86_64-unknown-linux-musl.tar.gz /tmp/just && cd /tmp/just && \
    tar -xzf just-v$VERSION-x86_64-unknown-linux-musl.tar.gz && \
    mkdir -p /usr/local/bin && mv /tmp/just/just /usr/local/bin/ && rm -rf /tmp/just
# just tweak: unify the just binary location on host and container platforms because otherwise the shebang doesn't work properly due to no string token parsing (it gets one giant string)
ENV PATH $PATH:/usr/local/bin

# watchexec for live reloading in development https://github.com/watchexec/watchexec
RUN VERSION=1.14.1 ; \
    SHA256SUM=34126cfe93c9c723fbba413ca68b3fd6189bd16bfda48ebaa9cab56e5529d825 ; \
    curl -L -O https://github.com/watchexec/watchexec/releases/download/$VERSION/watchexec-$VERSION-i686-unknown-linux-musl.tar.xz && \
    (echo "$SHA256SUM  watchexec-${VERSION}-i686-unknown-linux-musl.tar.xz" | sha256sum -c) && \
    tar xvf watchexec-$VERSION-i686-unknown-linux-musl.tar.xz watchexec-$VERSION-i686-unknown-linux-musl/watchexec -C /usr/bin/ --strip-components=1 && \
    rm -rf watchexec-*

RUN npm install -g npm@6.14.5

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
# code: server: setup
#################################################################
WORKDIR /app/server
COPY server/package-lock.json ./package-lock.json
COPY server/package.json ./package.json

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
COPY shared/src ./src
RUN just build

#################################################################
# code: server: build
#################################################################

WORKDIR /app/server
COPY server/justfile ./justfile
COPY server/tsconfig.json ./tsconfig.json
COPY server/src ./src
RUN just build

ENV PORT 8080
CMD node --experimental-specifier-resolution=node ./dist/index.js
HEALTHCHECK --interval=8s --timeout=2s --retries=60 --start-period=10s CMD curl --fail http://localhost:8080/healthz || exit 1
