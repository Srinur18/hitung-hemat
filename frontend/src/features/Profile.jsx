// Profil siswa: identitas, progres, pencapaian, lencana, nilai & riwayat, aspirasi/refleksi, suara.
// Semua tersimpan di profil lokal (IndexedDB/Dexie) sehingga tidak hilang saat aplikasi ditutup.
// Teks aspirasi/refleksi hanya disimpan di perangkat, tidak dikirim sebagai data penelitian.
import { useState } from 'react';
import { assessment, material, modules } from '../content/index.js';
import { activity, BADGES, earnedBadges, overallProgress } from '../domain/progress.js';
import { t } from '../i18n/id.js';
import { Header } from '../ui/components.jsx';
import Icon from '../ui/Icon.jsx';
import { Critter, PAL } from '../ui/ShopArt.jsx';
import { SoundSettings } from '../ui/SoundToggle.jsx';

export const META = { chapters: material.chapters.length, modules: modules.map((m) => m.id) };

function Ring({ value }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 84 84" width="84" height="84" role="img" aria-label={t.progressLabel(value)} className="ring">
      <circle cx="42" cy="42" r={r} fill="none" stroke="#ffe3e5" strokeWidth="9" className="ring-track" />
      <circle
        cx="42" cy="42" r={r} fill="none" stroke={PAL.green} strokeWidth="9" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} transform="rotate(-90 42 42)" className="ring-fill"
      />
      <text x="42" y="47" textAnchor="middle" fontSize="17" fontWeight="800" fill={PAL.ink} className="svg-display">{value}%</text>
    </svg>
  );
}

const fmtDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
};

const MOTIVATIONS = ['Ingin jadi pembeli cerdas', 'Ingin nilai matematika naik', 'Ingin membantu orang tua berbelanja', 'Suka tantangan hitung'];

