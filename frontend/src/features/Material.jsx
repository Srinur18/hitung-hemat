// Materi: Persentase Diskon (Rabat) & Potongan Harga.
// 5 bab → kartu satu per layar (P1), rumus di layar yang sama dengan contoh (P5),
// contoh bisa dijeda/diulang/dimundurkan (P7). Plus Rangkuman Rumus dan Kamus Istilah.
import { useEffect, useMemo, useState } from 'react';
import { glossary, material } from '../content/index.js';
import { logEvent } from '../data/events.js';
import { materialVars } from '../domain/literacy.js';
import { formatBp, formatRp } from '../domain/money.js';
import { percentTable } from '../domain/progress.js';
import { t } from '../i18n/id.js';
import { Header, RichText } from '../ui/components.jsx';
import Icon from '../ui/Icon.jsx';

export const chapters = material.chapters;
export const formulas = material.formulas;

const CH_TONE = ['pink', 'yellow', 'blue', 'green', 'purple'];

/** Daftar bab + dua fitur khusus. Dipakai di menu Materi dan tab Materi peta belajar. */
export function MaterialList({ onOpen, onFormulas, onGlossary, seen = [] }) {
  return (
    <div className="stack">
      <div className="muted small">{t.materialIntro}</div>
      {chapters.map((ch, i) => (
        <button key={ch.id} className={`card module btn chapter tone-${CH_TONE[i % CH_TONE.length]}`} style={{ '--i': i }} onClick={() => onOpen(i)}>
          <span className="id">{i + 1}</span>
          <span className="grow">
            <div>{ch.title}</div>
            <div className="muted small" style={{ fontWeight: 400 }}>{t.cardsCount(ch.cards.length)}</div>
          </span>
          {seen.includes(ch.id) && <span className="seen" aria-label={t.learned}>✓</span>}
        </button>
      ))}
      {(onFormulas || onGlossary) && (
        <div className="feature-row">
          {onFormulas && (
            <button className="feature-btn tone-blue" onClick={onFormulas}>
              <span className="menu-ic"><Icon name="quiz" /></span>
              <b>{t.formulaSummary}</b>
            </button>
          )}
          {onGlossary && (
            <button className="feature-btn tone-green" onClick={onGlossary}>
              <span className="menu-ic"><Icon name="book" /></span>
              <b>{t.glossaryTitle}</b>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ExampleSteps({ example, vars }) {
  const n = example.steps.length;
  const [shown, setShown] = useState(0);
  return (
    <div className="card stack example">
      <div className="step-label">{t.example}</div>
      <RichText text={example.text} vars={vars} className="" />
      <ol className="ex-steps">
        {example.steps.slice(0, shown).map((s, i) => (
          <li key={i} className="pop-in">
            <RichText text={s} vars={vars} className="" />
          </li>
        ))}
      </ol>
      {shown < n && <div className="muted small">{t.exampleHelp}</div>}
      <div className="player-ctrl">
        <button className="icon-btn" onClick={() => setShown((x) => Math.max(0, x - 1))} aria-label="Langkah sebelumnya">◀</button>
        <button className="icon-btn" onClick={() => setShown(0)} aria-label={t.replay}>↻</button>
        <button className="icon-btn" onClick={() => setShown((x) => Math.min(n, x + 1))} aria-label="Langkah berikutnya">▶</button>
      </div>
    </div>
  );
}

/** Tabel arti persen: persen → pecahan → desimal → potongan → harga akhir (angka dari domain). */
function PercentTable({ price, pcts }) {
  const rows = percentTable(price, pcts);
  const maxD = Math.max(...rows.map((r) => r.disc));
  return (
    <div className="card pct-table" aria-label={t.percentTable}>
      <div className="pct-row head small">
        <span>{t.roles.percent}</span><span>Pecahan</span><span>Desimal</span><span>{t.roles.discount}</span>
      </div>
      {rows.map((r) => (
        <div key={r.pct} className="pct-row">
          <b className="c-percent">{formatBp(r.pct)}</b>
          <span>{r.frac}</span>
          <span>{r.dec}</span>
          <b className="c-discount">{formatRp(r.disc)}</b>
          <span className="pct-bar" aria-hidden="true"><span style={{ width: `${(100 * r.disc) / maxD}%` }} /></span>
        </div>
      ))}
    </div>
  );
}

/** Satu bab: kartu demi kartu. */
export function MaterialChapter({ index, card = 0, onNav, onBack, onSeen = () => {} }) {
  const ch = chapters[index];
  const c = ch.cards[card];
  const vars = useMemo(() => materialVars(c), [c]);
  const lastCard = card === ch.cards.length - 1;
  const lastChapter = index === chapters.length - 1;

  useEffect(() => {
    logEvent('material_view', { payload: { topic: c.id } });
    if (lastCard) onSeen(ch.id);
    window.scrollTo?.(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.id]);

  const next = () => {
    if (!lastCard) return onNav(index, card + 1);
    if (!lastChapter) return onNav(index + 1, 0);
    return onBack();
  };
  const prev = () => (card > 0 ? onNav(index, card - 1) : onNav(index - 1, chapters[index - 1].cards.length - 1));

  return (
    <div className="screen">
      <Header title={`Bab ${index + 1}. ${ch.title}`} sub={t.cardOf(card + 1, ch.cards.length)} onBack={onBack} />
      <div className="dots" aria-hidden="true">
        {ch.cards.map((x, k) => <span key={x.id} className={k <= card ? 'on' : ''} />)}
      </div>
      <div className="stack grow card-in" key={c.id}>
        <div className="section-title">{c.title}</div>
        <RichText text={c.body} vars={vars} className="problem-text" />
        {c.points && (
          <ul className="card points">
            {c.points.map((pt, i) => <li key={i} className="pop-in" style={{ animationDelay: `${i * 0.08}s` }}>{pt}</li>)}
          </ul>
        )}
        {c.formula && (
          <div className="card formula" aria-label={t.formula}>
            <div className="step-label">{t.formula}</div>
            <b>{c.formula}</b>
          </div>
        )}
        {c.table && <PercentTable price={vars[c.table.price]} pcts={c.table.pcts} />}
        {c.example && <ExampleSteps key={c.id} example={c.example} vars={vars} />}
      </div>
      <div className="actions">
        {(card > 0 || index > 0) && <button className="btn" onClick={prev}>{t.prevTopic}</button>}
        <button className="btn btn-primary" onClick={next}>
          {lastCard && lastChapter ? t.finish : lastCard ? t.nextChapter : t.nextTopic}
        </button>
      </div>
    </div>
  );
}

/** Kompatibilitas: indeks bab lama → bab baru (dipakai App sebelum v0.4). */
export function MaterialTopic({ index, onIndex, onBack }) {
  return <MaterialChapter index={Math.min(index, chapters.length - 1)} onNav={(i) => onIndex(i)} onBack={onBack} />;
}

/** Rangkuman Rumus dalam kartu. */
export function FormulaSummary({ onBack }) {
  return (
    <div className="screen">
      <Header title={t.formulaSummary} onBack={onBack} />
      <div className="stack grow">
        <div className="muted small">{t.formulaNote}</div>
        {formulas.map((f, i) => {
          const v = materialVars(f);
          return (
            <div key={f.id} className={`card formula-card tone-${['pink', 'blue', 'green'][i % 3]} pop-in`} style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="formula-name">{f.name}</div>
              <div className="formula-main">{f.formula}</div>
              <div className="formula-short">{f.short}</div>
              <dl className="symbols">
                {f.symbols.map(([sym, mean]) => (
                  <div key={sym}><dt>{sym}</dt><dd>{mean}</dd></div>
                ))}
              </dl>
              <div className="step-label">{t.example}</div>
              <ol className="ex-steps">
                {f.example.map((s, k) => <li key={k}><RichText text={s} vars={v} className="" /></li>)}
              </ol>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Kamus Istilah: daftar istilah yang bisa dibuka. */
export function Glossary({ onBack }) {
  const [q, setQ] = useState('');
  const entries = Object.entries(glossary).filter(([, g]) => g.term.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className="screen">
      <Header title={t.glossaryTitle} onBack={onBack} />
      <div className="stack grow">
        <input className="input" placeholder={t.glossarySearch} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t.glossarySearch} />
        {entries.map(([id, g]) => (
          <details key={id} className="card review glossary-item">
            <summary><span className="grow">{g.term}</span><span aria-hidden="true">＋</span></summary>
            <p className="small" style={{ margin: '6px 0' }}>{g.meaning}</p>
            <div className="small glossary-ex"><b>{t.example}:</b> {g.example}</div>
          </details>
        ))}
        {entries.length === 0 && <div className="muted">{t.glossaryEmpty}</div>}
      </div>
    </div>
  );
}
