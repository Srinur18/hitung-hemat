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
      "$S\\node_modules\\@capacitor\\android\\capacitor\\build" \
      "$S\\node_modules\\@capacitor\\filesystem\\android\\build" \
      "$S\\node_modules\\@capacitor\\share\\android\\build" \
  || rc=$?
[ "$rc" -lt 8 ] || { echo "robocopy gagal ($rc)"; exit 1; }

echo "== 3/4 Capacitor sync + Gradle"
cd "$WORK"
echo "sdk.dir=$(cygpath -m "$ANDROID_HOME")" > android/local.properties

# Windows Defender/OneDrive kadang mengunci folder yang baru ditulis sehingga
# `cap sync` gagal menghapusnya (EPERM). Hapus folder hasil generate sendiri, dengan percobaan ulang.
clean_generated() {
  for _ in 1 2 3 4 5; do
    rm -rf android/app/src/main/assets/public android/capacitor-cordova-android-plugins 2>/dev/null || true
    [ ! -e android/app/src/main/assets/public ] && [ ! -e android/capacitor-cordova-android-plugins ] && return 0
    sleep 3
  done
  return 1
}
synced=0
for attempt in 1 2 3; do
  clean_generated || true
  # `cap sync` bisa keluar dengan kode 0 walau mencetak [error], jadi periksa teksnya.
  out="$(npx cap sync android 2>&1 || true)"
  echo "$out"
  if ! grep -q "\[error\]" <<<"$out"; then synced=1; break; fi
  echo "cap sync gagal (percobaan $attempt), mengulang..."
  sleep 5
done
[ "$synced" = 1 ] || { echo "cap sync tetap gagal"; exit 1; }
# hasil build lama pustaka Capacitor (bisa terkunci/basi) dibersihkan dulu
rm -rf node_modules/@capacitor/android/capacitor/build node_modules/@capacitor/*/android/build 2>/dev/null || true
cd android
./gradlew.bat assembleDebug --no-daemon -q || {
  echo "Gradle gagal, mencoba sekali lagi setelah 10 detik..."
  sleep 10
  ./gradlew.bat assembleDebug --no-daemon -q
}

echo "== 4/4 Salin APK"
mkdir -p "$ROOT/release"
cp app/build/outputs/apk/debug/app-debug.apk "$OUT"
ls -la "$OUT"
echo "Selesai: $OUT"
