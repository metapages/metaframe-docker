# deno not node because long-term deno will be used for all non-trivial scripting
FROM denoland/deno:alpine-1.34.1

RUN apk --no-cache --update add \
    bash \
    curl \
    git \
    jq \
    npm \
    openssh \
    ripgrep

# https://gist.github.com/squarebracket/e719069522436873bc6f13efb359cac9
RUN cp /etc/ssl/certs/ca-certificates.crt /etc/ssl/cert.pem

# Needs edge repo
RUN apk add --no-cache -X https://dl-cdn.alpinelinux.org/alpine/edge/testing \
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

# git on unconfigured systems requires these set for some operations
RUN git config --global user.email "ci@rob.ot"
RUN git config --global user.name "robot"

# Newer version of npm
RUN /usr/bin/npm i -g npm@8.17.0


RUN apk --no-cache --update add \
  g++ gcc libgcc libstdc++ linux-headers make python3
RUN npm install --quiet node-gyp -g


# shared dependencies
WORKDIR /app/shared
COPY shared/package.json ./package.json
COPY shared/package-lock.json ./package-lock.json
RUN npm i

# browser dependencies
WORKDIR /app/browser
# # This:
# # https://github.com/metapages/cloudseed/runs/1083375046
# # led to: https://github.com/moby/moby/issues/37965
# # See identical statements elsewhere
# # THIS IS MAGIC BULLSHIT THAT I HATE BUT LET'S MOVE ON
RUN true
COPY browser/package.json ./package.json
COPY browser/package-lock.json ./package-lock.json
RUN npm i

# shared src (build happens via browser build)
WORKDIR /app/shared
# COPY shared/tsconfig.json ./tsconfig.json
COPY shared/tsconfig-base.json ./tsconfig-base.json
COPY shared/src ./src


WORKDIR /app/browser
COPY browser/justfile ./justfile
COPY browser/public ./public
COPY browser/index.html ./index.html
COPY browser/vite.config.ts ./vite.config.ts
COPY browser/src ./src
COPY browser/justfile ./
COPY browser/tsconfig.json ./


















# WORKDIR /app/shared
# COPY ./shared/package.json ./
# COPY ./shared/package-lock.json ./
# RUN npm i


# WORKDIR /app
# COPY ./tsconfig.workspace.json ./tsconfig.workspace.json
# COPY package.json ./package.json
# RUN npm i
# # WORKDIR /app/shared

# # Install cached modules
# WORKDIR /app/browser
# COPY browser/package.json ./
# COPY browser/package-lock.json ./


# # WORKDIR /app
# RUN npm i

# # WORKDIR /app/shared
# # RUN npm i
# # RUN just build


# WORKDIR /app/browser
# COPY browser/tsconfig.json ./tsconfig.json
# COPY browser/vite.config.ts ./vite.config.ts
# COPY browser/index.html ./index.html
# COPY browser/src ./src
# COPY browser/public ./public
# COPY browser/justfile ./justfile

RUN ls
ARG DOCKER_TAG=local
ARG APP_FQDN
ENV APP_FQDN $APP_FQDN
ARG APP_PORT
ENV APP_PORT $APP_PORT
# RUN GITHUB_WORKSPACE=/ DOCKER_TAG=${DOCKER_TAG} just build


# Add user aliases to the shell if available
# RUN echo "if [ -f /repo/.tmp/.aliases ]; then source /repo/.tmp/.aliases; fi" >> /root/.bashrc
