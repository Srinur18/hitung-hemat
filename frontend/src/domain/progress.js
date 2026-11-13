// Pencapaian siswa: lencana, progres belajar, dan ringkasan aktivitas (fungsi murni, tanpa React/IO).
import { discountAmount, finalPrice } from './discount.js';
import { formatValue } from './money.js';

/** Tabel arti persen diskon untuk satu harga (Materi B2). */
export function percentTable(price, pcts) {
  return pcts.map((pct) => ({
    pct,
    frac: formatValue(pct, 'frac'),
    dec: formatValue(pct, 'dec'),
    disc: discountAmount(price, pct),
    final: finalPrice(price, pct),
  }));
}

/**
 * Ringkasan aktivitas dari profil lokal + kemajuan modul.
 * @param {object} p profil  @param {object} progress kemajuan modul  @param {{chapters:number, modules:string[]}} meta
 */
export function activity(p = {}, progress = {}, meta = { chapters: 5, modules: [] }) {
  const lit = p.literacy;
  const modulesDone = meta.modules.filter((id) => progress[id]?.completed).length;
  const practice = Object.keys(p.literacyPractice ?? {}).length;
  const quizzes = (lit?.attempts ?? 0) + practice + (p.pretestDone ? 1 : 0) + (p.posttestDone ? 1 : 0);
  const best = lit ? Math.max(lit.last?.total ?? 0, ...(lit.history ?? []).map((h) => h.total)) : null;
  return {
    materials: (p.materialSeen ?? []).length,
    chapters: meta.chapters,
    sims: p.simCount ?? 0,
    quizzes,
    practice,
    modulesDone,
    modules: meta.modules.length,
    literacyAttempts: lit?.attempts ?? 0,
    literacyBest: best,
  };
}

/** Daftar lencana. `test` menerima hasil activity() + profil. */
export const BADGES = [
  { id: 'penjelajah', name: 'Penjelajah Ruko', desc: 'Menyelesaikan perjalanan belajar.', icon: 'map', test: (a, p) => !!p.journeyDone },
  { id: 'kutu-buku', name: 'Kutu Buku', desc: 'Mempelajari semua bab materi.', icon: 'book', test: (a) => a.materials >= a.chapters },
  { id: 'pembeli-cerdas', name: 'Pembeli Cerdas', desc: 'Menyelesaikan 1 simulasi belanja.', icon: 'cart', test: (a) => a.sims >= 1 },
  { id: 'raja-hemat', name: 'Raja Hemat', desc: 'Menyelesaikan 3 simulasi belanja.', icon: 'star', test: (a) => a.sims >= 3 },
  { id: 'berani-mencoba', name: 'Berani Mencoba', desc: 'Mengerjakan Tes Awal.', icon: 'check', test: (a, p) => !!p.pretestDone },
  { id: 'latihan-tuntas', name: 'Latihan Tuntas', desc: 'Menyelesaikan 4 latihan literasi.', icon: 'quiz', test: (a) => a.practice >= 4 },
  { id: 'pantang-menyerah', name: 'Pantang Menyerah', desc: 'Mengerjakan Tes Literasi 2 kali.', icon: 'start', test: (a) => a.literacyAttempts >= 2 },
  { id: 'ahli-literasi', name: 'Ahli Literasi', desc: 'Skor Tes Literasi minimal 20 dari 24.', icon: 'star', test: (a) => (a.literacyBest ?? 0) >= 20 },
  { id: 'juara-modul', name: 'Juara Modul', desc: 'Menyelesaikan semua modul latihan.', icon: 'check', test: (a) => a.modules > 0 && a.modulesDone >= a.modules },
];

export function earnedBadges(p, progress, meta) {
  const a = activity(p, progress, meta);
  return BADGES.filter((b) => b.test(a, p ?? {})).map((b) => b.id);
}

/** Progres belajar keseluruhan 0–100 (bobot sama untuk setiap langkah). */
export function overallProgress(p, progress, meta) {
  const a = activity(p, progress, meta);
  const parts = [
    [p?.journeyDone ? 1 : 0, 1],
    [a.materials, a.chapters],
    [Math.min(a.sims, 1), 1],
    [p?.pretestDone ? 1 : 0, 1],
    [a.practice, 4],
    [a.modulesDone, a.modules || 1],
    [a.literacyAttempts > 0 ? 1 : 0, 1],
    [p?.posttestDone ? 1 : 0, 1],
  ];
  const got = parts.reduce((s, [x, n]) => s + Math.min(x, n) / n, 0);
  return Math.round((100 * got) / parts.length);
}
