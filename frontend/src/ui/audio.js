// Sistem suara HitungHemat.
// - Efek suara disintesis dengan Web Audio API (tanpa berkas → bebas lisensi, ukuran APK tetap kecil).
// - Aset asli bisa dipasang kapan saja: registerSound('correct', 'sounds/benar.mp3').
// - Tidak ada suara sebelum interaksi siswa (aturan peramban + P12). Musik latar MATI bawaan,
//   hanya menyala bila siswa menyalakannya, dan dijeda otomatis saat mengerjakan soal (beban kognitif).
// - Volume rendah. Pengaturan disimpan per perangkat (localStorage, aman bila diblokir).

const KEY = 'hh-sound-v1';
const DEFAULTS = { sfx: true, music: false, volume: 0.35, musicVolume: 0.18 }; // musik 18% (pemilik produk: 15–20%)

function load() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

let settings = load();
let ctx = null;
let master = null;
let musicGain = null; // jalur musik terpisah → volume musik diatur sendiri
let unlocked = false; // sudah ada interaksi siswa?
let musicTimer = null;
let musicPaused = false;
const assets = {};
const listeners = new Set();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* penyimpanan diblokir: pengaturan hanya berlaku sesi ini */
  }
  listeners.forEach((fn) => fn(settings));
}

