#!/usr/bin/env bash
# Copies the site's shared code into extension/ so the folder can be loaded
# unpacked as-is, then zips it into dist/. Run after changing js/, style.css
# or index.html:  npm run build:ext
set -euo pipefail
cd "$(dirname "$0")/.."

rm -rf extension/lib
mkdir -p extension/lib dist
cp js/games.js js/stats.js js/core.js js/app.js extension/lib/
cp extension/src/store.js extension/lib/store.js   # chrome.storage instead of localStorage
cp style.css extension/style.css
sed -e 's#src="js/app.js"#src="lib/app.js"#' index.html > extension/stats.html

rm -f dist/daily-run-extension.zip
(cd extension && zip -qr ../dist/daily-run-extension.zip . -x 'src/*' -x '.DS_Store')
echo "Built extension/ and dist/daily-run-extension.zip"
