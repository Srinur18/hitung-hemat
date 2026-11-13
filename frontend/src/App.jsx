// Alur aplikasi: Masuk → Tes Awal → Cek Kesiapan (→ Bekal) → Peta Belajar ⇄ Modul → Tes Akhir.
// Peta Belajar punya tiga tab: Materi (ringkasan + contoh bertahap), Latihan (modul M1–M7 +
// Latihan Literasi per indikator), dan Tes (Tes Literasi Matematis 4 soal, maks. 24 poin).
import { useCallback, useEffect, useState } from 'react';
import { assessment, diagnostic } from './content/index.js';
import { getProfile, getProgress, resetProfile, saveProfile } from './data/db.js';
import { logEvent, setStudent } from './data/events.js';
import { syncEvents } from './data/sync.js';
import { LiteracyResult, LiteracyRunner, testItems } from './features/Literacy.jsx';
import { MaterialTopic } from './features/Material.jsx';
import ModuleRunner from './features/ModuleRunner.jsx';
import { scoreTest } from './domain/literacy.js';
import { LearningMap, Onboarding, Quiz, Remedial, ResearchPanel } from './features/Screens.jsx';
import { t } from './i18n/id.js';
import Decor from './ui/Decor.jsx';

const quietSync = () => syncEvents().catch(() => {});

export default function App() {
  const [profile, setProfile] = useState(undefined); // undefined = memuat
  const [progress, setProgress] = useState({});
  const [screen, setScreen] = useState({ name: 'map' });
  const [tab, setTab] = useState(null); // null = pilih otomatis
  const [solving, setSolving] = useState(false); // sedang mengerjakan soal → hiasan diredupkan

  const refresh = useCallback(async (p) => {
    if (p?.studentCode) setProgress(await getProgress(p.studentCode));
  }, []);

  useEffect(() => {
    (async () => {
      const p = await getProfile();
      if (p?.studentCode) {
        setStudent(p.studentCode);
        logEvent('session_start', { payload: { ua: navigator.userAgent.slice(0, 120) } });
        await refresh(p);
        quietSync();
      }
      setProfile(p);
    })();
  }, [refresh]);

  const update = async (patch) => setProfile(await saveProfile(patch));
  const toMap = () => setScreen({ name: 'map' });

  /** Tes/latihan literasi selesai: hitung skor lewat domain, simpan, catat event penelitian. */
  const finishLiteracy = async (mode, items, { answers, texts }) => {
    const r = scoreTest(items, answers);
    logEvent('literacy_result', {
      problemId: items.length === 1 ? items[0].id : 'test',
      payload: { kind: mode, total: r.total, max: r.max, byProcess: r.byProcess, texts },
    });
    if (mode === 'test') {
      const last = { total: r.total, max: r.max, byProcess: r.byProcess, answers, texts, at: new Date().toISOString() };
      const prev = profile.literacy;
      await update({ literacy: { attempts: (prev?.attempts ?? 0) + 1, first: prev?.first ?? last, last } });
    } else {
      await update({ literacyPractice: { ...(profile.literacyPractice ?? {}), [items[0].id]: { total: r.total, max: r.max } } });
    }
    setSolving(false);
    setScreen({ name: 'literacy-result', mode, items, answers, texts });
    quietSync();
  };

  const view = (() => {
    if (profile === undefined) return <div className="screen" aria-busy="true" />;

    if (!profile?.studentCode) {
      return (
        <Onboarding
          onDone={async (code) => {
            setStudent(code);
            await update({ studentCode: code, consentAt: new Date().toISOString() });
            logEvent('session_start', { payload: { firstRun: true } });
            await refresh({ studentCode: code });
          }}
        />
      );
    }

    if (!profile.pretestDone) {
      return (
        <Quiz
          key="pre"
          kind="pre"
          items={assessment.items}
          title={t.pretestTitle}
          intro={t.testIntro}
          onDone={(score) => update({ pretestDone: true, preScore: score })}
        />
      );
    }

    if (!profile.diagnosticDone) {
      if (profile.needsRemedial) return <Remedial onDone={() => update({ diagnosticDone: true, needsRemedial: false })} />;
      return (
        <Quiz
          key="diagnostic"
          kind="diagnostic"
          items={diagnostic.items}
          title={t.diagnosticTitle}
          intro={t.diagnosticIntro}
          onDone={(score) =>
            update(score >= diagnostic.passScore ? { diagnosticDone: true, diagnosticScore: score } : { needsRemedial: true, diagnosticScore: score })
          }
        />
      );
    }

    if (screen.name === 'module') {
      return (
        <ModuleRunner
          module={screen.module}
          studentCode={profile.studentCode}
          saved={progress[screen.module.id]}
          onSolvingChange={setSolving}
          onExit={async () => {
            setSolving(false);
            await refresh(profile);
            setScreen({ name: 'map' });
            quietSync();
          }}
        />
      );
    }

    if (screen.name === 'posttest') {
      return (
        <Quiz
          key="post"
          kind="post"
          items={assessment.items}
          title={t.posttestTitle}
          intro={t.testIntro}
          onDone={async (score) => {
            await update({ posttestDone: true, postScore: score });
            setScreen({ name: 'map' });
            quietSync();
          }}
        />
      );
    }

    if (screen.name === 'material') {
      return <MaterialTopic index={screen.index} onIndex={(index) => setScreen({ name: 'material', index })} onBack={toMap} />;
    }

    if (screen.name === 'literacy') {
      return (
        <LiteracyRunner
          key={`${screen.mode}-${screen.items.map((i) => i.id).join()}-${screen.run}`}
          mode={screen.mode}
          items={screen.items}
          onFinish={(res) => finishLiteracy(screen.mode, screen.items, res)}
          onExit={() => { setSolving(false); toMap(); }}
        />
      );
    }

    if (screen.name === 'literacy-result') {
      const startAgain = () => { setSolving(true); setScreen({ name: 'literacy', mode: screen.mode, items: screen.items, run: Date.now() }); };
      return (
        <LiteracyResult
          mode={screen.mode}
          items={screen.items}
          answers={screen.answers}
          texts={screen.texts}
          onRetry={startAgain}
          onBack={toMap}
        />
      );
    }

    if (screen.name === 'research') {
      return (
        <ResearchPanel
          onBack={() => setScreen({ name: 'map' })}
          onSwitchStudent={async () => {
            await resetProfile();
            setProgress({});
            setScreen({ name: 'map' });
            setProfile(null);
          }}
        />
      );
    }

    return (
      <LearningMap
        progress={progress}
        profile={profile}
        tab={tab ?? (Object.keys(progress).length || profile.literacy ? 'practice' : 'material')}
        onTab={setTab}
        onMaterial={(index) => setScreen({ name: 'material', index })}
        onLiteracyPractice={(item) => { setSolving(true); setScreen({ name: 'literacy', mode: 'practice', items: [item], run: Date.now() }); }}
        onLiteracyTest={() => { setSolving(true); setScreen({ name: 'literacy', mode: 'test', items: testItems, run: Date.now() }); }}
        onLiteracyResult={() =>
          setScreen({ name: 'literacy-result', mode: 'test', items: testItems, answers: profile.literacy.last.answers, texts: profile.literacy.last.texts })
        }
        onOpen={(module) => setScreen({ name: 'module', module })}
        onPosttest={() => setScreen({ name: 'posttest' })}
        onResearch={() => setScreen({ name: 'research' })}
      />
    );
  })();

  return (
    <>
      <Decor calm={solving && (screen.name === 'module' || screen.name === 'literacy')} />
      {view}
    </>
  );
}
