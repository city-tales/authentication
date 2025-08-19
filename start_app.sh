#!/bin/sh
set -e
# Defaults for local/dev; Cloud Run will always provide PORT for the exposed listener
: "${PORT:=8080}"

echo "Starting authentication gRPC service"
echo "gRPC will listen on 0.0.0.0:${PORT}"

exec node dist/index.js
