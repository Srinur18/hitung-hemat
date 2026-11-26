// Penilaian Tes Literasi Matematis bertahap (4 indikator, maks. 24 poin).
// Identik dengan backend/app/domain/literacy.py (dicek lewat shared/test-vectors.json).
//
// - Setiap tahap dinilai sendiri → skor parsial untuk tahap yang benar.
// - Langkah bertanda `ecf` (error carried forward) juga benar bila konsisten dengan
//   jawaban siswa sendiri di tahap sebelumnya.
// - Kunci angka dihitung dari registri fungsi domain (tanpa eval).
import { FN } from './discount.js';
import { formatRp } from './money.js';

export const PROCESSES = ['reason', 'formulate', 'employ', 'interpret'];

/** 0 bila a < b, 1 bila a > b, 2 bila sama (indeks opsi perbandingan). */
export const compareIndex = (a, b) => (a < b ? 0 : a > b ? 1 : 2);

const LFN = { ...FN, compareIndex };

const isInt = (x) => Number.isInteger(x);

export function evaluate(spec, v) {
  if (isInt(spec)) return spec;
  if (!spec || typeof spec !== 'object') return null;
  const args = spec.args.map((a) => (isInt(a) ? a : v[a]));
  if (args.some((a) => a === null || a === undefined)) return null;
  const fn = LFN[spec.fn];
  if (!fn) throw new Error(`Fungsi tidak dikenal: ${spec.fn}`);
  return fn(...args);
}

/** Kunci tiap langkah, dihitung berurutan dari data soal. */
export function answerKey(item) {
  const v = { ...item.vars };
  const key = {};
  for (const st of item.steps) {
    const k = evaluate(st.key, v);
    key[st.id] = k;
    v[st.id] = k;
  }
  return key;
}

/** Skor parsial ECF & salah hitung (rubrik manual hasil uji coba instrumen, 25 Nov 2026). */
export const PARTIAL = 0.5;
export const CREDIT = { key: 1, ecf: PARTIAL, calc: PARTIAL };

const stepRefs = (st) => (st.key && typeof st.key === 'object' ? st.key.args.filter((a) => typeof a === 'string') : []);
const isTrap = (st, a, v) => (st.traps ?? []).some((tr) => evaluate(tr.value, v) === a);

/**
 * Penilaian berurutan (identik dengan judge_steps di Python) → [{id, via, trap}].
 * via: 'key' penuh | 'ecf' konsisten dengan jawaban sendiri | 'calc' model benar, salah hitung | null.
 */
export function judgeSteps(item, answers = {}) {
  const key = answerKey(item);
  const vKey = { ...item.vars, ...key };
  const student = { ...item.vars };
  const via = {};
  const trapped = new Set();
  return item.steps.map((st) => {
    const a = answers[st.id] ?? null;
    let res = null;
    const trap = isInt(a) && isTrap(st, a, vKey);
    if (trap) trapped.add(st.id);
    if (isInt(a)) {
      if (a === key[st.id]) {
        res = (st.ecfFrom ?? []).some((d) => via[d] !== 'key') ? 'ecf' : 'key';
      } else if (
        st.ecf &&
        !(st.ecfCalcOnly && stepRefs(st).some((d) => trapped.has(d))) &&
        evaluate(st.key, student) === a
      ) {
        res = 'ecf';
      } else if (
        st.calcFrom &&
        st.input !== 'choice' &&
        via[st.calcFrom] === 'key' &&
        a > 0 &&
        !trap &&
        !Object.values({ ...student, ...key }).some((x) => isInt(x) && x === a)
      ) {
        res = 'calc';
      }
    }
    via[st.id] = res;
    student[st.id] = a;
    return { id: st.id, via: res, trap };
  });
}

export function scoreItem(item, answers = {}) {
  const judged = judgeSteps(item, answers);
  const steps = item.steps.map((st, i) => {
    const a = answers[st.id] ?? null;
    const { via } = judged[i];
    return { id: st.id, tahap: st.tahap, points: st.points, earned: via ? st.points * CREDIT[via] : 0, answer: a, via };
  });
  return {
    id: item.id,
    process: item.process,
    earned: steps.reduce((s, x) => s + x.earned, 0),
    max: steps.reduce((s, x) => s + x.points, 0),
    steps,
  };
}

export function scoreTest(items, answersByItem = {}) {
  const items_ = items.map((it) => scoreItem(it, answersByItem[it.id] ?? {}));
  const byProcess = {};
  for (const r of items_) {
    const b = (byProcess[r.process] ??= { earned: 0, max: 0 });
    b.earned += r.earned;
    b.max += r.max;
  }
  return {
    total: items_.reduce((s, r) => s + r.earned, 0),
    max: items_.reduce((s, r) => s + r.max, 0),
    byProcess,
    items: items_,
  };
}

