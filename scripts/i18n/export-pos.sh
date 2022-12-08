#!/usr/bin/env bash

set -exuo pipefail

source ./scripts/i18n/languages.sh

for f in locales/en/* ; do
  for i in "${LANGUAGES[@]}"
  do
  yarn i18n-to-po -f "$(basename "$f" .json)" -l "$i"
  done
done
