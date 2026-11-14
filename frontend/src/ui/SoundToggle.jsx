// Tombol suara: efek suara dan musik latar bisa dinyalakan/dimatikan kapan saja.
import { useEffect, useState } from 'react';
import { t } from '../i18n/id.js';
import { getSettings, musicState, play, setSetting, subscribe } from './audio.js';

export function useSound() {
  const [s, setS] = useState(getSettings());
  useEffect(() => subscribe((x) => setS({ ...x })), []);
  return s;
}

/** Dua tombol kecil 🔊 / 🎵 (dipakai di beranda). */
export function SoundButtons() {
  const s = useSound();
  return (
    <div className="sound-btns">
      <button
        className={`sound-btn ${s.sfx ? 'on' : ''}`}
        aria-pressed={s.sfx}
        aria-label={s.sfx ? t.soundOff : t.soundOn}
        onClick={() => {
          setSetting({ sfx: !s.sfx });
          if (!s.sfx) play('click');
        }}
      >
        {s.sfx ? '🔊' : '🔇'}
      </button>
      <button
        className={`sound-btn ${s.music ? 'on' : ''}`}
        aria-pressed={s.music}
        aria-label={s.music ? t.musicOff : t.musicOn}
        onClick={() => setSetting({ music: !s.music })}
      >
        🎵
      </button>
    </div>
  );
}

/** Tombol musik kecil di header setiap halaman: mainkan/jeda. Selama tes musik dimatikan otomatis. */
export function MusicButton() {
  const s = useSound();
  const st = musicState();
  return (
    <button
      className={`icon-btn music-btn ${s.music ? 'on' : ''}`}
      aria-pressed={s.music}
      aria-label={s.music ? t.musicOff : t.musicOn}
      title={st.mode === 'off' && s.music ? t.musicTestOff : undefined}
      onClick={() => setSetting({ music: !s.music })}
    >
      {s.music ? '🎵' : '🔇'}
    </button>
  );
}

/** Panel pengaturan suara lengkap (dipakai di Profil). */
export function SoundSettings() {
  const s = useSound();
  return (
    <div className="card stack">
      <div className="section-title">{t.soundTitle}</div>
      <label className="row toggle-row">
        <span className="grow">{t.soundEffects}</span>
        <input type="checkbox" checked={s.sfx} onChange={(e) => setSetting({ sfx: e.target.checked })} />
      </label>
      <label className="row toggle-row">
        <span className="grow">{t.music}</span>
        <input type="checkbox" checked={s.music} onChange={(e) => setSetting({ music: e.target.checked })} />
      </label>
      <label className="stack small">
        {t.musicVolume}: <b>{Math.round(s.musicVolume * 100)}%</b>
        <input
          type="range"
          min="0"
          max="0.6"
          step="0.02"
          value={s.musicVolume}
          aria-label={t.musicVolume}
          onChange={(e) => setSetting({ musicVolume: Number(e.target.value) })}
        />
      </label>
      <label className="stack small">
        {t.volume}
        <input
          type="range"
          min="0.05"
          max="0.8"
          step="0.05"
          value={s.volume}
          onChange={(e) => setSetting({ volume: Number(e.target.value) })}
          onPointerUp={() => play('click')}
        />
      </label>
      <div className="muted small">{t.soundNote}</div>
      <div className="muted small">{t.musicManual}</div>
    </div>
  );
}
