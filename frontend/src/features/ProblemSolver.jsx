// Mengerjakan satu soal: (Mode Tandai) → wizard langkah → cek kewajaran.
import { useMemo, useRef, useState } from 'react';
import { curriculum } from '../content/index.js';
import { logEvent } from '../data/events.js';
import { FEEDBACK, classify } from '../domain/misconceptions.js';
import { formatValue, parsePercent, parseRupiah } from '../domain/money.js';
import { buildProblem, checkAnswer, checkMagnitude, knownNames, OPS } from '../domain/problems.js';
import { AUTO_HINT_AFTER, initialHintState, nextHint, onWrong, scaffoldFor } from '../domain/scaffold.js';
import { parseText } from '../domain/text.js';
import { t } from '../i18n/id.js';
import SceneHost from '../three/SceneHost.jsx';
import { BoxDiagram, Feedback, FormulaDock, NumberPad, RichText, Sheet } from '../ui/components.jsx';
import Mascot from '../ui/Mascot.jsx';
import { askTutor } from '../data/tutor.js';
import { sceneParams } from './sceneParams.js';
import TutorSheet from './TutorSheet.jsx';

const MARK_TARGETS = { price: 'price', pct: 'percent', p1: 'percent', p2: 'percent', pA: 'percent', pB: 'percent', final: 'result' };
const ROLE_FMT = { price: 'price', percent: 'percent', discount: 'discount', result: 'result' };

function MarkNumbers({ problem, onDone, moduleId }) {
  const segs = useMemo(() => parseText(problem.text, problem.vars), [problem]);
  const targets = segs.map((s) => (s.type === 'num' ? MARK_TARGETS[s.name] ?? null : null));
  const roles = [...new Set(targets.filter(Boolean))];
  const [sel, setSel] = useState(roles[0]);
  const [labels, setLabels] = useState({});
  const [tries, setTries] = useState(0);
  const [fb, setFb] = useState(null);

  const tap = (_s, i) => setLabels((l) => ({ ...l, [i]: l[i] === sel ? undefined : sel }));
  const check = () => {
    const ok = segs.every((s, i) => s.type !== 'num' || s.role === 'item' || (labels[i] ?? null) === targets[i]);
    logEvent('mark_numbers', {
      moduleId,
      problemId: problem.id,
      payload: { correct: ok, marked: Object.entries(labels).filter(([, r]) => r).map(([i, r]) => ({ value: segs[i].value, role: r })) },
    });
    if (ok) return onDone({ correct: true, tries: tries + 1 });
    const n = tries + 1;
    setTries(n);
    if (n >= 2) return onDone({ correct: false, tries: n }); // tampilkan penanda otomatis
    setFb(t.markWrong);
    return undefined;
  };

  return (
    <div className="stack">
      <div className="step-title">{t.markTitle}</div>
      <div className="muted small">{t.markHelp}</div>
      <div className="row" style={{ flexWrap: 'wrap' }}>
        {roles.map((r) => (
          <button key={r} className={`chip ${sel === r ? 'on' : ''}`} onClick={() => setSel(r)}>
            {t.roles[r]}
          </button>
        ))}
      </div>
      <RichText text={problem.text} vars={problem.vars} mark={{ labels, onTap: tap }} />
      <Feedback kind="bad">{fb}</Feedback>
      <div className="actions">
        <button className="btn btn-primary" onClick={check}>{t.check}</button>
      </div>
    </div>
  );
}

/** Petunjuk H1–H3 yang sudah dibuka + contoh serupa (H4). Dipakai HintSheet dan Teman Mikir. */
function HintBody({ problem, step, idx, level }) {
  const similar = useMemo(
    () => (level >= 4 ? buildProblem(curriculum, problem.templateId, (problem.seed + 7919) >>> 0) : null),
    [level, problem],
  );
  return (
    <>
      {step.hints.slice(0, Math.min(3, level)).map((h, i) => (
        <div key={i} className="card hint">
          <div className="step-label">Petunjuk {i + 1}</div>
          <RichText text={h} vars={problem.vars} className="" />
        </div>
      ))}
      {similar && (
        <div className="card">
          <div className="step-label">Contoh serupa (soal lain)</div>
          <RichText text={similar.text} vars={similar.vars} className="" />
          {similar.steps.slice(0, idx + 1).map((s) => (
            <RichText key={s.id} text={`${s.label}: ${s.worked}`} vars={similar.vars} className="small" />
          ))}
        </div>
      )}
    </>
  );
}

