#!/bin/bash

set -e

rm -rf dist/*
[ -e stream-control.tar.gz ] && rm stream-control.tar.gz

npm run build:prod

tar czf stream-control.tar.gz --transform 's,^dist,stream-control,' dist
