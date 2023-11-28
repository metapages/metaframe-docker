##################################################################
# Base image
#################################################################
FROM node:21-alpine3.17 as server

RUN apk --no-cache add \
    bash \
    curl


# Needs community repo
RUN apk add --no-cache -X https://dl-cdn.alpinelinux.org/alpine/edge/community \
    sd

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
# watchexec: generic file watcher
###############################################################################
RUN apk add --no-cache -X https://dl-cdn.alpinelinux.org/alpine/edge/testing \
    watchexec


###############################################################################
# justfile for running commands, you will mostly interact with just https://github.com/casey/just
###############################################################################
# RUN VERSION=1.0.0 ; \
#     SHA256SUM=342f8582d929b9212ffcbe9f7749e12908053cf215eb8d4a965c47ea2f24b0a4 ; \
#     curl -L -O https://github.com/casey/just/releases/download/$VERSION/just-$VERSION-x86_64-unknown-linux-musl.tar.gz && \
#     (echo "$SHA256SUM  just-$VERSION-x86_64-unknown-linux-musl.tar.gz" | sha256sum -c -) && \
#     mkdir -p /usr/local/bin && \
#     tar -xzf just-$VERSION-x86_64-unknown-linux-musl.tar.gz -C /usr/local/bin just && \
#     rm -rf just-$VERSION-x86_64-unknown-linux-musl.tar.gz
# # Unify the just binary location on host and container platforms because otherwise the shebang doesn't work properly due to no string token parsing (it gets one giant string)
# ENV PATH $PATH:/usr/local/bin
# # alias "j" to just, it's just right there index finger
# RUN echo -e '#!/bin/bash\njust "$@"' > /usr/bin/j && \
#     chmod +x /usr/bin/j

# # watchexec for live reloading in development https://github.com/watchexec/watchexec
# RUN VERSION=1.14.1 ; \
#     SHA256SUM=34126cfe93c9c723fbba413ca68b3fd6189bd16bfda48ebaa9cab56e5529d825 ; \
#     curl -L -O https://github.com/watchexec/watchexec/releases/download/$VERSION/watchexec-$VERSION-i686-unknown-linux-musl.tar.xz && \
#     (echo "$SHA256SUM  watchexec-${VERSION}-i686-unknown-linux-musl.tar.xz" | sha256sum -c) && \
#     tar xvf watchexec-$VERSION-i686-unknown-linux-musl.tar.xz watchexec-$VERSION-i686-unknown-linux-musl/watchexec -C /usr/bin/ --strip-components=1 && \
#     rm -rf watchexec-*

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
# code: server: setup
#################################################################
WORKDIR /app/server
COPY server/package-lock.json ./package-lock.json
COPY server/package.json ./package.json

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
# COPY shared/justfile ./justfile
# COPY shared/tsconfig.json ./tsconfig.json
COPY shared/tsconfig-base.json ./tsconfig-base.json
COPY shared/src ./src
# RUN just build

#################################################################
# code: server: build
#################################################################

WORKDIR /app/server
COPY server/justfile ./justfile
COPY server/tsconfig.json ./tsconfig.json
COPY server/src ./src
RUN just build

ENV PORT 8080
CMD just _run
HEALTHCHECK --interval=8s --timeout=2s --retries=60 --start-period=10s CMD curl --fail http://localhost:8080/healthz || exit 1