export function Profile({ profile, progress, onEdit, onSave }) {
  const a = activity(profile, progress, META);
  const earned = new Set(earnedBadges(profile, progress, META));
  const pct = overallProgress(profile, progress, META);
  const lit = profile.literacy;
  const nPre = assessment.items.length;
  const [asp, setAsp] = useState({
    target: profile.aspiration?.target ?? '',
    motivation: profile.aspiration?.motivation ?? '',
    reflection: profile.aspiration?.reflection ?? '',
  });
  const [saved, setSaved] = useState(false);
  const change = (k) => (e) => {
    setAsp({ ...asp, [k]: e.target.value });
    setSaved(false);
  };

  const history = [
    ...(lit?.history ?? []).map((h, i) => ({ at: h.at, label: `${t.profileLitShort} #${i + 1}`, value: `${h.total}/${h.max}` })),
    ...(profile.simHistory ?? []).map((h) => ({ at: h.at, label: t.simTitle, value: `hemat ${h.savedText}` })),
  ].sort((x, y) => String(y.at).localeCompare(String(x.at)));

  return (
    <div className="screen">
      <Header title={t.profileTitle} />
      <div className="stack grow">
        {/* identitas + progres */}
        <div className="card profile-card">
          <svg viewBox="0 0 100 130" width="70" height="91" aria-hidden="true">
            <Critter type="bunny" shirt={PAL.pink} x={50} y={128} wave />
          </svg>
          <div className="stack grow" style={{ gap: 2 }}>
            <div className="section-title">{profile.name ?? '-'}</div>
            <div className="small">{t.classLabel}: <b>{profile.kelas ?? '-'}</b></div>
            <div className="small muted">Kode: {profile.studentCode}</div>
          </div>
          <Ring value={pct} />
        </div>

        {/* pencapaian */}
        <div className="section-title">{t.achievements}</div>
        <div className="stat-grid">
          <div className="stat tone-lavender"><b>{a.materials}/{a.chapters}</b><small>{t.statMaterial}</small></div>
          <div className="stat tone-mint"><b>{a.sims}</b><small>{t.statSim}</small></div>
          <div className="stat tone-butter"><b>{a.quizzes}</b><small>{t.statQuiz}</small></div>
        </div>
        <div className="card stack">
          <div className="row small"><span className="grow">{t.profileModules}</span><b>{a.modulesDone}/{a.modules}</b></div>
          <div className="bar"><span style={{ width: `${(100 * a.modulesDone) / (a.modules || 1)}%` }} /></div>
          <div className="row small"><span className="grow">{t.profilePractice}</span><b>{a.practice}/4</b></div>
          <div className="bar"><span style={{ width: `${(100 * a.practice) / 4}%` }} /></div>
        </div>

        {/* lencana */}
        <div className="section-title">{t.badges} <span className="muted small">({earned.size}/{BADGES.length})</span></div>
        <div className="badge-grid">
          {BADGES.map((b) => (
            <div key={b.id} className={`badge ${earned.has(b.id) ? 'got' : 'locked'}`} title={b.desc}>
              <span className="badge-ic"><Icon name={b.icon} size={22} /></span>
              <b>{b.name}</b>
              <small>{earned.has(b.id) ? b.desc : `🔒 ${b.desc}`}</small>
            </div>
          ))}
        </div>

        {/* nilai */}
        <div className="section-title">{t.scores}</div>
        <div className="card stack">
          <div className="row small profile-row"><span className="grow">{t.profilePre}</span><b>{profile.pretestDone ? `${profile.preScore ?? 0}/${nPre}` : t.notYet}</b></div>
          <div className="row small profile-row"><span className="grow">{t.profilePost}</span><b>{profile.posttestDone ? `${profile.postScore ?? 0}/${nPre}` : t.notYet}</b></div>
          <div className="row small profile-row"><span className="grow">{t.profileLitFirst}</span><b>{lit ? `${lit.first.total}/${lit.first.max}` : t.notYet}</b></div>
          <div className="row small profile-row"><span className="grow">{t.profileLit}</span><b>{lit ? `${lit.last.total}/${lit.last.max}` : t.notYet}</b></div>
          <div className="row small profile-row"><span className="grow">{t.profileTotal}</span><b>{a.literacyBest !== null ? `${a.literacyBest}/24` : t.notYet}</b></div>
        </div>
        <details className="card review">
          <summary><span className="grow">{t.history} ({history.length})</span></summary>
          {history.length === 0 ? (
            <div className="muted small">{t.historyEmpty}</div>
          ) : (
            <ul className="history">
              {history.map((h, i) => (
                <li key={i} className="row small"><span className="muted">{fmtDate(h.at)}</span><span className="grow">{h.label}</span><b>{h.value}</b></li>
              ))}
            </ul>
          )}
        </details>

        {/* aspirasi */}
        <div className="section-title">{t.aspiration}</div>
        <div className="card stack">
          <label className="stack small">
            {t.aspTarget}
            <textarea className="input textarea" rows={2} maxLength={200} placeholder={t.aspTargetPh} value={asp.target} onChange={change('target')} />
          </label>
          <div className="stack small">
            {t.aspMotivation}
            <div className="row" style={{ flexWrap: 'wrap' }}>
              {MOTIVATIONS.map((m) => (
                <button key={m} className={`chip small ${asp.motivation === m ? 'on' : ''}`} onClick={() => { setAsp({ ...asp, motivation: m }); setSaved(false); }}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <label className="stack small">
            {t.aspReflection}
            <textarea className="input textarea" rows={3} maxLength={400} placeholder={t.aspReflectionPh} value={asp.reflection} onChange={change('reflection')} />
          </label>
          <div className="muted small">{t.aspPrivacy}</div>
          <button
            className="btn btn-primary"
            onClick={async () => {
              await onSave({ aspiration: { ...asp, at: new Date().toISOString() } });
              setSaved(true);
            }}
          >
            {saved ? `✓ ${t.saved}` : t.save}
          </button>
        </div>

        <SoundSettings />
      </div>
      <div className="actions">
        <button className="btn" onClick={onEdit}>{t.profileEdit}</button>
      </div>
    </div>
  );
}

/** Notifikasi lencana baru (animasi hadiah). */
export function BadgeToast({ ids, onClose }) {
  const list = BADGES.filter((b) => ids.includes(b.id));
  if (!list.length) return null;
  return (
    <div className="badge-toast" role="status" onClick={onClose}>
      <div className="badge-toast-in">
        <div className="gift" aria-hidden="true">🏅</div>
        <b>{t.newBadge}</b>
        {list.map((b) => <div key={b.id}>{b.name}</div>)}
        <small className="muted">{t.tapToClose}</small>
      </div>
    </div>
  );
}
