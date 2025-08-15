#!/bin/sh
set -e
# If you read PORT from env, default to 2221
: "${PORT:=2221}"
exec node dist/index.js
