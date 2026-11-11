// Aktivitas belajar selain mengerjakan soal: contoh terselesaikan, eksplorasi struk,
// jelaskan ke teman, dan skala usaha mental.
import { useMemo, useState } from 'react';
import { curriculum } from '../content/index.js';
import { logEvent } from '../data/events.js';
import { discountAmount } from '../domain/discount.js';
import { formatBp, formatRp } from '../domain/money.js';
import { knownNames } from '../domain/problems.js';
import { mulberry32, shuffle } from '../domain/rng.js';
import { t } from '../i18n/id.js';
import SceneHost from '../three/SceneHost.jsx';
import { BoxDiagram, Feedback, RichText } from '../ui/components.jsx';
import { sceneParams } from './sceneParams.js';

/** Contoh terselesaikan: satu langkah tampil per ketukan, bisa mundur dan diulang (EL04). */
export function WorkedExample({ problem, sceneKind, onDone }) {
  const n = problem.steps.length;
  const [shown, setShown] = useState(0);
  const known = knownNames(problem, shown);
  const kind = problem.scene ?? sceneKind;
  return (
    <div className="stack grow">
      <RichText text={problem.text} vars={problem.vars} />
      <BoxDiagram boxes={problem.boxes} vars={problem.vars} known={known} />
      {kind && <SceneHost kind={kind} params={sceneParams(kind, problem, known, shown)} height={160} />}
      <div className="stack">
        {problem.steps.slice(0, shown).map((s, i) => (
          <div key={s.id} className="card">
            <div className="step-label">{t.stepOf(i + 1, n)} · {s.label}</div>
            <RichText text={s.worked} vars={problem.vars} className="" />
            <div className="muted small">{s.formula}</div>
          </div>
        ))}
        {shown === 0 && <div className="muted">Ketuk ▶ untuk melihat langkah pertama.</div>}
      </div>
      <div className="player-ctrl">
        <button className="icon-btn" onClick={() => setShown((x) => Math.max(0, x - 1))} aria-label="Langkah sebelumnya">◀</button>
        <button className="icon-btn" onClick={() => setShown(0)} aria-label={t.replay}>↻</button>
        <button className="icon-btn" onClick={() => setShown((x) => Math.min(n, x + 1))} aria-label="Langkah berikutnya">▶</button>
      </div>
      <div className="actions">
        <button className="btn btn-primary" disabled={shown < n} onClick={onDone}>{t.next}</button>
      </div>
    </div>
  );
}

/** Simulasi struk belanja (GL01, FR-14) + label harga 3D yang bisa diketuk (DS01). */
export function Explore({ moduleId, onDone }) {
  const price = 80000;
  const [pct, setPct] = useState(2000);
  const [step, setStep] = useState(0);
  const disc = discountAmount(price, pct);
  return (
    <div className="stack grow">
      <div className="card receipt" aria-label="Struk belanja">
        <div className="line"><span>KAOS POLOS</span><b className="n" style={{ color: 'var(--c-price)' }}>{formatRp(price)}</b></div>
        <div className="line"><span>DISKON {formatBp(pct)}</span><b className="n" style={{ color: 'var(--c-discount)' }}>−{formatRp(disc)}</b></div>
        <hr />
        <div className="line"><span>BAYAR</span><b className="n" style={{ color: 'var(--c-result)' }}>{formatRp(price - disc)}</b></div>
      </div>
      <label className="stack small card">
        Geser persen diskon: <b>{formatBp(pct)}</b>
        <input
          type="range" min="0" max="5000" step="500" value={pct}
          onChange={(e) => setPct(Number(e.target.value))}
          onPointerUp={() => logEvent('scene_interact', { moduleId, payload: { scene: 'receipt', action: 'slide', pct } })}
        />
      </label>
      <SceneHost kind="priceTag" params={{ pct, step }} onTap={() => setStep((s) => (s + 1) % 3)} height={180} />
      <div className="actions">
        <button className="btn" onClick={() => setStep((s) => (s + 1) % 3)}>Ketuk label</button>
        <button className="btn btn-primary" onClick={onDone}>{t.next}</button>
      </div>
    </div>
  );
}

/** Jelaskan ke Teman (GL04): urutkan kartu langkah, abaikan kartu pengecoh. */
export function ExplainCards({ setId, moduleId, onDone }) {
  const set = curriculum.explain[setId];
  const deck = useMemo(() => shuffle([...set.cards, ...set.distractors], mulberry32(Date.now() >>> 0)), [set]);
  const [order, setOrder] = useState([]);
  const [fb, setFb] = useState(null);
  const [ok, setOk] = useState(false);
  const check = () => {
    const correct = order.length === set.cards.length && order.every((c, i) => c === set.cards[i]);
    logEvent('explain_submit', { moduleId, payload: { order, correct } });
    setOk(correct);
    setFb(correct ? { kind: 'good', text: 'Urutannya tepat. Kamu siap mengajari teman!' } : { kind: 'bad', text: 'Belum tepat. Ada kartu yang tertukar atau tidak perlu.' });
  };
  return (
    <div className="stack grow">
      <div className="step-title">{set.prompt}</div>
      <ol className="card stack" style={{ margin: 0, paddingLeft: 32, minHeight: 60 }}>
        {order.map((c) => <li key={c}>{c}</li>)}
      </ol>
      <div className="options">
        {deck.filter((c) => !order.includes(c)).map((c) => (
          <button key={c} className="option small" style={{ fontSize: 16, fontWeight: 600 }} onClick={() => { setOrder([...order, c]); setFb(null); }}>
            {c}
          </button>
        ))}
      </div>
      <Feedback kind={fb?.kind}>{fb?.text}</Feedback>
      <div className="actions">
        <button className="btn" onClick={() => { setOrder([]); setFb(null); setOk(false); }}>{t.replay}</button>
        {ok ? (
          <button className="btn btn-primary" onClick={onDone}>{t.next}</button>
        ) : (
          <button className="btn btn-primary" disabled={!order.length} onClick={check}>{t.check}</button>
        )}
      </div>
    </div>
  );
}

/** Skala usaha mental 1–9 (diadaptasi dari Paas, 1992; perlu validasi). */
export function EffortRating({ moduleId, onDone }) {
  return (
    <div className="stack grow">
      <div className="step-title">{t.effortTitle}</div>
      <div className="effort">
        {Array.from({ length: 9 }, (_, i) => (
          <button
            key={i}
            onClick={() => {
              logEvent('effort_rating', { moduleId, payload: { value: i + 1 } });
              onDone(i + 1);
            }}
          >
            {i + 1}
          </button>
        ))}
      </div>
      <div className="row small muted">
        <span>{t.effortLow}</span>
        <span className="grow" />
        <span>{t.effortHigh}</span>
      </div>
    </div>
  );
}
