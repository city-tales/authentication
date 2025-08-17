#!/bin/sh
set -e
# Defaults for local/dev; Cloud Run will always provide PORT for the exposed listener
: "${PORT:=2221}"
: "${HTTP_PORT:=2222}"
: "${GRPC_PORT:=5051}"
: "${ROLE:=http}"

echo "Starting authentication service with ROLE=$ROLE"
echo "CloudRun/External PORT: $PORT"
echo "HTTP_PORT: $HTTP_PORT | GRPC_PORT: $GRPC_PORT"

# Node app selects which port to bind for each server based on ROLE via src/config/config.js
exec node dist/index.js
