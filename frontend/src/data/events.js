// Pencatat event penelitian (api.md §6). Semua event disimpan lokal, lalu disinkronkan bila server tersedia.
import { db } from './db.js';

const uuid = () =>
  globalThis.crypto?.randomUUID?.() ??
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

const ctx = { studentCode: null, sessionId: uuid() };

export function setStudent(code) {
  ctx.studentCode = code;
}

/**
 * @param {string} type contoh: 'answer_submit'
 * @param {{moduleId?:string, problemId?:string, stepId?:string, payload?:object}} [fields]
 */
export async function logEvent(type, fields = {}) {
  if (!ctx.studentCode) return;
  const { moduleId = null, problemId = null, stepId = null, payload = {} } = fields;
  try {
    await db.events.add({
      clientId: uuid(),
      studentCode: ctx.studentCode,
      sessionId: ctx.sessionId,
      ts: new Date().toISOString(),
      type,
      moduleId,
      problemId,
      stepId,
      payload,
      synced: 0,
    });
  } catch (e) {
    console.warn('Gagal mencatat event', e);
  }
}
