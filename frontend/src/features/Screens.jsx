// Layar pendukung: masuk, tes awal/akhir, cek kesiapan, bekal prasyarat, peta belajar, panel peneliti.
import { useEffect, useState } from 'react';
import { diagnostic, modules } from '../content/index.js';
import { db } from '../data/db.js';
import { logEvent } from '../data/events.js';
import { exportCsv } from '../data/export.js';
import { API_URL, syncEvents } from '../data/sync.js';
import { parsePercent, parseRupiah } from '../domain/money.js';
import { t } from '../i18n/id.js';
import { Header, NumberPad, Stars } from '../ui/components.jsx';

const CODE_RE = /^[A-Za-z0-9_-]{2,16}$/;

export function Onboarding({ onDone }) {
  const [code, setCode] = useState('');
  const [stage, setStage] = useState('code');
  const valid = CODE_RE.test(code.trim());
  return (
    <div className="screen">
      <Header title={t.appName} />
      {stage === 'code' ? (
        <div className="stack grow">
          <h2>{t.welcome}</h2>
          <label className="stack small">
            {t.codeLabel}
            <input
              className="input"
              value={code}
              placeholder={t.codePlaceholder}
              autoCapitalize="characters"
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
          </label>
          {code && !valid && <div className="muted small">{t.codeInvalid}</div>}
          <div className="actions">
            <button className="btn btn-primary" disabled={!valid} onClick={() => setStage('consent')}>{t.next}</button>
          </div>
        </div>
      ) : (
        <div className="stack grow">
          <h2>{t.consentTitle}</h2>
          <p className="card">{t.consentBody}</p>
          <div className="actions">
            <button className="btn" onClick={() => setStage('code')}>{t.back}</button>
            <button className="btn btn-primary" onClick={() => onDone(code.trim())}>{t.consentAgree}</button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Soal tes tanpa umpan balik benar/salah (pre/post-test) atau cek kesiapan.
 * @param {{kind:'pre'|'post'|'diagnostic', items:object[], title:string, intro:string, onDone:(score:number)=>void}} props
 */
export function Quiz({ kind, items, title, intro, onDone }) {
  const [i, setI] = useState(-1);
  const [val, setVal] = useState('');
  const [choice, setChoice] = useState(null);
  const [score, setScore] = useState(0);
  const item = items[i];

  const answer = () => {
    const ans = item.choices ? choice : item.type === 'percent' ? parsePercent(val) : parseRupiah(val);
    const correct = ans === item.answer;
    logEvent(kind === 'diagnostic' ? 'diagnostic_answer' : 'assessment_answer', {
      payload: { kind, itemId: item.id, process: item.process ?? item.skill, answer: ans, correct },
    });
    const s = score + (correct ? 1 : 0);
    setScore(s);
    setVal('');
    setChoice(null);
    if (i + 1 < items.length) setI(i + 1);
    else onDone(s);
  };

  return (
    <div className="screen">
      <Header title={title} sub={i >= 0 ? `${i + 1}/${items.length}` : ''} />
      {i < 0 ? (
        <div className="stack grow">
          <p className="card">{intro}</p>
          <div className="actions">
            <button className="btn btn-primary" onClick={() => setI(0)}>{t.start}</button>
          </div>
        </div>
      ) : (
        <div className="stack grow">
          <p className="problem-text">{item.prompt}</p>
          {item.choices ? (
            <div className="options">
              {item.choices.map((c, k) => (
                <button key={c} className={`option ${choice === k ? 'on' : ''}`} style={{ fontSize: 17 }} onClick={() => setChoice(k)}>
                  {c}
                </button>
              ))}
            </div>
          ) : (
            <NumberPad value={val} onChange={setVal} kind={item.type} role={item.type === 'percent' ? 'percent' : 'result'} />
          )}
          <div className="actions">
            <button className="btn btn-primary" disabled={item.choices ? choice === null : !val} onClick={answer}>
              {t.next}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Remedial({ onDone }) {
  const [i, setI] = useState(0);
  const card = diagnostic.remedial[i];
  return (
    <div className="screen">
      <Header title={t.remedialTitle} sub={`${i + 1}/${diagnostic.remedial.length}`} />
      <div className="stack grow">
        <div className="card stack">
          <div className="step-title">{card.title}</div>
          <div>{card.body}</div>
        </div>
        <div className="actions">
          {i > 0 && <button className="btn" onClick={() => setI(i - 1)}>{t.back}</button>}
          <button className="btn btn-primary" onClick={() => (i + 1 < diagnostic.remedial.length ? setI(i + 1) : onDone())}>
            {t.next}
          </button>
        </div>
      </div>
    </div>
  );
}

export function LearningMap({ progress, profile, onOpen, onPosttest, onResearch }) {
  const allDone = modules.every((m) => progress[m.id]?.completed);
  return (
    <div className="screen">
      <Header
        title={t.mapTitle}
        sub={`Kode: ${profile.studentCode}`}
        right={<button className="icon-btn" onClick={onResearch} aria-label={t.research}>⚙</button>}
      />
      <div className="stack">
        {modules.map((m, k) => {
          const p = progress[m.id];
          const unlocked = k === 0 || progress[modules[k - 1].id]?.completed;
          return (
            <button
              key={m.id}
              className="card module btn"
              disabled={!unlocked}
              onClick={() => onOpen(m)}
              aria-label={unlocked ? m.title : `${m.title}: ${t.locked}`}
            >
              <span className="id">{m.id}</span>
              <span className="grow">
                <div>{m.title}</div>
                <div className="muted small" style={{ fontWeight: 400 }}>{unlocked ? m.goal : t.locked}</div>
              </span>
              <Stars n={p?.stars ?? 0} />
            </button>
          );
        })}
        {allDone && !profile.posttestDone && (
          <div className="card stack">
            <div>{t.posttestReady}</div>
            <button className="btn btn-primary" onClick={onPosttest}>{t.posttestTitle}</button>
          </div>
        )}
        {profile.posttestDone && <div className="card">Terima kasih! Kamu sudah menyelesaikan semua tes.</div>}
      </div>
    </div>
  );
}

const RESEARCH_PIN = import.meta.env.VITE_RESEARCH_PIN ?? '2026';

export function ResearchPanel({ onBack, onSwitchStudent }) {
  const [pin, setPin] = useState('');
  const [stats, setStats] = useState(null);
  const [msg, setMsg] = useState('');
  const open = pin === RESEARCH_PIN;

  useEffect(() => {
    if (!open) return;
    (async () => {
      const total = await db.events.count();
      const unsynced = await db.events.where('synced').equals(0).count();
      setStats({ total, unsynced });
    })();
  }, [open, msg]);

  const run = async (fn) => {
    try {
      setMsg(await fn());
    } catch (e) {
      setMsg(`Gagal: ${e.message}`);
    }
  };

  return (
    <div className="screen">
      <Header title={t.research} onBack={onBack} />
      {!open ? (
        <label className="stack small">
          {t.pin}
          <input className="input" type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} />
        </label>
      ) : (
        <div className="stack grow">
          <div className="card">
            <div>Event tersimpan: <b>{stats?.total ?? '…'}</b></div>
            <div>Belum terkirim: <b>{stats?.unsynced ?? '…'}</b></div>
            <div className="muted small">Server: {API_URL || 'belum diatur (mode offline)'}</div>
          </div>
          {msg && <div className="card small">{msg}</div>}
          <div className="actions" style={{ flexDirection: 'column' }}>
            <button className="btn btn-primary" onClick={() => run(async () => `Diekspor: ${await exportCsv()}`)}>{t.exportCsv}</button>
            {API_URL && (
              <button className="btn" onClick={() => run(async () => { const r = await syncEvents(); return r.skipped ?? `Terkirim ${r.sent} event`; })}>
                {t.sync}
              </button>
            )}
            <button className="btn" onClick={onSwitchStudent}>{t.switchStudent}</button>
          </div>
        </div>
      )}
    </div>
  );
}
