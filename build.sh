#!/usr/bin/env bash
# Builds the Windows launcher (NOVA3D.exe) from src/Just3D.html. Requires Go 1.24+.
# Usage: ./build.sh v90   ->  dist/NOVA3D-v90.exe and dist/NOVA3D-v90-windows.zip
set -euo pipefail
VER="${1:?usage: ./build.sh vNN}"
cd "$(dirname "$0")"
mkdir -p dist/pkg
cp src/Just3D.html launcher/app.html
( cd launcher && GOOS=windows GOARCH=amd64 CGO_ENABLED=0 \
    go build -trimpath -ldflags "-s -w -H=windowsgui" -o "../dist/pkg/NOVA3D-$VER.exe" . )
cp CHANGELOG.md dist/pkg/CHANGELOG.md
cp README.md dist/pkg/README.md
( cd dist && rm -f "NOVA3D-$VER-windows.zip" && cd pkg && zip -q "../NOVA3D-$VER-windows.zip" ./* )
# native Windows app (own window via WebView2, no browser) goes into the same zip as the original
cp src/Just3D.html native/app.html
mkdir -p "dist/both-$VER/NOVA3D-$VER"
cp "dist/pkg/NOVA3D-$VER.exe" "dist/both-$VER/NOVA3D-$VER/"
( cd native && GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags "-s -w -H=windowsgui" -o "../dist/both-$VER/NOVA3D-$VER/NOVA3D-$VER-native.exe" . )
cp CHANGELOG.md "dist/both-$VER/NOVA3D-$VER/CHANGELOG.txt"
sed "s/@VER@/$VER/g" tools/windows-README.txt > "dist/both-$VER/NOVA3D-$VER/README.txt"
cp tools/Create-NOVA3D-shortcuts.cmd "dist/both-$VER/NOVA3D-$VER/Create-NOVA3D-shortcuts.cmd"
cp assets/nova3d.ico "dist/both-$VER/NOVA3D-$VER/NOVA3D.ico"
( cd "dist/both-$VER" && rm -f "../NOVA3D-$VER-windows.zip" && zip -qr "../NOVA3D-$VER-windows.zip" "NOVA3D-$VER" )
echo "built dist/NOVA3D-$VER-windows.zip (native + original)"
