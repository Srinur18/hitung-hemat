// Ekspor CSV untuk peneliti. Di Android memakai Filesystem + Share; di browser mengunduh berkas.
import { Capacitor } from '@capacitor/core';
import { db } from './db.js';

const COLS = ['studentCode', 'sessionId', 'ts', 'type', 'moduleId', 'problemId', 'stepId', 'payload'];
const esc = (v) => {
  const s = typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function eventsCsv() {
  const rows = await db.events.orderBy('id').toArray();
  return [COLS.join(','), ...rows.map((r) => COLS.map((c) => esc(r[c])).join(','))].join('\n');
}

export async function exportCsv() {
  const csv = await eventsCsv();
  const name = `hitunghemat-${new Date().toISOString().slice(0, 10)}.csv`;
  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');
    const res = await Filesystem.writeFile({ path: name, data: csv, directory: Directory.Cache, encoding: Encoding.UTF8 });
    await Share.share({ title: 'Data HitungHemat', url: res.uri });
    return name;
  }
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
  return name;
}
