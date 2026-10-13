#!/bin/sh
# Builds the Accessibility helper. Needs Xcode command line tools: xcode-select --install
set -e
cd "$(dirname "$0")"
swiftc -O -o axq axq.swift -framework Cocoa -framework ApplicationServices
echo "built mac/axq — now grant Accessibility to your terminal: System Settings → Privacy & Security → Accessibility"
./axq trusted || true
