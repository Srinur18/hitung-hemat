// Dunia toko HitungHemat: Beranda, Identitas, Sapaan, Perjalanan Belajar, Simulasi Belanja, Profil.
// Animasi hanya di layar tanpa tugas hitung (beranda, perjalanan). Komponen tidak menghitung sendiri:
// semua angka lewat domain/ (materialVars, checkoutChoices, receipt).
import { useEffect, useMemo, useState } from 'react';
import { assessment, journey, modules, shop } from '../content/index.js';
import { logEvent } from '../data/events.js';
import { materialVars } from '../domain/literacy.js';
import { formatBp, formatRp } from '../domain/money.js';
import { mulberry32 } from '../domain/rng.js';
import { CHOICE_FEEDBACK, checkoutChoices, receipt } from '../domain/shop.js';
import { t } from '../i18n/id.js';
import { Feedback, Header, RichText, Sheet } from '../ui/components.jsx';
import Icon from '../ui/Icon.jsx';
import { KikoSays } from '../ui/Mascot.jsx';
import { Critter, JourneyStreet, PAL, ProductIcon, ShopStreet } from '../ui/ShopArt.jsx';
import { MaterialList } from './Material.jsx';

const MENU = [
  { key: 'start', icon: 'start', tone: 'blue' },
  { key: 'material', icon: 'book', tone: 'pink' },
  { key: 'sim', icon: 'cart', tone: 'green' },
  { key: 'test', icon: 'quiz', tone: 'purple' },
  { key: 'profile', icon: 'user', tone: 'yellow' },
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
        <button className="btn btn-primary" onClick={() => (last ? onDone() : setI(i + 1))}>
          {last ? t.goToMap : t.continue}
        </button>
      </div>
    </div>
  );
}

/* ---------------- Materi (dari beranda) ---------------- */

export function MaterialHub({ onOpen }) {
  return (
    <div className="screen">
      <Header title={t.tabs.material} />
      <MaterialList onOpen={onOpen} />
    </div>
  );
}

/* ---------------- Simulasi Belanja ---------------- */

function Checkout({ product, onAdd, onClose }) {
  const choices = useMemo(() => checkoutChoices(product, mulberry32((Date.now() >>> 0) ^ product.price)), [product]);
  const [picked, setPicked] = useState(null);
  const pick = (k) => {
    setPicked(k);
    logEvent('scene_interact', { moduleId: 'SIM', payload: { scene: 'checkout', product: product.id, choice: choices[k].kind, correct: choices[k].kind === 'correct' } });
  };
  const ok = picked !== null && choices[picked].kind === 'correct';
  return (
    <Sheet onClose={onClose}>
      <div className="row">
        <svg viewBox="0 0 100 130" width="56" height="72" aria-hidden="true">
          <Critter type="cat" role="cashier" shirt={PAL.lilac} x={50} y={128} wave={ok} />
        </svg>
        <div className="grow">
          <h2 style={{ margin: 0 }}>{product.name}</h2>
          <div className="muted small">{product.shop}</div>
        </div>
      </div>
      <RichText
        text="Harga awal {price|price}, diskon {pct|percent}."
        vars={{ price: product.price, pct: product.pct }}
        className="problem-text"
      />
      <div className="step-title">{t.simAsk}</div>
      <div className="options" role="radiogroup">
        {choices.map((c, k) => (
          <button
            key={k}
            role="radio"
            aria-checked={picked === k}
            className={`option ${picked === k ? 'on' : ''}`}
            disabled={ok}
            onClick={() => pick(k)}
          >
            {formatRp(c.value)}
          </button>
        ))}
      </div>
      {picked !== null && (
        <Feedback kind={ok ? 'good' : 'bad'} kiko>{CHOICE_FEEDBACK[choices[picked].kind]}</Feedback>
      )}
      <div className="actions">
        <button className="btn" onClick={onClose}>{t.close}</button>
        <button className="btn btn-primary" disabled={!ok} onClick={onAdd}>{t.simAdd}</button>
      </div>
    </Sheet>
  );
}

