// Alur aplikasi (v0.3):
//   Beranda ─┬─ Mulai Belajar → Identitas → Sapaan → Perjalanan "Jalan Ruko Hemat"
//            │      → Tes Awal → Cek Kesiapan (→ Bekal) → Peta Belajar ⇄ Modul → Tes Akhir
//            ├─ Materi → topik T1–T7
//            ├─ Simulasi Belanja (kasir bertanya harga akhir)
//            ├─ Kuis / Tes → Tes Literasi Matematis (4 soal, maks. 24 poin) & Tes Akhir
//            └─ Profil (identitas & nilai)
// Peta Belajar tetap punya tab Materi | Latihan | Tes. Setiap halaman punya tombol Beranda (HomeContext).
import { useCallback, useEffect, useState } from 'react';
import { assessment, diagnostic } from './content/index.js';
import { getProfile, getProgress, resetProfile, saveProfile } from './data/db.js';
import { logEvent, setStudent } from './data/events.js';
import { syncEvents } from './data/sync.js';
import { scoreTest } from './domain/literacy.js';
import { Greeting, Home, Identity, Journey, MaterialHub, Profile, ShopSim } from './features/Home.jsx';
import { LiteracyResult, LiteracyRunner, testItems } from './features/Literacy.jsx';
import { MaterialTopic } from './features/Material.jsx';
import ModuleRunner from './features/ModuleRunner.jsx';
import { LearningMap, Quiz, Remedial, ResearchPanel } from './features/Screens.jsx';
import { t } from './i18n/id.js';
import { HomeContext } from './ui/components.jsx';
import Decor from './ui/Decor.jsx';

const quietSync = () => syncEvents().catch(() => {});
const NEEDS_PROFILE = new Set(['start', 'test', 'profile']);

