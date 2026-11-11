// Penyimpanan lokal (IndexedDB via Dexie). Offline penuh; tanpa nama/email/nomor HP.
import Dexie from 'dexie';

export const db = new Dexie('hitunghemat');

db.version(1).stores({
  profile: 'id', // satu baris: id = 'me'
  progress: 'key, studentCode', // key = `${studentCode}:${moduleId}`
  events: '++id, synced, type, studentCode',
});

const PROFILE_ID = 'me';

export async function getProfile() {
  return (await db.profile.get(PROFILE_ID)) ?? null;
}

export async function saveProfile(patch) {
  const cur = (await getProfile()) ?? { id: PROFILE_ID };
  const next = { ...cur, ...patch, id: PROFILE_ID };
  await db.profile.put(next);
  return next;
}

export async function resetProfile() {
  await db.profile.delete(PROFILE_ID);
}

export async function getProgress(studentCode) {
  const rows = await db.progress.where('studentCode').equals(studentCode).toArray();
  return Object.fromEntries(rows.map((r) => [r.moduleId, r]));
}

export async function saveProgress(studentCode, moduleId, patch) {
  const key = `${studentCode}:${moduleId}`;
  const cur = (await db.progress.get(key)) ?? { key, studentCode, moduleId, history: [], level: 0, stars: 0 };
  const next = { ...cur, ...patch };
  await db.progress.put(next);
  return next;
}
