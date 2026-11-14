// Tes & Latihan Literasi Matematis: 4 soal cerita (satu per indikator), dikerjakan per tahap.
// - Satu tahap per layar (P1); soal tetap tampil di layar yang sama (P5).
// - Tes: tanpa petunjuk & tanpa umpan balik sampai selesai; skor bertahap maks. 24.
// - Latihan: umpan balik langsung, petunjuk ditawarkan setelah 2 kali salah (P9), tanpa kunci (P8).
// - Komponen tidak menghitung sendiri: semua penilaian lewat domain/literacy.js.
import { useState } from 'react';
import { glossary, literacy } from '../content/index.js';
import { logEvent } from '../data/events.js';
import { category, scoreTest, stepFeedback, studentVars } from '../domain/literacy.js';
import { formatRp, parseRupiah } from '../domain/money.js';
import { initialHintState, nextHint, onWrong } from '../domain/scaffold.js';
import { fillText } from '../domain/text.js';
import { t } from '../i18n/id.js';
import { Feedback, FormulaDock, Header, NumberPad, RichText, Sheet } from '../ui/components.jsx';
import { KikoSays } from '../ui/Mascot.jsx';

export const indicators = literacy.indicators;
export const testItems = literacy.test;
export const practiceItems = literacy.practice;

const stepLabel = (st) => st.label ?? String(st.tahap);

/** Teks jawaban siswa untuk ditampilkan kembali. */
export function answerText(item, st, answer, answers) {
  if (answer === null || answer === undefined) return t.noAnswer;
  if (st.input === 'choice') return fillText(st.options[answer] ?? '', studentVars(item, answers), glossary);
  return formatRp(answer);
}

function ExitSheet({ onYes, onNo }) {
  return (
    <Sheet onClose={onNo}>
      <h2>{t.exitTitle}</h2>
      <p>{t.exitBody}</p>
      <div className="actions">
        <button className="btn" onClick={onYes}>{t.exitYes}</button>
        <button className="btn btn-primary" onClick={onNo}>{t.exitNo}</button>
      </div>
    </Sheet>
  );
}

function HintsSheet({ hints, level, onNext, onClose }) {
  return (
    <Sheet onClose={onClose}>
      <h2>{t.hint}</h2>
      {hints.slice(0, level).map((h, i) => (
        <div key={i} className="card hint">
          <div className="step-label">Petunjuk {i + 1}</div>
          <div>{h}</div>
        </div>
      ))}
      <div className="actions">
        {level < hints.length && <button className="btn" onClick={onNext}>{t.nextHint}</button>}
        <button className="btn btn-primary" onClick={onClose}>{t.tryAgain}</button>
      </div>
    </Sheet>
  );
}

/**
 * @param {{mode:'test'|'practice', items:object[], onFinish:(r:{answers:object, texts:object})=>void, onExit:()=>void}} props
 */
