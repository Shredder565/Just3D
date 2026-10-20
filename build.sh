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
# native Windows app (own window via WebView2, no browser) goes into the same zip as the original
cp src/Just3D.html native/app.html
mkdir -p "dist/both-$VER/Just3D-$VER"
cp "dist/pkg/Just3D-$VER.exe" "dist/both-$VER/Just3D-$VER/"
( cd native && GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags "-s -w -H=windowsgui" -o "../dist/both-$VER/Just3D-$VER/Just3D-$VER-native.exe" . )
cp CHANGELOG.md "dist/both-$VER/Just3D-$VER/CHANGELOG.txt"
sed "s/@VER@/$VER/g" tools/windows-README.txt > "dist/both-$VER/Just3D-$VER/README.txt"
cp tools/Create-Just3D-shortcuts.cmd "dist/both-$VER/Just3D-$VER/Create-Just3D-shortcuts.cmd"
cp assets/just3d.ico "dist/both-$VER/Just3D-$VER/Just3D.ico"
( cd "dist/both-$VER" && rm -f "../Just3D-$VER-windows.zip" && zip -qr "../Just3D-$VER-windows.zip" "Just3D-$VER" )
echo "built dist/Just3D-$VER-windows.zip (native + original)"
