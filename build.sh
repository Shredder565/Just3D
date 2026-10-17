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
# native Windows app (own window via WebView2, no browser): dist/Just3D-$VER-windows-native.zip
cp src/Just3D.html native/app.html
mkdir -p "dist/native-$VER/Just3D-$VER-native"
( cd native && GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags "-s -w -H=windowsgui" -o "../dist/native-$VER/Just3D-$VER-native/Just3D-$VER-native.exe" . )
cp CHANGELOG.md "dist/native-$VER/Just3D-$VER-native/CHANGELOG.txt"
sed "s/@VER@/$VER/g" tools/native-README.txt > "dist/native-$VER/Just3D-$VER-native/README.txt"
( cd "dist/native-$VER" && rm -f "../Just3D-$VER-windows-native.zip" && zip -qr "../Just3D-$VER-windows-native.zip" "Just3D-$VER-native" )
echo "built dist/Just3D-$VER-windows.zip and dist/Just3D-$VER-windows-native.zip"
