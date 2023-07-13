#!/usr/bin/env bash

set -eEuo pipefail

if [[ "${npm_package_version}" == "$(yarn info @odf-console/shared version -s)" ]]; then
  echo "The version you're trying to publish is already published."
  exit 0
fi

yarn build
yarn publish build --access public --new-version "${npm_package_version}"
