// Komponen dasar. Aturan: satu langkah per layar, ≤ 3 aksi utama, tanpa dekorasi.
import { createContext, useContext, useState } from 'react';
import { glossary } from '../content/index.js';
import { formatValue } from '../domain/money.js';
import { parseText } from '../domain/text.js';
import { t } from '../i18n/id.js';
import Icon from './Icon.jsx';
import Mascot from './Mascot.jsx';

/** Disediakan App: fungsi kembali ke Beranda. Header menampilkan tombol 🏠 di setiap halaman. */
export const HomeContext = createContext(null);

export function Header({ title, sub, onBack, right }) {
  const goHome = useContext(HomeContext);
  return (
    <header className="header">
      {onBack ? (
        <button className="icon-btn" onClick={onBack} aria-label={t.back}>←</button>
      ) : (
        <span style={{ width: 8 }} />
      )}
      <h1>
        {title}
        {sub && <div className="sub">{sub}</div>}
      </h1>
      {goHome && (
        <button className="icon-btn" onClick={goHome} aria-label={t.home}>
          <Icon name="home" />
        </button>
      )}
      {right}
    </header>
  );
}

export function Sheet({ children, onClose }) {
  return (
    <div className="sheet-backdrop" onClick={onClose} role="presentation">
      <div className="sheet stack" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export function GlossarySheet({ id, onClose }) {
  const g = glossary[id];
  if (!g) return null;
  return (
    <Sheet onClose={onClose}>
      <h2>{g.term}</h2>
      <p>{g.meaning}</p>
      <button className="btn btn-block" onClick={onClose}>{t.close}</button>
    </Sheet>
  );
}

/**
 * Teks soal dengan penanda warna (signaling), istilah yang bisa diketuk, dan Mode Tandai.
 * @param {{text:string, vars:object, signaling?:boolean, mark?:{labels:object, onTap:(seg,i)=>void}}} props
 */
export function RichText({ text, vars, signaling = true, mark, className = 'problem-text' }) {
  const [term, setTerm] = useState(null);
  const segs = parseText(text, vars);
  return (
    <>
      <p className={`${className} ${signaling && !mark ? 'signal' : ''}`}>
        {segs.map((s, i) => {
          if (s.type === 'text') return <span key={i}>{s.text}</span>;
          if (s.type === 'term') {
            return (
              <button key={i} className="term" onClick={() => setTerm(s.id)}>
                {glossary[s.id]?.term.toLowerCase() ?? s.id}
              </button>
            );
          }
          if (mark && s.role !== 'item') {
            const lab = mark.labels[i];
            return (
              <button key={i} className={`markable ${lab ? `m-${lab}` : ''}`} onClick={() => mark.onTap(s, i)}>
                {s.text}
              </button>
            );
          }
          return (
            <span key={i} className={`n n-${s.role}`}>
              {s.text}
            </span>
          );
        })}
      </p>
      {term && <GlossarySheet id={term} onClose={() => setTerm(null)} />}
    </>
  );
}

/** Diagram Kotak [Harga Awal] − [Diskon] = [Harga Akhir] (FR-21, DS01). */
export function BoxDiagram({ boxes, vars, known }) {
  if (!boxes) return null;
  const cell = (name, label, role) => {
    const isKnown = name && known.has(name);
    return (
      <div className={`box box-${role} ${isKnown ? '' : 'unknown'}`}>
        <small>{label}</small>
        <b>{isKnown ? formatValue(vars[name], 'price') : '?'}</b>
      </div>
    );
  };
  return (
    <div className="boxes" aria-label="Diagram harga">
      {cell(boxes.awal, t.roles.price, 'price')}
      <span className="op">−</span>
      {cell(boxes.diskon, t.roles.discount, 'discount')}
      <span className="op">=</span>
      {cell(boxes.akhir, t.roles.result, 'result')}
    </div>
  );
}

export function FormulaDock({ formula, defaultOpen }) {
  if (!formula) return null;
  return (
    <details className="card formula" open={defaultOpen}>
      <summary>{t.formula}</summary>
      <div>{formula}</div>
    </details>
  );
}

/** Papan angka buatan sendiri (tanpa keyboard sistem agar tata letak stabil). */
export function NumberPad({ value, onChange, kind = 'rupiah', role }) {
  const press = (k) => {
    if (k === '⌫') return onChange(value.slice(0, -1));
    if (k === ',' && (value.includes(',') || !value)) return undefined;
    if (value.replace(/\D/g, '').length >= 9) return undefined;
    if (value === '0' && k !== ',') return onChange(k === '000' ? '0' : k);
    return onChange(value + k);
  };
  const shown = kind === 'rupiah' && value ? formatValue(Number(value), 'price') : value + (kind === 'percent' && value ? '%' : '');
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', kind === 'rupiah' ? '000' : ',', '0', '⌫'];
  return (
    <div className="stack">
      <div className={`answer r-${role}`} aria-live="polite">
        {value ? shown : <span className="ph">{kind === 'rupiah' ? 'Rp …' : '… %'}</span>}
      </div>
      <div className="numpad">
        {keys.map((k) => (
          <button key={k} onClick={() => press(k)} aria-label={k === '⌫' ? 'hapus' : k}>
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Feedback({ kind, children, kiko = false }) {
  if (!children) return null;
  return (
    <div className={`feedback ${kind} ${kiko ? 'with-kiko' : ''}`} role="status">
      {kiko && <Mascot mood={kind === 'good' ? 'cheer' : 'think'} size={44} />}
      <span>{children}</span>
    </div>
  );
}

export function Stars({ n }) {
  return (
    <span className="stars" aria-label={`${n} bintang`}>
      {'★'.repeat(n)}
      <span className="muted">{'★'.repeat(3 - n)}</span>
    </span>
  );
}
