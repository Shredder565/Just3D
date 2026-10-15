#!/usr/bin/env bash
# Builds the Windows launcher (Just3D.exe) from src/Just3D.html. Requires Go 1.24+.
# Usage: ./build.sh v90   ->  dist/Just3D-v90.exe and dist/Just3D-v90-windows.zip
set -euo pipefail
VER="${1:?usage: ./build.sh vNN}"
cd "$(dirname "$0")"
mkdir -p dist/pkg
cp src/Just3D.html launcher/app.html
( cd launcher && GOOS=windows GOARCH=amd64 CGO_ENABLED=0 \
    go build -trimpath -ldflags "-s -w -H=windowsgui" -o "../dist/pkg/Just3D-$VER.exe" . )
cp CHANGELOG.md dist/pkg/CHANGELOG.md
cp README.md dist/pkg/README.md
( cd dist && rm -f "Just3D-$VER-windows.zip" && cd pkg && zip -q "../Just3D-$VER-windows.zip" ./* )
echo "built dist/Just3D-$VER-windows.zip"