/** Poin per tahap (sub-langkah 2a/2b dijumlahkan ke tahap 2). */
export function rubricOf(item) {
  const n = Math.max(...item.steps.map((s) => s.tahap));
  const out = Array(n).fill(0);
  for (const s of item.steps) out[s.tahap - 1] += s.points;
  return out;
}

/** Nilai yang sudah diketahui siswa untuk menampilkan teks langkah (data soal + jawabannya sendiri). */
export function studentVars(item, answers = {}) {
  return { ...item.vars, ...answers };
}

/**
 * Umpan balik untuk satu langkah. Tidak pernah memuat kunci jawaban (aturan P8).
 * @returns {{correct:boolean, via:string|null, earned:number, text:string, code:string|null}}
 */
export function stepFeedback(item, stepId, answer, answers = {}) {
  const idx = item.steps.findIndex((s) => s.id === stepId);
  const st = item.steps[idx];
  const key = answerKey(item);
  // hanya jawaban SEBELUM langkah ini + jawaban sekarang yang dinilai
  const upto = {};
  item.steps.slice(0, idx).forEach((s) => { upto[s.id] = answers[s.id] ?? null; });
  upto[stepId] = answer;
  const { via } = judgeSteps(item, upto)[idx];
  const earned = via ? st.points * CREDIT[via] : 0;
  if (via === 'key' || via === 'ecf') {
    return {
      correct: true,
      via,
      earned,
      code: null,
      text: via === 'ecf' ? 'Caramu benar dan konsisten dengan hasilmu sebelumnya.' : st.good ?? 'Benar!',
    };
  }
  if (via === 'calc') {
    // Salah hitung dengan model benar: tetap dianggap salah agar siswa memperbaikinya sendiri (R2).
    return {
      correct: false,
      via,
      earned,
      code: 'calc',
      text: st.calcFb ?? 'Modelmu sudah benar, tetapi hasil hitungnya belum tepat. Hitung ulang dengan teliti.',
    };
  }
  if (st.input === 'choice') {
    const text = st.optionFeedback?.[String(answer)] ?? st.fb ?? 'Belum tepat. Baca lagi soalnya.';
    return { correct: false, via: null, earned: 0, code: null, text };
  }
  const v = { ...item.vars, ...key };
  const trap = (st.traps ?? []).find((tr) => evaluate(tr.value, v) === answer);
  if (trap) return { correct: false, via: null, earned: 0, code: 'trap', text: trap.fb };
  return { correct: false, via: null, earned: 0, code: null, text: st.fb ?? 'Belum tepat. Periksa lagi langkahnya.' };
}

/** Skor untuk tampilan: koma desimal Indonesia (22,5). */
export const formatScore = (n) => String(Math.round(Number(n || 0) * 100) / 100).replace('.', ',');

/** Kategori capaian (untuk tampilan siswa saja). */
export function category(total, max) {
  const r = max ? total / max : 0;
  if (r >= 0.85) return 'Sangat baik';
  if (r >= 0.7) return 'Baik';
  if (r >= 0.5) return 'Cukup';
  return 'Perlu berlatih lagi';
}

/** Angka contoh materi: nilai tetap + nilai turunan yang dihitung fungsi domain. */
export function materialVars(topic) {
  const v = { ...(topic.vars ?? {}) };
  for (const [name, spec] of Object.entries(topic.derived ?? {})) v[name] = evaluate(spec, v);
  return v;
}

/** Untuk validasi: apakah teks memuat jawaban (format Rupiah)? */
export const leaksAnswer = (text, value) => isInt(value) && String(text).includes(formatRp(value));

/** Kunci satu tahap (nilai benar berdasarkan data soal). */
export function keyFor(item, stepId) {
  return answerKey(item)[stepId];
}

/** Hitungan untuk halaman hasil: tahap dikerjakan, benar, salah. */
export function tally(result) {
  const steps = result.items.flatMap((r) => r.steps);
  const answered = steps.filter((s) => s.answer !== null && s.answer !== undefined);
  // benar = tahapan berpikir benar (kunci atau konsisten/ECF); salah hitung (calc) dihitung salah walau dapat 0,5
  const correct = answered.filter((s) => s.via === 'key' || s.via === 'ecf').length;
  return {
    totalSteps: steps.length,
    answered: answered.length,
    correct,
    wrong: answered.length - correct,
    itemsDone: result.items.filter((r) => r.steps.every((s) => s.answer !== null && s.answer !== undefined)).length,
    percent: result.max ? Math.round((100 * result.total) / result.max) : 0,
  };
}

/** Angka pembahasan satu soal: data soal + nilai turunan (dihitung fungsi domain). */
export function discussionVars(item) {
  return materialVars({ vars: item.vars, derived: item.discussion?.derived ?? {} });
}
