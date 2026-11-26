// Klien percakapan bebas Teman Mikir (Plum) → POST /api/v1/chat/turn (backend FastAPI).
// API key Gemini hanya ada di backend; frontend tidak pernah memegangnya.
import { API_URL } from './sync.js';

/** Batas sama dengan backend (schemas.ChatTurnIn): riwayat ≤ 20 pesan, tiap pesan ≤ 2000 karakter. */
export const CHAT_HISTORY_MAX = 20;
export const CHAT_CONTENT_MAX = 2000;
// 60 detik: server hosting gratis bisa "tidur" dan butuh ±30–60 detik untuk bangun pada pesan pertama.
export const CHAT_TIMEOUT_MS = 60000;

/** Riwayat yang aman dikirim: hanya user/assistant, tidak kosong, dipangkas, 20 pesan terakhir. */
export function trimHistory(history = []) {
  return history
    .filter((m) => (m?.role === 'user' || m?.role === 'assistant') && String(m.content ?? '').trim())
    .map((m) => ({ role: m.role, content: String(m.content).trim().slice(0, CHAT_CONTENT_MAX) }))
    .slice(-CHAT_HISTORY_MAX);
}

function detailText(detail) {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return 'Pesan tidak bisa diproses. Coba pesan yang lebih singkat.';
  return null;
}

export async function sendChatMessage(
  message,
  history = [],
  { apiUrl = API_URL, fetchImpl = globalThis.fetch, timeoutMs = CHAT_TIMEOUT_MS } = {},
) {
  if (!apiUrl) {
    throw new Error('Server belum diatur (VITE_API_URL kosong)');
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('Kamu sedang offline. Sambungkan internet lalu coba lagi.');
  }

  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
  let res;
  try {
    res = await fetchImpl(`${apiUrl}/api/v1/chat/turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: String(message).trim().slice(0, CHAT_CONTENT_MAX),
        history: trimHistory(history),
      }),
      signal: ctrl?.signal,
    });
  } catch (e) {
    if (e?.name === 'AbortError') throw new Error('Plum terlalu lama menjawab. Coba kirim lagi, ya.');
    // "Failed to fetch": server mati, alamat VITE_API_URL salah, atau origin halaman ditolak CORS.
    throw new Error(`Tidak bisa terhubung ke server Teman Mikir (${apiUrl}). Pastikan backend menyala.`);
  } finally {
    if (timer) clearTimeout(timer);
  }

  if (!res.ok) {
    let detail = `Chat gagal (${res.status})`;
    try {
      const data = await res.json();
      detail = detailText(data?.detail) ?? detail;
    } catch {
      /* respons bukan JSON */
    }
    throw new Error(detail);
  }

  return res.json();
}