export default function App() {
  const [profile, setProfile] = useState(undefined); // undefined = memuat
  const [progress, setProgress] = useState({});
  const [screen, setScreen] = useState({ name: 'home' });
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

  const update = async (patch) => {
    const next = await saveProfile(patch);
    setProfile(next);
    return next;
  };
  const go = (name, extra = {}) => {
    window.scrollTo?.(0, 0);
    setScreen({ name, ...extra });
  };
  const goHome = () => {
    setSolving(false);
    go('home');
  };

  /** Menu beranda. Mulai Belajar, Kuis/Tes, dan Profil butuh identitas siswa dulu. */
  const openMenu = (key) => {
    if (NEEDS_PROFILE.has(key) && !profile?.studentCode) return go('identity', { next: key });
    const target = { start: 'greeting', material: 'material-hub', sim: 'sim', test: 'testhub', profile: 'profile' }[key];
    return go(target);
  };

  /** Tes/latihan literasi selesai: hitung skor lewat domain, simpan, catat event penelitian. */
  const finishLiteracy = async (mode, items, { answers, texts }, from) => {
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
    go('literacy-result', { mode, items, answers, texts, from });
    quietSync();
  };

  const mapProps = (forcedTab) => ({
    progress,
    profile,
    tab: forcedTab ?? tab ?? (Object.keys(progress).length || profile.literacy ? 'practice' : 'material'),
    onTab: (k) => {
      setTab(k);
      if (forcedTab) go('map');
    },
    onMaterial: (index) => go('material', { index, from: 'map' }),
    onLiteracyPractice: (item) => {
      setSolving(true);
      go('literacy', { mode: 'practice', items: [item], run: Date.now(), from: 'map' });
    },
    onLiteracyTest: () => {
      setSolving(true);
      go('literacy', { mode: 'test', items: testItems, run: Date.now(), from: forcedTab ? 'testhub' : 'map' });
    },
    onLiteracyResult: () =>
      go('literacy-result', {
        mode: 'test',
        items: testItems,
        answers: profile.literacy.last.answers,
        texts: profile.literacy.last.texts,
        from: forcedTab ? 'testhub' : 'map',
      }),
    onOpen: (module) => go('module', { module }),
    onPosttest: () => go('posttest'),
    onResearch: () => go('research'),
  });

  const view = (() => {
    if (profile === undefined) return <div className="screen" aria-busy="true" />;
    const s = screen.name;

    if (s === 'home') return <Home profile={profile} onMenu={openMenu} />;
    if (s === 'material-hub') return <MaterialHub onOpen={(index) => go('material', { index, from: 'material-hub' })} />;
    if (s === 'material') {
      return (
        <MaterialTopic
          index={screen.index}
          onIndex={(index) => go('material', { index, from: screen.from })}
          onBack={() => go(screen.from ?? 'map')}
        />
      );
    }
    if (s === 'sim') return <ShopSim />;

    if (s === 'identity' || !profile?.studentCode) {
      return (
        <Identity
          profile={profile}
          onBack={goHome}
          onSave={async (patch) => {
            const isNew = !profile?.studentCode;
            const p = await update(patch);
            setStudent(p.studentCode);
            if (isNew) logEvent('session_start', { payload: { firstRun: true } });
            await refresh(p);
            const next = screen.next ?? 'start';
            go({ start: 'greeting', test: 'testhub', profile: 'profile' }[next] ?? 'greeting');
          }}
        />
      );
    }

    if (s === 'greeting') return <Greeting profile={profile} onContinue={() => go('journey')} onMap={() => go('map')} />;
    if (s === 'journey') {
      return (
        <Journey
          profile={profile}
          onDone={async () => {
            await update({ journeyDone: true });
            go('map');
          }}
        />
      );
    }
    if (s === 'profile') return <Profile profile={profile} progress={progress} onEdit={() => go('identity', { next: 'profile' })} />;
    if (s === 'testhub') return <LearningMap {...mapProps('test')} title={t.menu.test.label} />;

    if (s === 'literacy') {
      return (
        <LiteracyRunner
          key={`${screen.mode}-${screen.items.map((i) => i.id).join()}-${screen.run}`}
          mode={screen.mode}
          items={screen.items}
          onFinish={(res) => finishLiteracy(screen.mode, screen.items, res, screen.from)}
          onExit={() => {
            setSolving(false);
            go(screen.from ?? 'map');
          }}
        />
      );
    }

    if (s === 'literacy-result') {
      const startAgain = () => {
        setSolving(true);
        go('literacy', { mode: screen.mode, items: screen.items, run: Date.now(), from: screen.from });
      };
      return (
        <LiteracyResult
          mode={screen.mode}
          items={screen.items}
          answers={screen.answers}
          texts={screen.texts}
          onRetry={startAgain}
          onBack={() => go(screen.from ?? 'map')}
        />
      );
    }

    if (s === 'research') {
      return (
        <ResearchPanel
          onBack={() => go('map')}
          onSwitchStudent={async () => {
            await resetProfile();
            setProgress({});
            setProfile(null);
            go('home');
          }}
        />
      );
    }

    // ---- Peta Belajar & alur penelitian (tidak berubah) ----
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

    if (s === 'module') {
      return (
        <ModuleRunner
          module={screen.module}
          studentCode={profile.studentCode}
          saved={progress[screen.module.id]}
          onSolvingChange={setSolving}
          onExit={async () => {
            setSolving(false);
            await refresh(profile);
            go('map');
            quietSync();
          }}
        />
      );
    }

    if (s === 'posttest') {
      return (
        <Quiz
          key="post"
          kind="post"
          items={assessment.items}
          title={t.posttestTitle}
          intro={t.testIntro}
          onDone={async (score) => {
            await update({ posttestDone: true, postScore: score });
            go('map');
            quietSync();
          }}
        />
      );
    }

    return <LearningMap {...mapProps()} />;
  })();

  const scenic = screen.name === 'home' || screen.name === 'journey';
  return (
    <HomeContext.Provider value={screen.name === 'home' ? null : goHome}>
      {!scenic && <Decor calm={solving && (screen.name === 'module' || screen.name === 'literacy')} />}
      {view}
    </HomeContext.Provider>
  );
}
