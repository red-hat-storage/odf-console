#!/usr/bin/env bash

set -u

public_path="$1"

http-server $public_path -p 9001 -S "$ENABLE_TLS" -C "$TLS_CERT" -K "$TLS_KEY" -c-1
