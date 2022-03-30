#!/usr/bin/env bash

set -u

public_path="$1"
shift
server_opts="$@"

http-server $public_path -p 9001