export function LiteracyRunner({ mode, items, onFinish, onExit }) {
  const isTest = mode === 'test';
  const [started, setStarted] = useState(!isTest);
  const [pos, setPos] = useState({ i: 0, s: 0 });
  const [answers, setAnswers] = useState({}); // jawaban terakhir (tes) / jawaban benar (latihan)
  const [first, setFirst] = useState({}); // percobaan pertama (latihan)
  const [texts, setTexts] = useState({});
  const [val, setVal] = useState('');
  const [choice, setChoice] = useState(null);
  const [fb, setFb] = useState(null);
  const [solved, setSolved] = useState(false);
  const [hint, setHint] = useState(initialHintState());
  const [offer, setOffer] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [exit, setExit] = useState(false);

  const item = items[pos.i];
  const st = item.steps[pos.s];
  const mine = answers[item.id] ?? {};
  const vars = studentVars(item, mine);
  const ind = indicators[item.process];
  const kind = isTest ? 'literacy' : 'literacy_practice';

  const current = () => (st.input === 'choice' ? choice : parseRupiah(val));
  const hasAnswer = st.input === 'choice' ? choice !== null : !!val;

  const record = (store, setStore, a) => setStore({ ...store, [item.id]: { ...(store[item.id] ?? {}), [st.id]: a } });

  const advance = (nextAnswers) => {
    setVal('');
    setChoice(null);
    setFb(null);
    setSolved(false);
    setHint(initialHintState());
    setOffer(false);
    window.scrollTo?.(0, 0);
    if (pos.s + 1 < item.steps.length) return setPos({ i: pos.i, s: pos.s + 1 });
    if (pos.i + 1 < items.length) return setPos({ i: pos.i + 1, s: 0 });
    return onFinish({ answers: isTest ? nextAnswers : { ...first }, texts });
  };

  const submitTest = () => {
    const a = current();
    const next = { ...answers, [item.id]: { ...mine, [st.id]: a } };
    const f = stepFeedback(item, st.id, a, mine);
    logEvent('assessment_answer', {
      problemId: item.id,
      stepId: st.id,
      payload: { kind, itemId: item.id, stepId: st.id, process: item.process, answer: a, correct: f.correct, via: f.via, points: st.points },
    });
    setAnswers(next);
    advance(next);
  };

  const checkPractice = () => {
    const a = current();
    const f = stepFeedback(item, st.id, a, mine);
    if (first[item.id]?.[st.id] === undefined) record(first, setFirst, a);
    logEvent('answer_submit', {
      moduleId: 'LIT',
      problemId: item.id,
      stepId: st.id,
      payload: { kind, process: item.process, answer: a, correct: f.correct, mc: null, hintLevel: hint.level },
    });
    setFb({ kind: f.correct ? 'good' : 'bad', text: f.text });
    if (f.correct) {
      setSolved(true);
      record(answers, setAnswers, a);
      return;
    }
    const r = onWrong(hint);
    setHint(r.state);
    if (r.offer) setOffer(true);
  };

  const openHint = () => {
    const h = nextHint(hint);
    setHint(h);
    setOffer(false);
    setShowHints(true);
    logEvent('hint_open', { moduleId: 'LIT', problemId: item.id, stepId: st.id, payload: { level: h.level } });
  };

  const title = isTest ? t.literacyTestTitle : t.literacyPracticeTitle;

  if (!started) {
    return (
      <div className="screen">
        <Header title={title} onBack={onExit} />
        <div className="stack grow">
          <KikoSays mood="wave" size={90}>{t.literacyIntro}</KikoSays>
          <ul className="card stack rules">
            {t.literacyRules.map((r) => <li key={r}>{r}</li>)}
          </ul>
          <div className="card stack small">
            {items.map((it, k) => (
              <div key={it.id} className="row">
                <b>{k + 1}.</b>
                <span className="grow">{indicators[it.process].name}</span>
                <span className="muted">{it.rubric.reduce((a, b) => a + b, 0)} poin</span>
              </div>
            ))}
          </div>
        </div>
        <div className="actions">
          <button className="btn btn-primary" onClick={() => setStarted(true)}>{t.literacyStart}</button>
        </div>
      </div>
    );
  }

  const hints = st.hints ?? [];
  const hintAllowed = !isTest && hints.length > 0 && hint.attempts >= 2 && !solved;

  return (
    <div className="screen">
      <Header title={title} sub={`${t.soalOf(pos.i + 1, items.length)} · ${item.title}`} onBack={() => setExit(true)} />
      <div className="stack grow">
        <div className="chip-static small">
          {t.indicator} {ind.order}: <b>{ind.name}</b>
        </div>
        <RichText text={item.text} vars={item.vars} signaling={!isTest} className="problem-text" />
        {!isTest && <FormulaDock formula={item.formula} />}
        <div className="card stack">
          <div className="step-label">{t.tahap(stepLabel(st), st.points)}</div>
          <RichText text={st.ask} vars={vars} signaling={!isTest} className="step-ask" />
        </div>
        {st.input === 'choice' ? (
          <div className="options" role="radiogroup">
            {st.options.map((o, k) => (
              <button
                key={k}
                role="radio"
                aria-checked={choice === k}
                className={`option option-text ${choice === k ? 'on' : ''} ${choice === k && fb ? fb.kind : ''}`}
                disabled={solved}
                onClick={() => { setChoice(k); setFb(null); }}
              >
                {fillText(o, vars, glossary)}
              </button>
            ))}
          </div>
        ) : (
          !solved && <NumberPad value={val} onChange={(x) => { setVal(x); setFb(null); }} kind="rupiah" role="result" />
        )}
        {solved && st.input === 'rupiah' && <div className="answer r-result">{formatRp(parseRupiah(val))}</div>}
        {st.write && (
          <label className="stack small">
            {t.writeReason}
            <textarea
              className="input textarea"
              rows={3}
              maxLength={300}
              placeholder={t.writePlaceholder}
              value={texts[`${item.id}.${st.id}`] ?? ''}
              onChange={(e) => setTexts({ ...texts, [`${item.id}.${st.id}`]: e.target.value })}
            />
          </label>
        )}
        <Feedback kind={fb?.kind} kiko>{fb?.text}</Feedback>
        {offer && !solved && <div className="muted small">{t.wantHint}</div>}
      </div>
      <div className="actions">
        {hintAllowed && <button className="btn" onClick={openHint}>{t.hint}</button>}
        {isTest ? (
          <button className="btn btn-primary" disabled={!hasAnswer} onClick={submitTest}>{t.next}</button>
        ) : solved ? (
          <button className="btn btn-primary" onClick={() => advance(answers)}>{t.next}</button>
        ) : (
          <button className="btn btn-primary" disabled={!hasAnswer} onClick={checkPractice}>{t.check}</button>
        )}
      </div>
      {showHints && (
        <HintsSheet hints={hints} level={hint.level} onNext={() => setHint(nextHint(hint))} onClose={() => setShowHints(false)} />
      )}
      {exit && <ExitSheet onYes={onExit} onNo={() => setExit(false)} />}
    </div>
  );
}

