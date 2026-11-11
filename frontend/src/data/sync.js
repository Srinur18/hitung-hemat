// Sinkronisasi opsional ke backend Python. Aplikasi tetap berjalan penuh tanpa server.
import { db } from './db.js';

export const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
const BATCH = 500;

const toWire = (e) => ({
  client_id: e.clientId,
  student_code: e.studentCode,
  session_id: e.sessionId,
  ts: e.ts,
  type: e.type,
  module_id: e.moduleId,
  problem_id: e.problemId,
  step_id: e.stepId,
  payload: e.payload,
});

/** @returns {Promise<{sent:number, skipped?:string}>} */
export async function syncEvents() {
  if (!API_URL) return { sent: 0, skipped: 'Server belum diatur (VITE_API_URL kosong)' };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { sent: 0, skipped: 'Offline' };
  let sent = 0;
  for (;;) {
    const batch = await db.events.where('synced').equals(0).limit(BATCH).toArray();
    if (!batch.length) break;
    const res = await fetch(`${API_URL}/api/v1/sync/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: batch.map(toWire) }),
    });
    if (!res.ok) throw new Error(`Sinkronisasi gagal (${res.status})`);
    await db.events.bulkUpdate(batch.map((e) => ({ key: e.id, changes: { synced: 1 } })));
    sent += batch.length;
  }
  return { sent };
}
