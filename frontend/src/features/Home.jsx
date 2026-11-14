// Dunia toko HitungHemat: Beranda, Identitas, Sapaan, Perjalanan Belajar, hub Materi.
// (Simulasi Belanja → Shop.jsx, Profil → Profile.jsx.)
// Animasi hanya di layar tanpa tugas hitung. Komponen tidak menghitung sendiri: angka lewat domain/.
import { useEffect, useMemo, useState } from 'react';
import { journey } from '../content/index.js';
import { logEvent } from '../data/events.js';
import { materialVars } from '../domain/literacy.js';
import { t } from '../i18n/id.js';
import { play } from '../ui/audio.js';
import { Header, RichText } from '../ui/components.jsx';
import Icon from '../ui/Icon.jsx';
import { KikoSays } from '../ui/Mascot.jsx';
import { Critter, JourneyStreet, PAL, ShopStreet } from '../ui/ShopArt.jsx';
import { SoundButtons } from '../ui/SoundToggle.jsx';
import { MaterialList } from './Material.jsx';

const MENU = [
  { key: 'start', icon: 'start', tone: 'coral' },
  { key: 'material', icon: 'book', tone: 'butter' },
  { key: 'sim', icon: 'cart', tone: 'mint' },
  { key: 'test', icon: 'quiz', tone: 'lavender' },
  { key: 'profile', icon: 'user', tone: 'coral' },
];

/* ---------------- Beranda ---------------- */