export function ShopSim() {
  const [cart, setCart] = useState([]);
  const [open, setOpen] = useState(null);
  const r = receipt(cart);
  return (
    <div className="screen">
      <Header title={t.simTitle} />
      <div className="stack grow">
        <KikoSays mood="think" size={72}>{t.simIntro}</KikoSays>
        <div className="shelf">
          {shop.products.map((p) => (
            <button key={p.id} className="product" onClick={() => setOpen(p)} aria-label={`${p.name}, ${formatRp(p.price)}, diskon ${formatBp(p.pct)}`}>
              <span className="product-tag">-{formatBp(p.pct)}</span>
              <ProductIcon kind={p.kind} />
              <b>{p.name}</b>
              <span className="product-price">{formatRp(p.price)}</span>
            </button>
          ))}
        </div>
        <div className="card receipt" aria-label={t.simCart}>
          <div className="row"><b className="grow">🧾 {t.simCart}</b>{cart.length > 0 && <span>{cart.length} barang</span>}</div>
          {cart.length === 0 ? (
            <div className="muted small">{t.simEmpty}</div>
          ) : (
            <>
              {r.lines.map((l, k) => (
                <div key={k} className="small">
                  <div className="line"><span>{l.name.toUpperCase()}</span><b className="n" style={{ color: 'var(--c-price)' }}>{formatRp(l.price)}</b></div>
                  <div className="line"><span>  DISKON {formatBp(l.pct)}</span><b className="n" style={{ color: 'var(--c-discount)' }}>−{formatRp(l.disc)}</b></div>
                </div>
              ))}
              <hr />
              <div className="line"><span>{t.simSaved.toUpperCase()}</span><b className="n" style={{ color: 'var(--c-discount)' }}>{formatRp(r.totalDisc)}</b></div>
              <div className="line"><span>{t.simTotal.toUpperCase()}</span><b className="n" style={{ color: 'var(--c-result)' }}>{formatRp(r.total)}</b></div>
            </>
          )}
        </div>
      </div>
      {cart.length > 0 && (
        <div className="actions">
          <button className="btn" onClick={() => setCart([])}>{t.simReset}</button>
        </div>
      )}
      {open && (
        <Checkout
          product={open}
          onClose={() => setOpen(null)}
          onAdd={() => {
            setCart([...cart, open]);
            setOpen(null);
          }}
        />
      )}
    </div>
  );
}

/* ---------------- Profil ---------------- */

export function Profile({ profile, progress, onEdit }) {
  const doneMods = modules.filter((m) => progress[m.id]?.completed).length;
  const stars = modules.reduce((s, m) => s + (progress[m.id]?.stars ?? 0), 0);
  const lit = profile.literacy;
  const practiceDone = Object.keys(profile.literacyPractice ?? {}).length;
  const rows = [
    [t.profileModules, `${doneMods}/${modules.length} · ${stars}★`],
    [t.profilePre, profile.pretestDone ? `${profile.preScore ?? 0}/${assessment.items.length}` : t.notYet],
    [t.profilePost, profile.posttestDone ? `${profile.postScore ?? 0}/${assessment.items.length}` : t.notYet],
    [t.profilePractice, `${practiceDone}/4`],
    [t.profileLitFirst, lit ? `${lit.first.total}/${lit.first.max}` : t.notYet],
    [t.profileLit, lit ? `${lit.last.total}/${lit.last.max}` : t.notYet],
  ];
  return (
    <div className="screen">
      <Header title={t.profileTitle} />
      <div className="stack grow">
        <div className="card profile-card">
          <svg viewBox="0 0 100 130" width="80" height="104" aria-hidden="true">
            <Critter type="bunny" shirt={PAL.pink} x={50} y={128} wave />
          </svg>
          <div className="stack" style={{ gap: 2 }}>
            <div className="section-title">{profile.name ?? '-'}</div>
            <div className="small">{t.classLabel}: <b>{profile.kelas ?? '-'}</b></div>
            <div className="small muted">Kode: {profile.studentCode}</div>
          </div>
        </div>
        <div className="card stack">
          {rows.map(([k, v]) => (
            <div key={k} className="row small profile-row">
              <span className="grow">{k}</span>
              <b>{v}</b>
            </div>
          ))}
        </div>
      </div>
      <div className="actions">
        <button className="btn" onClick={onEdit}>{t.profileEdit}</button>
      </div>
    </div>
  );
}
