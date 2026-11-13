// Sistem suara HitungHemat.
// - Efek suara disintesis dengan Web Audio API (tanpa berkas → bebas lisensi, ukuran APK tetap kecil).
// - Aset asli bisa dipasang kapan saja: registerSound('correct', 'sounds/benar.mp3').
// - Tidak ada suara sebelum interaksi siswa (aturan peramban + P12). Musik latar MATI bawaan,
//   hanya menyala bila siswa menyalakannya, dan dijeda otomatis saat mengerjakan soal (beban kognitif).
// - Volume rendah. Pengaturan disimpan per perangkat (localStorage, aman bila diblokir).

const KEY = 'hh-sound-v1';
const DEFAULTS = { sfx: true, music: false, volume: 0.35 };

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
    } catch {
      ctx = null;
      return null;
    }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone(c, { f, at = 0, dur = 0.12, type = 'sine', gain = 0.25, to }) {
  const t0 = c.currentTime + at;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(master);
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

/* ---------------- musik latar: arpeggio pentatonik pelan ---------------- */
const MELODY = [523, 659, 784, 659, 587, 698, 880, 698, 523, 659, 784, 1047, 880, 784, 659, 587];
const BASS = [131, 131, 175, 175, 147, 147, 196, 196];

function startMusic() {
  if (musicTimer || !settings.music || musicPaused) return;
  const c = audio();
  if (!c) return;
  let step = 0;
  musicTimer = setInterval(() => {
    if (!ctx || musicPaused) return;
    tone(ctx, { f: MELODY[step % MELODY.length], dur: 0.42, gain: 0.045, type: 'sine' });
    if (step % 2 === 0) tone(ctx, { f: BASS[(step / 2) % BASS.length], dur: 0.8, gain: 0.04, type: 'triangle' });
    step += 1;
  }, 420);
}

function stopMusic() {
  clearInterval(musicTimer);
  musicTimer = null;
}

/** Dipanggil App pada interaksi pertama siswa (ketukan): baru boleh ada suara. */
export function unlock() {
  if (unlocked) return;
  unlocked = true;
  if (settings.music) startMusic();
}

/** Musik dijeda saat siswa mengerjakan soal agar tidak mengganggu konsentrasi. */
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
