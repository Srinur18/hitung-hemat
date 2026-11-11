// Alur aplikasi: Masuk → Tes Awal → Cek Kesiapan (→ Bekal) → Peta Belajar ⇄ Modul → Tes Akhir.
import { useCallback, useEffect, useState } from 'react';
import { assessment, diagnostic } from './content/index.js';
import { getProfile, getProgress, resetProfile, saveProfile } from './data/db.js';
import { logEvent, setStudent } from './data/events.js';
import { syncEvents } from './data/sync.js';
import ModuleRunner from './features/ModuleRunner.jsx';
import { LearningMap, Onboarding, Quiz, Remedial, ResearchPanel } from './features/Screens.jsx';
import { t } from './i18n/id.js';

const quietSync = () => syncEvents().catch(() => {});

export default function App() {
  const [profile, setProfile] = useState(undefined); // undefined = memuat
  const [progress, setProgress] = useState({});
  const [screen, setScreen] = useState({ name: 'map' });

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
        onExit={async () => {
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
      onOpen={(module) => setScreen({ name: 'module', module })}
      onPosttest={() => setScreen({ name: 'posttest' })}
      onResearch={() => setScreen({ name: 'research' })}
    />
  );
}
