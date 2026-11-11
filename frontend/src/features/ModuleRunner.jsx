// Menjalankan satu modul: Contoh → Lengkapi → Latihan → Tantangan → Jelaskan → Skala usaha → Ringkasan.
import { useEffect, useMemo, useState } from 'react';
import { curriculum } from '../content/index.js';
import { saveProgress } from '../data/db.js';
import { logEvent } from '../data/events.js';
import { buildProblem } from '../domain/problems.js';
import { randomSeed } from '../domain/rng.js';
import { isMastered, masteryLevel, stars } from '../domain/scaffold.js';
import { t } from '../i18n/id.js';
import { Header, Stars } from '../ui/components.jsx';
import Mascot from '../ui/Mascot.jsx';
import { EffortRating, ExplainCards, Explore, WorkedExample } from './Learning.jsx';
import ProblemSolver from './ProblemSolver.jsx';

const STAGE_TITLE = {
  explore: t.exploreTitle,
  worked: t.workedTitle,
  completion: t.completionTitle,
  independent: t.independentTitle,
  transfer: t.transferTitle,
  explain: t.explainTitle,
};

function expand(module) {
  const tasks = [];
  for (const st of module.stages) {
    if (st.kind === 'independent') {
      for (let i = 0; i < st.count; i++) {
        tasks.push({ kind: 'independent', templateId: st.templates[i % st.templates.length], seed: randomSeed() });
      }
    } else {
      tasks.push({ kind: st.kind, templateId: st.template, cards: st.cards, seed: randomSeed() });
    }
  }
  return tasks;
}

export default function ModuleRunner({ module, studentCode, saved, onExit, onSolvingChange }) {
  const tasks = useMemo(() => expand(module), [module]);
  const [i, setI] = useState(0);
  const [history, setHistory] = useState([]);
  const [phase, setPhase] = useState('tasks'); // tasks | effort | summary
  const [result, setResult] = useState(null);
  const baseLevel = saved?.level ?? 0;
  const level = Math.max(baseLevel, masteryLevel(history));
  const task = tasks[i];
  const needsTransfer = module.stages.some((s) => s.kind === 'transfer');

  const problem = useMemo(
    () => (task?.templateId ? buildProblem(curriculum, task.templateId, task.seed, { transfer: task.kind === 'transfer' }) : null),
    [task],
  );

  useEffect(() => {
    if (problem && phase === 'tasks' && ['completion', 'independent', 'transfer'].includes(task.kind)) {
      logEvent('problem_start', { moduleId: module.id, problemId: problem.id, payload: { stage: task.kind, process: problem.process, seed: task.seed } });
    }
  }, [problem]); // eslint-disable-line react-hooks/exhaustive-deps

  // Beri tahu App kapan siswa sedang mengerjakan soal → hiasan latar diredupkan.
  const solving = phase === 'tasks' && ['completion', 'independent', 'transfer'].includes(task?.kind);
  useEffect(() => {
    onSolvingChange?.(solving);
  }, [solving, onSolvingChange]);

  const next = () => (i + 1 < tasks.length ? setI(i + 1) : setPhase('effort'));

  const onSolved = (r) => {
    const h = [...history, { stage: task.kind, correct: r.correct, maxHint: r.maxHint }];
    const before = Math.max(baseLevel, masteryLevel(history));
    const after = Math.max(baseLevel, masteryLevel(h));
    if (after !== before) logEvent('mastery_change', { moduleId: module.id, payload: { from: before, to: after } });
    setHistory(h);
    next();
  };

  const finish = async (effort) => {
    const mastered = isMastered(history, { needsTransfer });
    const s = Math.max(saved?.stars ?? 0, stars(history, { needsTransfer }) || 1);
    await saveProgress(studentCode, module.id, {
      completed: true,
      mastered: mastered || !!saved?.mastered,
      stars: s,
      level,
      history: [...(saved?.history ?? []), ...history].slice(-40),
      lastEffort: effort,
    });
    setResult({ mastered, stars: s });
    setPhase('summary');
  };

  let body;
  let sub = '';
  if (phase === 'effort') {
    body = <EffortRating moduleId={module.id} onDone={finish} />;
  } else if (phase === 'summary') {
    body = (
      <div className="stack grow">
        <div className="hero">
          <Mascot mood="cheer" size={140} />
          <h2 className="title">{t.summaryTitle}</h2>
        </div>
        <div className="card stack" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 34, color: '#e0a800' }}><Stars n={result.stars} /></div>
          <div>{module.goal}</div>
          <div className="muted small">
            {result.mastered ? 'Kamu sudah menguasai modul ini.' : 'Ulangi modul ini kapan saja untuk menambah bintang.'}
          </div>
        </div>
        <div className="actions">
          <button className="btn btn-primary" onClick={onExit}>{t.mapTitle}</button>
        </div>
      </div>
    );
  } else {
    sub = `${STAGE_TITLE[task.kind]} · ${i + 1}/${tasks.length}`;
    const key = `${i}-${task.seed}`;
    if (task.kind === 'explore') body = <Explore key={key} moduleId={module.id} onDone={next} />;
    else if (task.kind === 'worked') body = <WorkedExample key={key} problem={problem} sceneKind={module.scene} onDone={next} />;
    else if (task.kind === 'explain') body = <ExplainCards key={key} setId={task.cards} moduleId={module.id} onDone={next} />;
    else {
      body = (
        <ProblemSolver
          key={key}
          problem={problem}
          moduleId={module.id}
          sceneKind={module.scene}
          mode={task.kind}
          level={level}
          onDone={onSolved}
        />
      );
    }
  }

  return (
    <div className="screen">
      <Header title={`${module.id} · ${module.title}`} sub={sub} onBack={onExit} />
      {body}
    </div>
  );
}
