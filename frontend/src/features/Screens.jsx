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
import { KikoSays } from '../ui/Mascot.jsx';
import { indicators, LiteracyKey, practiceItems, testItems } from './Literacy.jsx';
import { MaterialList } from './Material.jsx';

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
          <div className="hero">
            <h2 className="title">{t.appName}</h2>
            <KikoSays mood="wave" size={110}>Halo, aku Kiko! {t.welcome}</KikoSays>
          </div>
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
          <KikoSays mood="think" size={84}>{t.consentTitle}</KikoSays>
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
          <KikoSays mood="wave" size={96}>{intro}</KikoSays>
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
        <KikoSays mood="think" size={80}>Kita siapkan bekal dulu, ya!</KikoSays>
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

const TABS = ['material', 'practice', 'test'];

/**
 * Peta belajar dengan navigasi utama Materi | Latihan | Tes.
 * Tab Latihan berisi modul M1–M7 (fitur lama) + Latihan Literasi per indikator.
 */
export function LearningMap({
  progress, profile, tab = 'practice', onTab = () => {}, onOpen, onPosttest, onResearch, title = t.mapTitle,
  onMaterial = () => {}, onLiteracyPractice = () => {}, onLiteracyTest = () => {}, onLiteracyResult = () => {},
}) {
  const allDone = modules.every((m) => progress[m.id]?.completed);
  const nextModule = modules.find((m) => !progress[m.id]?.completed);
  const lit = profile.literacy;
  const kiko = {
    material: 'Mulai dari Materi, lalu coba Latihan.',
    practice: allDone ? 'Hebat! Semua modul selesai.' : nextModule ? `Yuk, mulai ${nextModule.id}: ${nextModule.title}` : 'Yuk, lanjut belajar!',
    test: lit ? `Skor terakhirmu ${lit.last.total}/${lit.last.max}. Bisa dicoba lagi!` : 'Siap menguji kemampuan literasimu?',
  }[tab];
  return (
    <div className="screen">
      <Header
        title={title}
        sub={`Kode: ${profile.studentCode}`}
        right={<button className="icon-btn" onClick={onResearch} aria-label={t.research}>⚙</button>}
      />
      <div className="stack">
        <div className="tabs" role="tablist">
          {TABS.map((k) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => onTab(k)}>{t.tabs[k]}</button>
          ))}
        </div>
        <KikoSays mood={allDone && tab === 'practice' ? 'cheer' : 'wave'} size={80}>{kiko}</KikoSays>

        {tab === 'material' && <MaterialList onOpen={onMaterial} />}

        {tab === 'test' && (
          <>
            <div className="card stack">
              <div className="section-title">{t.literacyTestTitle}</div>
              <div className="small">{t.literacyTestHelp}</div>
              <ol className="small" style={{ margin: 0, paddingLeft: 20 }}>
                {testItems.map((it) => <li key={it.id}>{indicators[it.process].name}</li>)}
              </ol>
              {lit && <div className="small"><b>{t.literacyLast(lit.last.total, lit.last.max)}</b></div>}
              <div className="actions" style={{ paddingTop: 4 }}>
                {lit && <button className="btn" onClick={onLiteracyResult}>{t.literacySeeResult}</button>}
                <button className="btn btn-primary" onClick={onLiteracyTest}>{lit ? t.literacyRetry : t.literacyStart}</button>
              </div>
            </div>
            {allDone && !profile.posttestDone && (
              <div className="card stack">
                <div>{t.posttestReady}</div>
                <button className="btn btn-primary" onClick={onPosttest}>{t.posttestTitle}</button>
              </div>
            )}
            {profile.posttestDone && <div className="card">Tes Akhir sudah selesai. Terima kasih!</div>}
          </>
        )}

        {tab === 'practice' && (
          <>
            <div className="section-title">{t.literacyPracticeTitle}</div>
            <div className="muted small">{t.literacyPracticeHelp}</div>
            {practiceItems.map((it) => (
              <button key={it.id} className="card module btn" onClick={() => onLiteracyPractice(it)}>
                <span className="id">{indicators[it.process].order}</span>
                <span className="grow">
                  <div>{indicators[it.process].name}</div>
                  <div className="muted small" style={{ fontWeight: 400 }}>{it.title}</div>
                </span>
                {profile.literacyPractice?.[it.id] && <span aria-label="sudah dikerjakan">✓</span>}
              </button>
            ))}
            <div className="section-title">{t.modulesTitle}</div>
          </>
        )}

        {tab === 'practice' && modules.map((m, k) => {
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
        {tab === 'practice' && allDone && !profile.posttestDone && (
          <div className="card stack">
            <div>{t.posttestReady}</div>
            <button className="btn btn-primary" onClick={onPosttest}>{t.posttestTitle}</button>
          </div>
        )}
        {tab === 'practice' && profile.posttestDone && <div className="card">Terima kasih! Kamu sudah menyelesaikan semua tes.</div>}
      </div>
    </div>
  );
}

const RESEARCH_PIN = import.meta.env.VITE_RESEARCH_PIN ?? '2026';

export function ResearchPanel({ onBack, onSwitchStudent }) {
  const [pin, setPin] = useState('');
  const [stats, setStats] = useState(null);
  const [msg, setMsg] = useState('');
  const [showKey, setShowKey] = useState(false);
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
          <button className="btn" aria-expanded={showKey} onClick={() => setShowKey(!showKey)}>
            {showKey ? `Tutup ${t.literacyKeyTitle}` : t.literacyKeyTitle}
          </button>
          {showKey && <LiteracyKey />}
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