function HintSheet({ problem, step, idx, hint, onNext, onClose }) {
  return (
    <Sheet onClose={onClose}>
      <div className="row">
        <Mascot mood="think" size={56} />
        <h2>{t.hint} dari Plum</h2>
      </div>
      <HintBody problem={problem} step={step} idx={idx} level={hint.level} />
      <div className="actions">
        <button className="btn" onClick={onClose}>{t.tryAgain}</button>
        {hint.level < 4 && (
          <button className="btn btn-primary" onClick={onNext}>
            {hint.level < 3 ? t.nextHint : t.similarExample}
          </button>
        )}
      </div>
    </Sheet>
  );
}

/**
 * @param {{problem:object, moduleId:string, sceneKind:string, mode:'completion'|'independent'|'transfer', level:number, onDone:(r:object)=>void}} props
 */
export default function ProblemSolver({ problem, moduleId, sceneKind, mode, level, onDone }) {
  const sc = scaffoldFor(level, { transfer: mode === 'transfer' });
  const completion = mode === 'completion';
  const n = problem.steps.length;
  const [phase, setPhase] = useState(sc.markMode ? 'mark' : 'solve');
  const [signal, setSignal] = useState(sc.signaling);
  const [idx, setIdx] = useState(completion ? n - 1 : 0);
  const [input, setInput] = useState('');
  const [choice, setChoice] = useState(null);
  const [hint, setHint] = useState(initialHintState());
  const [sheet, setSheet] = useState(null); // 'hint' | 'offer'
  const [fb, setFb] = useState(null);
  const [showModel, setShowModel] = useState(!sc.markMode);
  const [showDisc, setShowDisc] = useState(false); // pembahasan langkah yang sudah selesai
  const fbId = useRef(0);
  const stats = useRef({ hardSteps: 0, wrong: 0, maxHint: 0, t0: Date.now(), stepT0: Date.now() });

  const step = problem.steps[idx];
  const known = knownNames(problem, phase === 'solve' ? idx : n);
  const log = (type, payload, stepId = step?.id) =>
    logEvent(type, { moduleId, problemId: problem.id, stepId, payload: { stage: mode, process: problem.process, ...payload } });

  // ---- Teman Mikir ----
  const [tutorTurn, setTutorTurn] = useState(null); // null | {loading:true} | rencana + teks
  const [formulaStep, setFormulaStep] = useState(null); // langkah yang kartu rumusnya dibuka lewat Teman Mikir
  const tutorMeta = useRef({ stepId: null, level: 1, lastMc: null, lastAnswer: null, wrongPending: false, used: false, reflected: false, pendingFinish: false, reqId: 0 });
  const tm = () => {
    const m = tutorMeta.current;
    if (m.stepId !== step.id) Object.assign(m, { stepId: step.id, level: 1, lastMc: null, lastAnswer: null, wrongPending: false });
    return m;
  };

  const reallyFinish = () =>
    onDone({ correct: stats.current.hardSteps === 0, maxHint: stats.current.maxHint, wrong: stats.current.wrong, ms: Date.now() - stats.current.t0 });

  const closeTutor = () => {
    const m = tutorMeta.current;
    m.reqId += 1; // abaikan balasan yang masih ditunggu
    setTutorTurn(null);
    if (m.pendingFinish) {
      m.pendingFinish = false;
      reallyFinish();
    }
  };

  const applyTutorAction = (r) => {
    if (r.action === 'hint' || r.action === 'example') {
      const s = r.action === 'example' ? { ...hint, level: 4 } : hint.level < 3 ? nextHint(hint) : hint;
      setHint(s);
      stats.current.maxHint = Math.max(stats.current.maxHint, s.level);
      log('hint_open', { level: s.level, auto: false, via: 'tutor' });
    }
    if (r.action === 'formula') setFormulaStep(step.id);
  };

  const runTutor = async ({ event, move = null, chip = null }) => {
    const m = tm();
    const id = ++m.reqId;
    m.used = true;
    if (event === 'wrong') m.wrongPending = false;
    setTutorTurn((cur) => ({ ...(cur ?? {}), loading: true }));
    let r;
    try {
      r = await askTutor({
        templateId: problem.templateId,
        seed: problem.seed,
        stepId: step.id,
        role: step.role,
        stepIndex: idx,
        phase: phase === 'sanity' || phase === 'check' ? 'sanity' : 'solve',
        event,
        move,
        chipId: chip?.id ?? null,
        mc: m.lastMc,
        level: m.level,
        answer: event === 'wrong' || move === 'error' || move === 'error_why' ? m.lastAnswer : null,
      });
    } catch (e) {
      console.warn('Teman Mikir gagal', e);
      if (id === m.reqId) closeTutor();
      return;
    }
    if (id !== m.reqId) return;
    m.level = r.level;
    log('tutor_turn', {
      event, fromMove: move, chip: chip?.id ?? null, move: r.move, level: r.level, mc: r.mc,
      difficulty: r.difficulty, reflect: r.reflect, action: r.action, source: r.source, reason: r.reason,
    });
    applyTutorAction(r);
    if (r.close) closeTutor();
    else setTutorTurn(r);
  };

  const openTutor = () => runTutor({ event: tm().wrongPending ? 'wrong' : 'open' });

  // Refleksi & transendensi hanya bila Teman Mikir dipakai pada soal ini (tidak memaksa siswa lain).
  const finish = () => {
    const m = tutorMeta.current;
    if (m.used && !m.reflected) {
      m.reflected = true;
      m.pendingFinish = true;
      runTutor({ event: 'done' });
      return;
    }
    reallyFinish();
  };

  const openHint = (auto) => {
    const s = hint.level === 0 ? nextHint(hint) : hint;
    setHint(s);
    stats.current.maxHint = Math.max(stats.current.maxHint, s.level);
    setSheet('hint');
    log('hint_open', { level: s.level, auto });
  };
  const moreHint = () => {
    const s = nextHint(hint);
    setHint(s);
    stats.current.maxHint = Math.max(stats.current.maxHint, s.level);
    log('hint_open', { level: s.level, auto: false });
  };

  const submit = () => {
    const ans = step.input === 'choice' ? choice : step.input === 'percent' ? parsePercent(input) : parseRupiah(input);
    if (ans === null || ans === undefined) return;
    const ok = checkAnswer(step, ans);
    const mc = ok ? null : step.input === 'choice' ? step.options[ans]?.mc ?? null : classify(step, problem.vars, ans);
    log('answer_submit', { answer: ans, correct: ok, mc, attempt: hint.attempts + 1, ms: Date.now() - stats.current.stepT0 });
    fbId.current += 1;
    if (ok) {
      if (hint.attempts >= 2) stats.current.hardSteps += 1;
      // apresiasi Plum + alasan mengapa benar (langkah kerja dengan angka soal)
      const praise = t.praises[fbId.current % t.praises.length];
      setFb({
        kind: 'good',
        id: fbId.current,
        node: (
          <span className="fb-rich">
            <b>{praise}</b>{' '}
            {step.worked && (
              <span className="fb-why">
                {t.whyCorrect} <RichText text={step.worked} vars={problem.vars} signaling={false} className="" />
              </span>
            )}
          </span>
        ),
      });
      setInput('');
      setChoice(null);
      setHint(initialHintState());
      stats.current.stepT0 = Date.now();
      if (idx + 1 < n) setIdx(idx + 1);
      else if (problem.sanity) setPhase('sanity');
      else finish();
      return;
    }
    stats.current.wrong += 1;
    Object.assign(tm(), { lastMc: mc ?? 'NONE', lastAnswer: step.input === 'choice' ? null : ans, wrongPending: true });
    const r = onWrong(hint);
    setHint(r.state);
    // letak kesalahan (miskonsepsi) + cara memperbaiki (petunjuk H1, tanpa membocorkan angka jawaban)
    setFb({
      kind: 'bad',
      id: fbId.current,
      node: (
        <span className="fb-rich">
          <span>{FEEDBACK[mc] ?? FEEDBACK.DEFAULT}</span>
          {step.hints?.[0] && (
            <span className="fix-tip">
              <b>{t.howToFix}</b> <RichText text={step.hints[0]} vars={problem.vars} signaling={false} className="" />
            </span>
          )}
        </span>
      ),
    });
    if (r.offer) setSheet('offer');
  };

  const answerSanity = (yes) => {
    const s = problem.sanity;
    const truth = OPS[s.op](problem.vars[s.left], problem.vars[s.right]);
    log('sanity_check', { kind: 'direction', choice: yes, correct: yes === truth }, 'sanity');
    // R1: arah saja belum cukup → cek BESAR hasil lewat jalan lain (bila template menyediakannya)
    if (s.check && problem.checkAnswer !== null) {
      setPhase('check');
      setInput('');
      return;
    }
    finish();
  };

  // ---- R1: cek besar hasil (satu layar, ≤ 3 tombol, tanpa auto-advance) ----
  const [check, setCheck] = useState({ tries: 0, hint: 0, done: false, fb: null });
  const submitCheck = () => {
    const a = parseRupiah(input);
    if (a === null || a === undefined) return;
    const ok = checkMagnitude(problem, a);
    const tries = check.tries + 1;
    log('sanity_check', { kind: 'magnitude', answer: a, correct: ok, attempt: tries }, 'sanity');
    fbId.current += 1;
    const target = problem.sanity.check.target;
    if (ok) return setCheck({ ...check, tries, done: true, fb: { kind: 'good', id: fbId.current, text: t.checkGood(target) } });
    const offer = tries >= AUTO_HINT_AFTER && check.hint === 0 ? ` ${t.wantHint}` : '';
    return setCheck({ ...check, tries, fb: { kind: 'bad', id: fbId.current, text: t.checkBad(target) + offer } });
  };
  const checkHint = () => {
    const level = Math.min(problem.sanity.check.hints.length, check.hint + 1);
    setCheck({ ...check, hint: level });
    log('hint_open', { level, auto: false, via: 'check' }, 'sanity');
  };

  const kind = problem.scene ?? sceneKind;
  const sceneEl = kind && showModel && (
    <SceneHost kind={kind} params={sceneParams(kind, problem, known, phase === 'solve' ? idx : n)} height={150} />
  );

  if (phase === 'mark') {
    return (
      <MarkNumbers
        problem={problem}
        moduleId={moduleId}
        onDone={({ correct }) => {
          if (!correct) setSignal(true);
          setPhase('solve');
        }}
      />
    );
  }

  const doneSteps = problem.steps.slice(0, phase === 'solve' ? idx : n);
  const showValue = (s) =>
    s.input === 'choice' ? s.options[s.answer].text : `{${s.saveAs}|${ROLE_FMT[s.role] ?? 'plain'}}`;

  return (
    <div className="stack grow">
      <RichText text={problem.text} vars={problem.vars} signaling={signal} className="problem-text sticky-q" />
      <BoxDiagram boxes={problem.boxes} vars={problem.vars} known={known} />
      {kind && (
        <div className="row">
          <span className="grow" />
          <button className="chip" onClick={() => setShowModel((x) => !x)} aria-pressed={showModel}>
            {t.showModel} {showModel ? '▾' : '▸'}
          </button>
        </div>
      )}
      {sceneEl}
      {doneSteps.length > 0 && (
        <div className="done-steps card">
          {doneSteps.map((s) => (
            <div key={s.id} className="ok">
              <RichText text={`${s.label}: ${showValue(s)}`} vars={problem.vars} signaling className="" />
            </div>
          ))}
          <button className="chip disc-chip" aria-expanded={showDisc} onClick={() => setShowDisc((x) => !x)}>
            📘 {showDisc ? t.hideSteps : t.showSteps}
          </button>
          {showDisc && (
            <ol className="ex-steps step-disc" aria-label={t.discussionTitle}>
              {doneSteps.map((s) => (
                <li key={s.id} className="pop-in">
                  <b>{s.label}.</b> <RichText text={s.worked} vars={problem.vars} className="" />
                  {s.formula && <div className="muted small">{s.formula}</div>}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {phase === 'check' ? (
        <div className="stack">
          <div className="step-title">{t.checkTitle}</div>
          <RichText text={problem.sanity.check.ask} vars={problem.vars} className="step-ask" />
          {problem.sanity.check.hints.slice(0, check.hint).map((h, i) => (
            <div key={i} className="card hint">
              <div className="step-label">Petunjuk {i + 1}</div>
              <RichText text={h} vars={problem.vars} className="" />
            </div>
          ))}
          <Feedback kind={check.fb?.kind} kiko id={check.fb?.id}>
            {check.fb && <RichText text={check.fb.text} vars={problem.vars} signaling={false} className="" />}
          </Feedback>
          {!check.done && <NumberPad value={input} onChange={setInput} kind="rupiah" role="result" />}
          <div className="actions">
            {check.done ? (
              <button className="btn btn-primary" onClick={finish}>{t.next}</button>
            ) : (
              <>
                <button className="btn btn-tutor" onClick={openTutor}>🤔 {t.tutor.button}</button>
                <button className="btn" onClick={checkHint} disabled={check.hint >= problem.sanity.check.hints.length}>
                  💡 {t.hint}
                </button>
                <button className="btn btn-primary" onClick={submitCheck} disabled={!input}>{t.check}</button>
              </>
            )}
          </div>
        </div>
      ) : phase === 'sanity' ? (
        <div className="stack">
          <div className="step-title">{t.sanityTitle}</div>
          <RichText
            text={`Apakah {${problem.sanity.left}|result} ${problem.sanity.op === '<' ? 'lebih kecil' : 'lebih besar'} dari {${problem.sanity.right}|price}? Masuk akal?`}
            vars={problem.vars}
          />
          <div className="actions">
            <button className="btn btn-tutor" onClick={openTutor}>🤔 {t.tutor.button}</button>
            <button className="btn" onClick={() => answerSanity(false)}>Tidak</button>
            <button className="btn btn-primary" onClick={() => answerSanity(true)}>Ya</button>
          </div>
        </div>
      ) : (
        <div className="stack">
          <div>
            <div className="step-label">{t.stepOf(idx + 1, n)}</div>
            <div className="step-title">{step.label}</div>
          </div>
          <FormulaDock
            key={`${step.id}${formulaStep === step.id ? '-tutor' : ''}`}
            formula={step.formula}
            defaultOpen={sc.formulaOpen || completion || formulaStep === step.id}
          />
          <Feedback kind={fb?.kind} kiko id={fb?.id}>{fb?.node ?? fb?.text}</Feedback>
          {step.input === 'choice' ? (
            <div className="options">
              {step.options.map((o, i) => (
                <button key={i} className={`option ${choice === i ? 'on' : ''}`} onClick={() => setChoice(i)}>
                  <RichText text={o.text} vars={problem.vars} signaling={false} className="" />
                </button>
              ))}
            </div>
          ) : (
            <NumberPad value={input} onChange={setInput} kind={step.input} role={step.role} />
          )}
          <div className="actions">
            <button
              className="btn"
              onClick={() => openHint(false)}
              disabled={!completion && hint.attempts < sc.hintButtonAfter}
            >
              💡 {t.hint}
            </button>
            <button className="btn btn-tutor" onClick={openTutor}>🤔 {t.tutor.button}</button>
            <button
              className="btn btn-primary"
              onClick={submit}
              disabled={step.input === 'choice' ? choice === null : !input}
            >
              {t.check}
            </button>
          </div>
        </div>
      )}

      {sheet === 'offer' && (
        <Sheet onClose={() => setSheet(null)}>
          <div className="row">
          <Mascot mood="think" size={56} />
          <h2>{t.wantHint}</h2>
        </div>
          <div className="actions">
            <button className="btn" onClick={() => setSheet(null)}>{t.tryAgain}</button>
            <button className="btn btn-primary" onClick={() => openHint(true)}>{t.hint}</button>
          </div>
        </Sheet>
      )}
      {sheet === 'hint' && (
        <HintSheet problem={problem} step={step} idx={idx} hint={hint} onNext={moreHint} onClose={() => setSheet(null)} />
      )}
      {tutorTurn && (
        <TutorSheet
          turn={tutorTurn}
          onChip={(c) => runTutor({ event: 'chip', move: tutorTurn.move, chip: c })}
          onClose={closeTutor}
        >
          {(tutorTurn.move === 'tool' || tutorTurn.action === 'box') && (
            <BoxDiagram boxes={problem.boxes} vars={problem.vars} known={known} />
          )}
          {tutorTurn.action === 'formula' && <FormulaDock formula={step.formula} defaultOpen />}
          {(tutorTurn.action === 'hint' || tutorTurn.action === 'example') && (
            <HintBody problem={problem} step={step} idx={idx} level={hint.level} />
          )}
        </TutorSheet>
      )}
    </div>
  );
}
