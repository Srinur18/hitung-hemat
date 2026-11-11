// Mesin petunjuk bertingkat + fading + penguasaan (architecture.md §5).

/** Bantuan otomatis ditawarkan setelah 2 kali salah pada langkah yang sama (DS02). */
export const AUTO_HINT_AFTER = 2;
/** H1 pemantik, H2 urutan, H3 langkah sebagian, H4 contoh serupa. */
export const MAX_HINT = 4;

/**
 * Pengaturan scaffolding menurut tingkat penguasaan modul (0–3).
 * Semakin tinggi, bantuan visual semakin dipudarkan (fading).
 */
export function scaffoldFor(level, { transfer = false } = {}) {
  return {
    signaling: !transfer && level < 2, // warna angka otomatis
    markMode: transfer || level >= 2, // siswa menandai angka sendiri (formulate)
    formulaOpen: level === 0, // kartu rumus terbuka
    hintButtonAfter: [0, 1, 2, 2][level] ?? 2, // jumlah salah sebelum tombol petunjuk aktif
  };
}

export function initialHintState() {
  return { attempts: 0, level: 0, autoOffered: false };
}

/** Dipanggil saat jawaban salah. offer = tampilkan tawaran petunjuk otomatis. */
export function onWrong(state) {
  const attempts = state.attempts + 1;
  const offer = attempts >= AUTO_HINT_AFTER && !state.autoOffered && state.level < MAX_HINT;
  return { state: { ...state, attempts, autoOffered: state.autoOffered || offer }, offer };
}

export function nextHint(state) {
  return { ...state, level: Math.min(MAX_HINT, state.level + 1) };
}

/**
 * Riwayat soal mandiri/transfer → tingkat penguasaan & bintang.
 * @param {Array<{stage:string, correct:boolean, maxHint:number}>} history
 */
export function masteryLevel(history) {
  const good = history.filter((h) => h.stage === 'independent' && h.correct && h.maxHint <= 1).length;
  if (good >= 4) return 3;
  if (good >= 3) return 2;
  if (good >= 1) return 1;
  return 0;
}

export function isMastered(history, { needsTransfer = true } = {}) {
  const last4 = history.filter((h) => h.stage === 'independent').slice(-4);
  const enough = last4.filter((h) => h.correct && h.maxHint < 3).length >= 3;
  const transferOk = !needsTransfer || history.some((h) => h.stage === 'transfer' && h.correct);
  return enough && transferOk;
}

export function stars(history, opts) {
  if (!isMastered(history, opts)) return history.length ? 1 : 0;
  const noBigHints = history.every((h) => h.maxHint < 3);
  return noBigHints ? 3 : 2;
}
