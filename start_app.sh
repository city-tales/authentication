#!/bin/sh
set -e
# If you read PORT from env, default to 2221
: "${PORT:=2221}"
: "${GRPC_PORT:=5051}"
echo "Docker HTTP application running on port $PORT"
echo "Docker gRPC application running on port $GRPC_PORT"
exec node dist/index.js --port=$PORT --grpcPort=$GRPC_PORT
