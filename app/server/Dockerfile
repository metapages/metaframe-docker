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
# watchexec for fast development reloading
###############################################################################
RUN apk add --no-cache -X https://dl-cdn.alpinelinux.org/alpine/edge/community \
    watchexec

###############################################################################
# npm for javascript
###############################################################################
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
