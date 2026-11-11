#!/usr/bin/env bash
# Build versi web dan terbitkan ke GitHub Pages (cabang gh-pages).
# Hasil: https://srinur18.github.io/hitung-hemat/
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/Srinur18/hitung-hemat.git}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"

cd "$ROOT/frontend"
npm test
npx vite build

cp -r dist/. "$TMP/"
touch "$TMP/.nojekyll"          # agar GitHub Pages tidak memproses folder assets
cd "$TMP"
git init -q -b gh-pages
git add -A
git commit -q -m "Deploy web HitungHemat $(date -u +%Y-%m-%dT%H:%MZ)"
git push -f "$REPO_URL" gh-pages
rm -rf "$TMP"
echo "Selesai. Buka: https://srinur18.github.io/hitung-hemat/ (tunggu 1-2 menit)"