function audio() {
  if (!unlocked) return null;
  if (!ctx) {
    const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
    if (!AC) return null;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = settings.volume;
      master.connect(ctx.destination);
      musicGain = ctx.createGain();
      musicGain.gain.value = settings.musicVolume;
      musicGain.connect(ctx.destination);
    } catch {
      ctx = null;
      return null;
    }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone(c, { f, at = 0, dur = 0.12, type = 'sine', gain = 0.25, to, out }) {
  const t0 = c.currentTime + at;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(out ?? master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/** Resep efek suara (nada lembut, pendek). */
const RECIPES = {
  click: [{ f: 760, dur: 0.05, type: 'triangle', gain: 0.12 }],
  correct: [
    { f: 660, dur: 0.12, gain: 0.2 },
    { f: 990, at: 0.1, dur: 0.2, gain: 0.2 },
  ],
  wrong: [
    { f: 330, dur: 0.14, type: 'triangle', gain: 0.16 },
    { f: 262, at: 0.12, dur: 0.22, type: 'triangle', gain: 0.16 },
  ],
  success: [
    { f: 523, dur: 0.12 },
    { f: 659, at: 0.1, dur: 0.12 },
    { f: 784, at: 0.2, dur: 0.12 },
    { f: 1047, at: 0.3, dur: 0.35 },
  ],
  badge: [
    { f: 784, dur: 0.1, type: 'triangle' },
    { f: 1047, at: 0.09, dur: 0.1, type: 'triangle' },
    { f: 1319, at: 0.18, dur: 0.1, type: 'triangle' },
    { f: 1568, at: 0.27, dur: 0.4, type: 'triangle', gain: 0.18 },
  ],
  coin: [
    { f: 988, dur: 0.07, type: 'square', gain: 0.08 },
    { f: 1319, at: 0.06, dur: 0.18, type: 'square', gain: 0.08 },
  ],
};

/** Pasang berkas suara asli (mis. dari folder public/sounds) untuk menggantikan suara sintesis. */
export function registerSound(name, url) {
  assets[name] = url;
}

/** @param {'click'|'correct'|'wrong'|'success'|'badge'|'coin'} name */
export function play(name) {
  if (!settings.sfx || !unlocked) return;
  if (assets[name]) {
    try {
      const a = new Audio(assets[name]);
      a.volume = settings.volume;
      a.play().catch(() => {});
    } catch {
      /* abaikan */
    }
    return;
  }
  const c = audio();
  if (!c) return;
  for (const n of RECIPES[name] ?? []) tone(c, n);
}

/* ---------------- musik latar "Plum Arcade" ----------------
   Instrumental cute-arcade yang lembut: arpeggio pentatonik + bass pelan, disintesis Web Audio
   (legal, offline, 0 KB). Suasana menyesuaikan halaman (setMusicMode). Hanya ADA SATU pemutar:
   pindah halaman cukup mengganti suasana, tidak pernah memulai musik kedua (tidak bertumpuk).
   Berkas musik asli bisa dipasang nanti: registerMusic('home', 'music/arcade.mp3'). */
const SCALE = {
  // nada (Hz) per suasana; tempo dalam ms per ketukan; gain relatif terhadap volume musik
  home: { melody: [523, 659, 784, 659, 587, 698, 880, 698, 523, 659, 784, 1047, 880, 784, 659, 587], bass: [131, 131, 175, 175, 147, 147, 196, 196], tempo: 400, gain: 0.32, wave: 'triangle' },
  calm: { melody: [440, 523, 659, 523, 494, 587, 659, 587], bass: [110, 110, 147, 147], tempo: 640, gain: 0.26, wave: 'sine' },
  soft: { melody: [523, 659, 587, 523, 494, 523, 587, 659], bass: [131, 147], tempo: 720, gain: 0.16, wave: 'sine' },
  happy: { melody: [587, 740, 880, 740, 659, 784, 988, 784, 587, 740, 880, 1175, 988, 880, 784, 659], bass: [147, 147, 196, 196, 165, 165, 220, 220], tempo: 330, gain: 0.34, wave: 'triangle' },
};
export const MUSIC_MODES = ['home', 'calm', 'soft', 'happy', 'off'];
let musicMode = 'home';
const musicFiles = {};
let musicEl = null; // pemutar berkas (jika registerMusic dipakai)

/** Halaman → suasana musik. Tes (literasi, tes awal/akhir, cek kesiapan) → 'off'. */
export function musicModeFor(screenName, opts = {}) {
  if (opts.testing) return 'off';
  if (['home', 'greeting', 'identity'].includes(screenName)) return 'home';
  if (['material-hub', 'material', 'formulas', 'glossary', 'journey'].includes(screenName)) return 'calm';
  if (['sim'].includes(screenName)) return 'happy';
  if (['literacy-result', 'profile', 'testhub', 'research'].includes(screenName)) return 'home';
  return 'soft'; // peta belajar, modul, latihan literasi
}

export function registerMusic(mode, url) {
  musicFiles[mode] = url;
}

function startMusic() {
  if (!settings.music || musicPaused || musicMode === 'off') return;
  if (musicFiles[musicMode]) {
    if (musicTimer) stopSynth();
    if (!musicEl) {
      musicEl = new Audio();
      musicEl.loop = true;
    }
    if (!musicEl.src.endsWith(musicFiles[musicMode])) musicEl.src = musicFiles[musicMode];
    musicEl.volume = settings.musicVolume;
    musicEl.play().catch(() => {});
    return;
  }
  if (musicTimer) return; // sudah berjalan → jangan menumpuk
  const c = audio();
  if (!c) return;
  let step = 0;
  musicTimer = setInterval(tick, SCALE[musicMode].tempo);
  function tick() {
    if (!ctx || musicPaused) return;
    const sc = SCALE[musicMode];
    if (!sc) return;
    tone(ctx, { f: sc.melody[step % sc.melody.length], dur: (sc.tempo / 1000) * 1.05, gain: sc.gain * 0.5, type: sc.wave, out: musicGain });
    if (step % 2 === 0) tone(ctx, { f: sc.bass[(step / 2) % sc.bass.length], dur: (sc.tempo / 1000) * 2, gain: sc.gain * 0.45, type: 'sine', out: musicGain });
    step += 1;
  }
}

function stopSynth() {
  clearInterval(musicTimer);
  musicTimer = null;
}

function stopMusic() {
  stopSynth();
  if (musicEl) musicEl.pause();
}

/** Ganti suasana musik sesuai halaman (tanpa membuat pemutar kedua). */
export function setMusicMode(mode) {
  const next = MUSIC_MODES.includes(mode) ? mode : 'home';
  if (next === musicMode) return;
  const tempoChanged = SCALE[next]?.tempo !== SCALE[musicMode]?.tempo;
  musicMode = next;
  if (next === 'off') return stopMusic();
  if (musicTimer && tempoChanged) stopSynth(); // mulai ulang dengan tempo baru (tetap satu pemutar)
  if (settings.music && unlocked) startMusic();
  return undefined;
}

/** Untuk pengujian & tampilan: apakah musik sedang berbunyi, dan suasananya. */
export function musicState() {
  return { playing: !!musicTimer || !!(musicEl && !musicEl.paused), mode: musicMode, timers: musicTimer ? 1 : 0 };
}

/** Dipanggil App pada interaksi pertama siswa (ketukan): baru boleh ada suara. */
export function unlock() {
  if (unlocked) return;
  unlocked = true;
  if (settings.music) startMusic();
}

/** Jeda paksa (dipertahankan untuk kompatibilitas). */
export function setMusicPaused(paused) {
  musicPaused = paused;
  if (paused) stopMusic();
  else if (settings.music && unlocked) startMusic();
}

export function getSettings() {
  return settings;
}

export function setSetting(patch) {
  settings = { ...settings, ...patch };
  if (master) master.gain.value = settings.volume;
  if (musicGain) musicGain.gain.value = settings.musicVolume;
  if (musicEl) musicEl.volume = settings.musicVolume;
  if ('music' in patch) {
    unlocked = true; // menyalakan musik selalu lewat ketukan siswa
    if (settings.music) startMusic();
    else stopMusic();
  }
  save();
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
