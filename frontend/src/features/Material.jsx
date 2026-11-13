// Materi: Persentase Diskon (Rabat) & Potongan Harga. Satu topik per layar (P1),
// rumus di layar yang sama dengan contohnya (P5), contoh bisa dijeda/diulang/dimundurkan (P7).
import { useEffect, useMemo, useState } from 'react';
import { material } from '../content/index.js';
import { logEvent } from '../data/events.js';
import { materialVars } from '../domain/literacy.js';
import { t } from '../i18n/id.js';
import { Header, RichText } from '../ui/components.jsx';

export const topics = material.topics;

/** Daftar topik untuk tab "Materi" di peta belajar. */
export function MaterialList({ onOpen }) {
  return (
    <div className="stack">
      <div className="muted small">{t.materialIntro}</div>
      {topics.map((tp, i) => (
        <button key={tp.id} className="card module btn" onClick={() => onOpen(i)}>
          <span className="id">{i + 1}</span>
          <span className="grow">{tp.title}</span>
        </button>
      ))}
    </div>
  );
}

function ExampleSteps({ topic, vars }) {
  const ex = topic.example;
  const n = ex.steps.length;
  const [shown, setShown] = useState(0);
  return (
    <div className="card stack example">
      <div className="step-label">{t.example}</div>
      <RichText text={ex.text} vars={vars} className="" />
      <ol className="ex-steps">
        {ex.steps.slice(0, shown).map((s, i) => (
          <li key={i} className="signal">
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

export function MaterialTopic({ index, onIndex, onBack }) {
  const topic = topics[index];
  const vars = useMemo(() => materialVars(topic), [topic]);
  const last = index === topics.length - 1;

  useEffect(() => {
    logEvent('material_view', { payload: { topic: topic.id } });
    window.scrollTo?.(0, 0);
  }, [topic.id]);

  return (
    <div className="screen">
      <Header title={topic.title} sub={`${t.tabs.material} ${index + 1}/${topics.length}`} onBack={onBack} />
      <div className="stack grow">
        <RichText text={topic.body} vars={vars} className="problem-text" />
        {topic.formula && (
          <div className="card formula" aria-label={t.formula}>
            <div className="step-label">{t.formula}</div>
            <b>{topic.formula}</b>
          </div>
        )}
        {topic.example && <ExampleSteps key={topic.id} topic={topic} vars={vars} />}
      </div>
      <div className="actions">
        {index > 0 && <button className="btn" onClick={() => onIndex(index - 1)}>{t.prevTopic}</button>}
        <button className="btn btn-primary" onClick={() => (last ? onBack() : onIndex(index + 1))}>
          {last ? t.finish : t.nextTopic}
        </button>
      </div>
    </div>
  );
}
