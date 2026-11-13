#!/usr/bin/env bash
# Builds the native Windows app (NOVA3D-vNN.exe) from src/Just3D.html. Requires Go 1.24+ and zip.
# Usage: ./build.sh v150   ->  dist/NOVA3D-v150-windows.zip  (folder NOVA3D-v150/ with NOVA3D-v150.exe)
set -euo pipefail
VER="${1:?usage: ./build.sh vNN}"
cd "$(dirname "$0")"
cp src/Just3D.html native/app.html
rm -rf "dist/both-$VER" "dist/pkg"
mkdir -p "dist/both-$VER/NOVA3D-$VER"
( cd native && GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags "-s -w -H=windowsgui" -o "../dist/both-$VER/NOVA3D-$VER/NOVA3D-$VER.exe" . )
cp CHANGELOG.md "dist/both-$VER/NOVA3D-$VER/CHANGELOG.txt"
sed "s/@VER@/$VER/g" tools/windows-README.txt > "dist/both-$VER/NOVA3D-$VER/README.txt"
cp tools/Create-NOVA3D-shortcuts.cmd "dist/both-$VER/NOVA3D-$VER/Create-NOVA3D-shortcuts.cmd"
cp assets/nova3d.ico "dist/both-$VER/NOVA3D-$VER/NOVA3D.ico"
( cd "dist/both-$VER" && rm -f "../NOVA3D-$VER-windows.zip" && zip -qr "../NOVA3D-$VER-windows.zip" "NOVA3D-$VER" )
echo "built dist/NOVA3D-$VER-windows.zip (native Windows app)"
