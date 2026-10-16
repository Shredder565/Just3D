#!/bin/sh
# Builds both pages and both Windows programs into ./dist  (needs python3 and Go 1.24+)
set -e
cd "$(dirname "$0")"
python3 src/build.py built
mkdir -p dist
for app in trace:Just3D-Trace ai:Just3D-AI; do
  mode=${app%%:*}; name=${app#*:}
  cp built/just3d-$mode.html launcher/app.html
  (cd launcher && GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags "-s -w -H=windowsgui -X main.appName=$name" -o ../dist/$name.exe .)
  cp built/just3d-$mode.html dist/
done
rm -f launcher/app.html
echo "built: $(ls dist)"
