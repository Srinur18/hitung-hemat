// Panel pilihan tema (dipakai di Profil): dua tombol besar, tema aktif diberi tanda ✓ dan bingkai.
// Pindah tema langsung berlaku tanpa memuat ulang aplikasi.
import { useEffect, useState } from 'react';
import { t } from '../i18n/id.js';
import { getTheme, setTheme, subscribe, THEMES } from './theme.js';

export function useTheme() {
  const [theme, setT] = useState(getTheme());
  useEffect(() => subscribe(setT), []);
  return theme;
}

const LABEL = { dark: () => t.themeDark, light: () => t.themeLight };

export function ThemeSettings() {
  const theme = useTheme();
  return (
    <div className="card stack theme-card">
      <div className="section-title">{t.themeTitle}</div>
      <div className="theme-options" role="radiogroup" aria-label={t.themeTitle}>
        {THEMES.map((id) => {
          const on = theme === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={on}
              className={`theme-opt ${on ? 'on' : ''}`}
              onClick={() => setTheme(id)}
            >
              {/* contoh warna tema: latar, kartu, aksen */}
              <span className={`theme-swatch sw-${id}`} aria-hidden="true"><i /><i /><i /></span>
              <b>{LABEL[id]()}</b>
              <small>{on ? `✓ ${t.themeActive}` : t.themeChoose}</small>
            </button>
          );
        })}
      </div>
      <div className="muted small">{t.themeNote}</div>
    </div>
  );
}
