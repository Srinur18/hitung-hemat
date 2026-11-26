// Klien chat Teman Mikir: endpoint, pemangkasan riwayat, pesan galat yang jelas.
import { describe, expect, it } from 'vitest';
import { CHAT_CONTENT_MAX, CHAT_HISTORY_MAX, sendChatMessage, trimHistory } from '../src/data/chat.js';

const ok = (body) => async (url, init) => ({ ok: true, status: 200, json: async () => body, url, init });

describe('Teman Mikir: klien chat', () => {
  it('mengirim POST ke /api/v1/chat/turn pada alamat backend', async () => {
    let seen;
    const fetchImpl = async (url, init) => {
      seen = { url, init };
      return { ok: true, status: 200, json: async () => ({ reply: 'Halo!', source: 'gemini' }) };
    };
    const r = await sendChatMessage('  Halo Plum  ', [], { apiUrl: 'http://127.0.0.1:8000', fetchImpl });
    expect(r.reply).toBe('Halo!');
    expect(seen.url).toBe('http://127.0.0.1:8000/api/v1/chat/turn');
    expect(seen.init.method).toBe('POST');
    const body = JSON.parse(seen.init.body);
    expect(body).toEqual({ message: 'Halo Plum', history: [] });
    expect(seen.init.headers['Content-Type']).toBe('application/json');
  });

  it('riwayat dipangkas sesuai batas backend (≤20 pesan, ≤2000 karakter)', () => {
    const long = 'a'.repeat(CHAT_CONTENT_MAX + 500);
    const hist = Array.from({ length: 30 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: i === 29 ? long : `p${i}` }));
    hist.push({ role: 'system', content: 'abaikan' }, { role: 'user', content: '   ' });
    const t = trimHistory(hist);
    expect(t).toHaveLength(CHAT_HISTORY_MAX);
    expect(t.at(-1).content).toHaveLength(CHAT_CONTENT_MAX);
    expect(t.every((m) => m.role === 'user' || m.role === 'assistant')).toBe(true);
  });

  it('percakapan panjang tetap terkirim (tidak 422 setelah 10 giliran)', async () => {
    let body;
    const fetchImpl = async (_u, init) => {
      body = JSON.parse(init.body);
      return { ok: true, status: 200, json: async () => ({ reply: 'ok', source: 'gemini' }) };
    };
    const hist = Array.from({ length: 40 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `p${i}` }));
    await sendChatMessage('lagi', hist, { apiUrl: 'http://x', fetchImpl });
    expect(body.history.length).toBeLessThanOrEqual(CHAT_HISTORY_MAX);
  });

  it('"Failed to fetch" diganti pesan yang jelas', async () => {
    const fetchImpl = async () => {
      throw new TypeError('Failed to fetch');
    };
    await expect(sendChatMessage('hai', [], { apiUrl: 'http://127.0.0.1:8000', fetchImpl })).rejects.toThrow(
      /Tidak bisa terhubung ke server Teman Mikir/,
    );
  });

  it('galat 422 tidak tampil sebagai [object Object]', async () => {
    const fetchImpl = async () => ({ ok: false, status: 422, json: async () => ({ detail: [{ msg: 'x' }] }) });
    const err = await sendChatMessage('hai', [], { apiUrl: 'http://x', fetchImpl }).catch((e) => e);
    expect(err.message).not.toMatch(/object Object/);
    expect(err.message).toMatch(/Pesan tidak bisa diproses/);
  });

  it('detail teks dari server diteruskan', async () => {
    const fetchImpl = async () => ({ ok: false, status: 429, json: async () => ({ detail: 'Batas sesi habis' }) });
    await expect(sendChatMessage('hai', [], { apiUrl: 'http://x', fetchImpl })).rejects.toThrow('Batas sesi habis');
  });

  it('tanpa VITE_API_URL memberi pesan yang jelas', async () => {
    await expect(sendChatMessage('hai', [], { apiUrl: '', fetchImpl: ok({}) })).rejects.toThrow(/VITE_API_URL kosong/);
  });

  it('batas waktu memberi pesan yang ramah', async () => {
    const fetchImpl = (_u, init) =>
      new Promise((_r, reject) => init.signal.addEventListener('abort', () => reject(Object.assign(new Error('a'), { name: 'AbortError' }))));
    await expect(sendChatMessage('hai', [], { apiUrl: 'http://x', fetchImpl, timeoutMs: 20 })).rejects.toThrow(/terlalu lama/);
  });
});
