#!/bin/bash

result=0

function run {
  echo "########### $@"
  if ! "$@"; then
    result=1
  fi
}

run yarn run mocha
run yarn run lint

exit ${result}
