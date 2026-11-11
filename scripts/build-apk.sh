#!/usr/bin/env bash
# Membuat APK debug DI LUAR folder OneDrive.
# Alasan: OneDrive mengunci folder yang baru dibuat Capacitor/Gradle (EPERM), sehingga build gagal.
# Kode sumber tetap di folder proyek; hanya build-nya yang dikerjakan di $HH_BUILD_DIR.
#
# Pemakaian (Git Bash, dari folder APK):  source ~/hh-tools/env.sh && bash scripts/build-apk.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/frontend"
WORK="${HH_BUILD_DIR:-$HOME/hh-build/frontend}"
VERSION="$(node -p "require('$(cygpath -m "$SRC")/package.json').version")"
OUT="$ROOT/release/HitungHemat-v$VERSION-debug.apk"

echo "== 1/4 Tes & build web"
cd "$SRC"
npm test
npx vite build

echo "== 2/4 Salin proyek ke $WORK (tanpa folder hasil build)"
mkdir -p "$WORK"
S="$(cygpath -w "$SRC")"
W="$(cygpath -w "$WORK")"
rc=0
MSYS_NO_PATHCONV=1 robocopy "$S" "$W" /MIR /NFL /NDL /NJH /NJS /NP \
  /XD "$S\\android\\app\\build" "$S\\android\\build" "$S\\android\\.gradle" \
      "$S\\android\\capacitor-cordova-android-plugins" "$S\\android\\app\\src\\main\\assets\\public" \
  || rc=$?
[ "$rc" -lt 8 ] || { echo "robocopy gagal ($rc)"; exit 1; }

echo "== 3/4 Capacitor sync + Gradle"
cd "$WORK"
echo "sdk.dir=$(cygpath -m "$ANDROID_HOME")" > android/local.properties
npx cap sync android
cd android
./gradlew.bat assembleDebug --no-daemon -q

echo "== 4/4 Salin APK"
mkdir -p "$ROOT/release"
cp app/build/outputs/apk/debug/app-debug.apk "$OUT"
ls -la "$OUT"
echo "Selesai: $OUT"
