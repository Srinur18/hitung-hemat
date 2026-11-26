// Mesin langkah Teman Mikir (offline). HARUS identik dengan backend/app/tutor/engine.py —
// paritas diuji lewat shared/test-vectors.json ("tutor"). Fungsi murni: tanpa React, tanpa I/O.
//
// Bila server/Gemini tidak tersedia, aplikasi memakai `fallback` dari rencana ini sebagai balasan,
// sehingga Teman Mikir tetap berjalan penuh tanpa internet.

export const EVENTS = ['open', 'wrong', 'chip', 'done'];
export const PHASES = ['solve', 'sanity'];
export const MAX_LEVEL = 4;
const ROLE_CHIP = 'role_';

export class TurnError extends Error {}

const has = (o, k) => o != null && Object.prototype.hasOwnProperty.call(o, k);
const byLabel = (a, b) => (a.label < b.label ? -1 : a.label > b.label ? 1 : 0);

/** Chip peran: peran benar + satu pengecoh (urut label agar posisi tidak membocorkan) + "Aku bingung". */
export function roleChips(tutor, role) {
  const labels = tutor.roleLabels;
  const other = tutor.roleDistractor[role];
  const roles = [...new Set([role, other])].filter((r) => has(labels, r));
  const chips = roles.map((r) => ({ id: ROLE_CHIP + r, label: labels[r], role: r })).sort(byLabel);
  chips.push({ id: 'tr_help', label: 'Aku bingung', escalate: true, difficulty: 'memahami_soal' });
  return chips;
}

export function chipsFor(tutor, move, role) {
  const spec = tutor.moves[move].chips;
  return spec === 'roles' ? roleChips(tutor, role) : spec.map((c) => ({ ...c }));
}

function texts(tutor, move, mc) {
  const m = tutor.moves[move];
  const info = tutor.mc[mc];
  const goal = m.goal === 'mc' ? info.goal : m.goal === 'mc_why' ? info.whyGoal : m.goal;
  const fallback = m.fallback === 'mc' ? info.fallback : m.fallback === 'mc_why' ? info.why : m.fallback;
  return [goal, fallback];
}

function turn(tutor, move, { role, level, mc = null, ...extra }) {
  const m = tutor.moves[move];
  const [goal, fallback] = texts(tutor, move, mc || 'NONE');
  const out = {
    move,
    stage: m.stage,
    level,
    mc,
    goal,
    fallback,
    chips: chipsFor(tutor, move, role).map((c) => ({ id: c.id, label: c.label })),
    action: null,
    difficulty: null,
    reflect: null,
    competence: false,
    close: false,
  };
  if (move === 'hint' || move === 'example') out.action = move;
  if (move === 'error') out.difficulty = tutor.mc[mc || 'NONE'].difficulty;
  return Object.assign(out, extra);
}

function closed(level, extra) {
  return Object.assign(
    { move: null, stage: null, level, mc: null, goal: null, fallback: null, chips: [], action: null,
      difficulty: null, reflect: null, competence: false, close: true },
    extra,
  );
}

export function normalizeMc(tutor, mc) {
  return has(tutor.mc, mc) ? mc : 'NONE';
}

/**
 * Satu giliran Teman Mikir → rencana balasan (tanpa teks Gemini).
 * @param {object} tutor isi shared/content/tutor.json
 * @param {{role:string, event:'open'|'wrong'|'chip'|'done', phase?:'solve'|'sanity', step_index?:number,
 *          move?:string|null, chip_id?:string|null, mc?:string|null, level?:number}} input
 */
export function planTurn(tutor, input) {
  const { role, event, phase = 'solve', step_index: stepIndex = 0, move = null, chip_id: chipId = null, mc = null } = input;
  if (!EVENTS.includes(event)) throw new TurnError('event tidak dikenal');
  if (!PHASES.includes(phase)) throw new TurnError('fase tidak dikenal');
  const level = Math.min(MAX_LEVEL, Math.max(1, Math.trunc(Number(input.level ?? 1)) || 1));

  if (event === 'done') return turn(tutor, 'reflection', { role, level, competence: true });
  if (event === 'wrong') return turn(tutor, 'error', { role, level, mc: normalizeMc(tutor, mc) });
  if (event === 'open') {
    if (phase === 'sanity') return turn(tutor, 'sanity', { role, level });
    return turn(tutor, stepIndex === 0 ? 'orientation' : 'transformation', { role, level });
  }

  // event === 'chip'
  if (!has(tutor.moves, move)) throw new TurnError('tahap tidak dikenal');
  let chip = chipsFor(tutor, move, role).find((c) => c.id === chipId);
  if (!chip) throw new TurnError('pilihan tidak dikenal');
  const keepMc = move === 'error' || move === 'error_why' ? normalizeMc(tutor, mc) : null;
  const extra = {};
  if (chip.difficulty) extra.difficulty = chip.difficulty;
  if (chip.reflect) extra.reflect = chip.reflect;
  if (chip.tool) extra.action = chip.tool;

  if (chip.role) {
    if (chip.role === role) return turn(tutor, 'planning', { role, level, competence: true });
    if (move === 'transformation') {
      return turn(tutor, 'transformation_retry', { role, level, difficulty: 'memahami_soal' });
    }
    chip = { escalate: true };
    extra.difficulty = 'memahami_soal';
  }

  if (chip.escalate) {
    const newLevel = Math.min(MAX_LEVEL, level + 1);
    const target = tutor.levels[String(newLevel)].move;
    const out = turn(tutor, target, { role, level: newLevel, mc: keepMc });
    if (extra.difficulty || keepMc) out.difficulty = extra.difficulty || tutor.mc[keepMc].difficulty;
    return out;
  }

  const nxt = chip.next;
  if (nxt === 'close' || nxt === 'end') return closed(level, extra);
  const out = turn(tutor, nxt, { role, level, mc: nxt === 'error' || nxt === 'error_why' ? keepMc : null });
  for (const [k, v] of Object.entries(extra)) if (v !== null && v !== undefined) out[k] = v;
  return out;
}

/** Teks balasan offline (teks cadangan), termasuk apresiasi "Tepat!" bila perlu. */
export function offlineText(tutor, plan) {
  if (plan.close) return null;
  return plan.competence ? `${tutor.competencePrefix} ${plan.fallback}` : plan.fallback;
}