export function Home({ profile, onMenu }) {
  const [pressed, setPressed] = useState(null);
  const go = (key) => {
    setPressed(key);
    setTimeout(() => onMenu(key), 180); // beri waktu animasi "pop" tombol
  };
  return (
    <div className="screen home">
      <SoundButtons />
      <div className="home-hero">
        <h1 className="home-title" aria-label={t.appName}>
          {t.appTitle.split('').map((ch, i) => (
            <span key={i} style={{ animationDelay: `${i * 0.05}s` }}>{ch}</span>
          ))}
        </h1>
        <p className="home-slogan">{t.slogan}</p>
        {profile?.name && <div className="home-hello">{t.hello(profile.name.split(' ')[0])}</div>}
        <div className="home-scene">
          <ShopStreet />
        </div>
      </div>
      <nav className="home-menu" aria-label="Menu utama">
        {MENU.map((m) => (
          <button
            key={m.key}
            className={`menu-btn tone-${m.tone} ${m.key === 'start' ? 'menu-main' : ''} ${pressed === m.key ? 'pop' : ''}`}
            onClick={() => go(m.key)}
          >
            <span className="menu-ic"><Icon name={m.icon} size={26} /></span>
            <span className="menu-txt">
              <b>{t.menu[m.key].label}</b>
              <small>{t.menu[m.key].sub}</small>
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
}

/* ---------------- Identitas ---------------- */

const CODE_RE = /^[A-Za-z0-9_-]{2,16}$/;
const NAME_RE = /^[\p{L} .'-]{2,40}$/u;
const randomCode = () => `HH${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

export function Identity({ profile, onSave, onBack }) {
  const [name, setName] = useState(profile?.name ?? '');
  const [kelas, setKelas] = useState(profile?.kelas ?? '');
  const [code, setCode] = useState(profile?.studentCode ?? '');
  const locked = !!profile?.studentCode; // kode tidak boleh diubah: data penelitian terikat padanya
  const nameOk = NAME_RE.test(name.trim());
  const kelasOk = kelas.trim().length >= 1 && kelas.trim().length <= 12;
  const codeOk = !code.trim() || CODE_RE.test(code.trim());
  const ok = nameOk && kelasOk && codeOk;

  const save = () =>
    onSave({
      name: name.trim().replace(/\s+/g, ' '),
      kelas: kelas.trim().toUpperCase(),
      studentCode: locked ? profile.studentCode : code.trim() || randomCode(),
      ...(locked ? {} : { consentAt: new Date().toISOString() }),
    });

  return (
    <div className="screen">
      <Header title={t.identityTitle} onBack={onBack} />
      <div className="stack grow">
        <KikoSays mood="wave" size={84}>{t.identityIntro}</KikoSays>
        <div className="card stack">
          <label className="stack small">
            {t.nameLabel}
            <input className="input" value={name} placeholder={t.namePlaceholder} maxLength={40} onChange={(e) => setName(e.target.value)} />
          </label>
          {name && !nameOk && <div className="muted small">{t.nameInvalid}</div>}
          <label className="stack small">
            {t.classLabel}
            <input className="input" value={kelas} placeholder={t.classPlaceholder} maxLength={12} onChange={(e) => setKelas(e.target.value)} />
          </label>
          {kelas && !kelasOk && <div className="muted small">{t.classInvalid}</div>}
          <label className="stack small">
            {t.codeOptional}
            <input
              className="input"
              value={code}
              placeholder={t.codePlaceholder}
              autoCapitalize="characters"
              disabled={locked}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
          </label>
          {!codeOk && <div className="muted small">{t.codeInvalid}</div>}
          <div className="muted small">{t.privacyNote} {t.consentBody}</div>
        </div>
      </div>
      <div className="actions">
        <button className="btn btn-primary" disabled={!ok} onClick={save}>{t.startButton}</button>
      </div>
    </div>
  );
}

/* ---------------- Sapaan ---------------- */

export function Greeting({ profile, onContinue, onMap }) {
  return (
    <div className="screen">
      <Header title={t.appName} />
      <div className="stack grow greet">
        <svg viewBox="0 0 200 140" className="greet-art" role="img" aria-label="Kelinci pelanggan dan beruang pemilik toko melambai">
          <Critter type="bunny" shirt={PAL.pink} wave x={70} y={136} scale={1} className="bob" />
          <Critter type="bear" role="owner" shirt={PAL.green} wave x={140} y={136} scale={0.9} />
        </svg>
        <h2 className="greet-title">{t.hello(profile.name ?? profile.studentCode)}</h2>
        <p className="card greet-text">{t.welcomeLong}</p>
      </div>
      <div className="actions">
        {profile.journeyDone && <button className="btn" onClick={onMap}>{t.goToMap}</button>}
        <button className="btn btn-primary" onClick={onContinue}>{t.continue}</button>
      </div>
    </div>
  );
}

/* ---------------- Perjalanan Belajar ---------------- */

export function Journey({ profile, onDone }) {
  const stages = journey.stages;
  const [i, setI] = useState(0);
  const [walking, setWalking] = useState(false);
  const st = stages[i];
  const vars = useMemo(() => ({ name: profile.name?.split(' ')[0] ?? profile.studentCode, ...materialVars(st) }), [st, profile]);
  const last = i === stages.length - 1;

  useEffect(() => {
    setWalking(true);
    const id = setTimeout(() => setWalking(false), 1200); // hanya animasi berjalan; tidak memindah tahap
    logEvent('material_view', { payload: { journey: st.id } });
    return () => clearTimeout(id);
  }, [i, st.id]);

  return (
    <div className="screen">
      <Header title={t.journeyTitle} sub={t.journeyStage(i + 1, stages.length)} />
      <div className="stack grow">
        <JourneyStreet stage={i} walking={walking} />
        <div className="dots" aria-hidden="true">
          {stages.map((s, k) => <span key={s.id} className={k <= i ? 'on' : ''} />)}
        </div>
        <div className="card stack journey-card" key={st.id}>
          <div className="section-title">{st.title}</div>
          <RichText text={st.body} vars={vars} className="journey-body" />
          {st.formula && (
            <div className="card formula small">
              <div className="step-label">{t.formula}</div>
              <b>{st.formula}</b>
            </div>
          )}
          {st.lines.length > 0 && (
            <ul className="journey-lines">
              {st.lines.map((l, k) => (
                <li key={k}><RichText text={l} vars={vars} className="" /></li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="actions">
        {i > 0 && <button className="btn" onClick={() => setI(i - 1)}>{t.back}</button>}
        <button className="btn btn-primary" onClick={() => (last ? (play('success'), onDone()) : setI(i + 1))}>
          {last ? t.goToMap : t.continue}
        </button>
      </div>
    </div>
  );
}

/* ---------------- Materi (dari beranda) ---------------- */

export function MaterialHub({ onOpen, onFormulas, onGlossary, seen }) {
  return (
    <div className="screen">
      <Header title={t.tabs.material} />
      <MaterialList onOpen={onOpen} onFormulas={onFormulas} onGlossary={onGlossary} seen={seen} />
    </div>
  );
}
