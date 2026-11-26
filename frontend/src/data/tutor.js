// Klien Teman Mikir. Rencana giliran SELALU dihitung lokal (domain/tutor.js); server hanya dipakai
// untuk kalimat Gemini. Tanpa server, offline, galat, atau lambat → teks cadangan dari tutor.json.
// Tidak ada identitas siswa yang dikirim: hanya template, seed, langkah, dan pilihan chip.
import { tutor } from '../content/index.js';
import { offlineText, planTurn } from '../domain/tutor.js';
import { currentSessionId } from './events.js';
import { API_URL } from './sync.js';

export const TUTOR_TIMEOUT_MS = 10000;

/**
 * @param {{templateId:string, seed:number, stepId:string, role:string, stepIndex:number, phase:'solve'|'sanity',
 *          event:'open'|'wrong'|'chip'|'done', move?:string|null, chipId?:string|null, mc?:string|null, level?:number,
 *          answer?:number|null}} req
 * @param {{apiUrl?:string, fetchImpl?:typeof fetch, timeoutMs?:number}} [opts]
 * @returns {Promise<object>} rencana + {text, source:'gemini'|'fallback'|'offline', reason}
 */
export async function askTutor(req, { apiUrl = API_URL, fetchImpl = globalThis.fetch, timeoutMs = TUTOR_TIMEOUT_MS } = {}) {
  const plan = planTurn(tutor, {
    role: req.role,
    event: req.event,
    phase: req.phase,
    step_index: req.stepIndex,
    move: req.move ?? null,
    chip_id: req.chipId ?? null,
    mc: req.mc ?? null,
    level: req.level ?? 1,
  });
  const offline = (reason) => ({ ...plan, text: offlineText(tutor, plan), source: plan.close ? null : 'offline', reason });

  if (plan.close) return offline(null);
  if (!apiUrl) return offline('no_server');
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return offline('offline');
  if (typeof fetchImpl !== 'function') return offline('no_fetch');

  const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
  try {
    const res = await fetchImpl(`${apiUrl}/api/v1/tutor/turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl?.signal,
      body: JSON.stringify({
        template_id: req.templateId,
        seed: req.seed,
        step_id: req.stepId,
        event: req.event,
        phase: req.phase,
        move: req.move ?? null,
        chip_id: req.chipId ?? null,
        mc: req.mc ?? null,
        level: req.level ?? 1,
        answer: Number.isInteger(req.answer) && req.answer >= 0 ? req.answer : null, // R2: jawaban salah siswa sendiri
        session_id: currentSessionId(),
      }),
    });
    if (!res.ok) return offline(`http_${res.status}`);
    const j = await res.json();
    // Versi konten server berbeda → percayai rencana lokal agar alur tetap konsisten.
    if (j.move !== plan.move || j.level !== plan.level || typeof j.text !== 'string' || !j.text) return offline('mismatch');
    return { ...plan, text: j.text, source: j.source, reason: j.reason ?? null };
  } catch (e) {
    return offline(e?.name === 'AbortError' ? 'timeout' : 'network');
  } finally {
    if (timer) clearTimeout(timer);
  }
}
