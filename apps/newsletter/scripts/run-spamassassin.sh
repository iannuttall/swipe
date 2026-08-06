#!/bin/sh
set -eu

image="swipe-spamassassin:bookworm"
script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
dockerfile_dir="$script_dir/../tools/spamassassin"

if ! docker image inspect "$image" >/dev/null 2>&1; then
  docker build --quiet --tag "$image" "$dockerfile_dir" >/dev/null
fi

exec docker run --rm --interactive "$image" "$@"
