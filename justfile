# Very high-level root-repository operations
# More specific commands are in deeper justfiles
#  - Commands containing 🌱 in the docs are (or will be) used for automation and are required to link to docs explaining further if needed
set shell       := ["bash", "-c"]
set dotenv-load := true
# Temporarily disabled attempting to automatically jump into docker for the ci ops, since they
# rely on building docker images, and mounting host directories is rife with permissions problems:
# https://github.com/moby/moby/issues/2259#issuecomment-48284631
_help:
    #!/usr/bin/env bash
    echo ""
    echo "🌱 Cloudseed 🌱 gitops powered application framework"
    echo ""
    just --list --unsorted
    echo ""
    echo "sub-commands:"
    echo "    app"
    echo "    worker"
    echo "    deployments"
    echo ""
    echo "DEBUGGING: e.g. 'DEBUG=1 just test'"
    echo ""

# Develop: run the stack with docker-compose, open a browser window. 'just app/down' to stop.
@dev:
    just app/dev

# Run all build/unit tests
@test:
    echo "No tests currently setup"

# Publish 1) server to glitch, 2) browser client to gihub pages, 3) worker image to docker-hub
@deploy:
    just app/browser/publish
    just deployments/glitch/deploy
    just app/worker/publish_docker

# builds (versioned) production docker images
@build:
    just app/browser/build
    just deployments/glitch/build

###################################################
# Internal utilies
###################################################

# Deploy published images etc to infrastructure
alias deployments := _deployments
@_deployments +args="":
    just deployments/{{args}}

alias worker := _worker
@_worker +args="":
    just app/worker/{{args}}

alias app := _app
@_app +args="":
    just app/{{args}}