/** Ringkasan skor per indikator (batang berisi angka skor, bukan hiasan). */
function IndicatorBars({ byProcess }) {
  const rows = Object.entries(indicators).sort((a, b) => a[1].order - b[1].order);
  return (
    <div className="card stack">
      <div className="step-label">{t.byIndicator}</div>
      {rows.map(([p, ind]) => {
        const b = byProcess[p] ?? { earned: 0, max: 0 };
        return (
          <div key={p} className="stack" style={{ gap: 4 }}>
            <div className="row small">
              <span className="grow">{ind.order}. {ind.name}</span>
              <b>{b.earned}/{b.max}</b>
            </div>
            <div className="bar" role="img" aria-label={`${ind.name}: ${b.earned} dari ${b.max} poin`}>
              <span style={{ width: `${b.max ? (100 * b.earned) / b.max : 0}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Hasil tes / latihan: skor total, skor per indikator, dan umpan balik per tahap.
 * @param {{mode:'test'|'practice', items:object[], answers:object, texts?:object, onRetry?:()=>void, onBack:()=>void}} props
 */
export function LiteracyResult({ mode, items, answers, texts = {}, onRetry, onBack }) {
  const r = scoreTest(items, answers);
  const isTest = mode === 'test';
  return (
    <div className="screen">
      <Header title={isTest ? t.resultTitle : t.practiceDoneTitle} onBack={onBack} />
      <div className="stack grow">
        <div className="card score-card">
          <div className="step-label">{isTest ? 'Skor total' : t.firstTryScore}</div>
          <div className="score">
            <b>{r.total}</b>
            <span>/ {r.max}</span>
          </div>
          <div className="muted">{category(r.total, r.max)}</div>
        </div>
        {items.length > 1 && <IndicatorBars byProcess={r.byProcess} />}
        <div className="step-label">{t.perSoal}</div>
        {items.map((it, k) => {
          const res = r.items[k];
          const mine = answers[it.id] ?? {};
          return (
            <details key={it.id} className="card review" open={items.length === 1}>
              <summary>
                <span className="grow">Soal {k + 1}. {it.title}</span>
                <b>{res.earned}/{res.max}</b>
              </summary>
              <div className="muted small">{indicators[it.process].name}</div>
              <ol className="review-steps">
                {it.steps.map((st, j) => {
                  const s = res.steps[j];
                  const f = stepFeedback(it, st.id, mine[st.id] ?? null, mine);
                  const note = texts[`${it.id}.${st.id}`];
                  return (
                    <li key={st.id} className={s.earned ? 'ok' : 'no'}>
                      <div className="row small">
                        <b className="grow">{s.earned ? '✓' : '✗'} {t.tahap(stepLabel(st), st.points)}</b>
                        <span>+{s.earned}</span>
                      </div>
                      <div className="small">{fillText(st.ask, studentVars(it, mine), glossary)}</div>
                      <div className="small">
                        {t.yourAnswer}: <b>{answerText(it, st, mine[st.id], mine)}</b>
                      </div>
                      {note && <div className="small">{t.yourReason}: “{note}”</div>}
                      <div className={`small fb-line ${f.correct ? 'good' : 'bad'}`}>{f.text}</div>
                    </li>
                  );
                })}
              </ol>
            </details>
          );
        })}
      </div>
      <div className="actions">
        {onRetry && <button className="btn" onClick={onRetry}>{isTest ? t.literacyRetry : t.replay}</button>}
        <button className="btn btn-primary" onClick={onBack}>{t.backToMap}</button>
      </div>
    </div>
  );
}

/** Kisi-kisi untuk guru/peneliti (di balik PIN): kunci per tahap dari Tabel 2. */
export function LiteracyKey() {
  return (
    <div className="stack">
      {testItems.map((it, k) => (
        <details key={it.id} className="card review">
          <summary>
            <span className="grow">Soal {k + 1}. {it.title}</span>
            <b>{it.rubric.reduce((a, b) => a + b, 0)}</b>
          </summary>
          <div className="small muted">{indicators[it.process].en} · Tahap: {it.rubric.join(' + ')}</div>
          <p className="small">{fillText(it.text, it.vars, glossary)}</p>
          <ol className="review-steps">
            {it.steps.map((st) => (
              <li key={st.id} className="small">
                <b>{t.tahap(stepLabel(st), st.points)}{st.ecf ? ' · ECF' : ''}</b>
                <div>{st.rubricText}</div>
              </li>
            ))}
          </ol>
        </details>
      ))}
      <div className="small muted">ECF = dinilai benar bila konsisten dengan hasil siswa di tahap sebelumnya.</div>
    </div>
  );
}
