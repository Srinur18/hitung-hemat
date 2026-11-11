// Generator soal. Bagian `instantiate` HARUS identik dengan backend/app/domain/problems.py.
import { compute } from './discount.js';
import { mulberry32, shuffle } from './rng.js';

export const OPS = {
  '<': (a, b) => a < b,
  '<=': (a, b) => a <= b,
  '>': (a, b) => a > b,
  '>=': (a, b) => a >= b,
  '==': (a, b) => a === b,
  '!=': (a, b) => a !== b,
};
const MAX_TRIES = 500;

function draw(spec, rnd) {
  if (spec.choices) return spec.choices[Math.floor(rnd() * spec.choices.length)];
  const [lo, hi, step] = spec.range;
  const n = Math.floor((hi - lo) / step) + 1;
  return lo + Math.floor(rnd() * n) * step;
}

/** Inti generator (paritas dengan Python). @returns {{vars:object, answers:object}} */
export function instantiate(t, seed) {
  const rnd = mulberry32(seed);
  for (let i = 0; i < MAX_TRIES; i++) {
    const v = {};
    if (t.items?.length) v.item = t.items[Math.floor(rnd() * t.items.length)];
    for (const [k, s] of Object.entries(t.vars)) v[k] = draw(s, rnd);
    let ok = true;
    for (const [k, s] of Object.entries(t.derived ?? {})) {
      v[k] = compute(s, v);
      if (v[k] === null) {
        ok = false;
        break;
      }
    }
    const answers = {};
    if (ok) {
      for (const st of t.steps) {
        if (!st.compute) continue;
        const val = compute(st.compute, v);
        if (val === null) {
          ok = false;
          break;
        }
        answers[st.id] = val;
        if (st.saveAs) v[st.saveAs] = val;
      }
    }
    if (ok && (t.constraints ?? []).every(([a, op, b]) => OPS[op](v[a], v[b]))) {
      return { vars: v, answers };
    }
  }
  throw new Error(`Tidak bisa membuat soal bulat untuk seed ${seed}`);
}

function isCorrectOption(o, v) {
  if (o.correct) return true;
  if (o.correctIf) {
    const [a, op, b] = o.correctIf;
    return OPS[op](v[a], v[b]);
  }
  return false;
}

/**
 * Soal lengkap untuk UI: angka, jawaban, opsi teracak, dan teks pengecoh untuk soal transfer.
 * @param {object} curriculum isi curriculum.json
 */
export function buildProblem(curriculum, templateId, seed, { transfer = false } = {}) {
  const t = curriculum.templates[templateId];
  if (!t) throw new Error(`Template ${templateId} tidak ada`);
  const { vars, answers } = instantiate(t, seed);
  const extra = mulberry32((seed ^ 0x9e3779b9) >>> 0);

  let text = t.text;
  if (transfer && curriculum.distractors?.length) {
    const d = curriculum.distractors[Math.floor(extra() * curriculum.distractors.length)];
    for (const [k, s] of Object.entries(d.vars)) vars[k] = draw(s, extra);
    text = d.text + text;
  }

  const steps = t.steps.map((st) => {
    if (st.input !== 'choice') return { ...st, answer: answers[st.id] };
    const options = shuffle(
      st.options.map((o) => ({ ...o, isCorrect: isCorrectOption(o, vars) })),
      extra,
    );
    return { ...st, options, answer: options.findIndex((o) => o.isCorrect) };
  });

  const baseNames = new Set([...Object.keys(t.vars), ...Object.keys(t.derived ?? {})]);
  return {
    id: `${templateId}#${seed}`,
    templateId,
    seed,
    process: t.process,
    scene: t.scene ?? null,
    text,
    vars,
    steps,
    boxes: t.boxes ?? null,
    sanity: t.sanity ?? null,
    baseNames,
    transfer,
  };
}

/** Nama variabel yang sudah diketahui siswa setelah `solvedCount` langkah selesai. */
export function knownNames(problem, solvedCount) {
  const known = new Set(problem.baseNames);
  problem.steps.slice(0, solvedCount).forEach((s) => s.saveAs && known.add(s.saveAs));
  return known;
}

export function checkAnswer(step, answer) {
  return answer !== null && answer !== undefined && answer === step.answer;
}
