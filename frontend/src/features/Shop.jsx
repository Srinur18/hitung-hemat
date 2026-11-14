// Simulasi Belanja: siswa menjadi pelanggan Toko Serba Ada HitungHemat.
// Rak per kategori → rincian otomatis (Harga Awal → Potongan → Harga Akhir) → keranjang
// (tambah/hapus, total diperbarui otomatis) → bayar → struk digital.
// Tantangan Kasir (fitur v0.3) tetap tersedia di rincian barang.
// Semua angka dari domain/shop.js — komponen tidak menghitung sendiri.
import { useMemo, useState } from 'react';
import { shop } from '../content/index.js';
import { logEvent } from '../data/events.js';
import { formatBp, formatRp, formatValue } from '../domain/money.js';
import { mulberry32 } from '../domain/rng.js';
import { addToCart, CHOICE_FEEDBACK, checkoutChoices, priceBreakdown, receipt, removeFromCart } from '../domain/shop.js';
import { t } from '../i18n/id.js';
import { play } from '../ui/audio.js';
import { Feedback, Header, Sheet } from '../ui/components.jsx';
import { KikoSays } from '../ui/Mascot.jsx';
import { Critter, PAL, ProductIcon, Star, StoreFront } from '../ui/ShopArt.jsx';

const catName = Object.fromEntries(shop.categories.map((c) => [c.id, c.name]));

/** Alur tiga kotak: Harga Awal → Potongan Harga → Harga Akhir. */
function PriceFlow({ b }) {
  return (
    <div className="flow" aria-label={t.simFlow}>
      <div className="box box-price pop-in"><small>{t.roles.price}</small><b>{formatRp(b.price)}</b></div>
      <span className="flow-arrow" aria-hidden="true">→</span>
      <div className="box box-discount pop-in" style={{ animationDelay: '0.15s' }}><small>{t.simCut}</small><b>−{formatRp(b.disc)}</b></div>
      <span className="flow-arrow" aria-hidden="true">→</span>
      <div className="box box-result pop-in" style={{ animationDelay: '0.3s' }}><small>{t.roles.result}</small><b>{formatRp(b.final)}</b></div>
    </div>
  );
}

function CashierChallenge({ product, onDone }) {
  const choices = useMemo(() => checkoutChoices(product, mulberry32((Date.now() >>> 0) ^ product.price)), [product]);
  const [picked, setPicked] = useState(null);
  const ok = picked !== null && choices[picked].kind === 'correct';
  const pick = (k) => {
    setPicked(k);
    logEvent('scene_interact', { moduleId: 'SIM', payload: { scene: 'checkout', product: product.id, choice: choices[k].kind, correct: choices[k].kind === 'correct' } });
  };
  return (
    <div className="stack">
      <div className="step-title">{t.simAsk}</div>
      <div className="options" role="radiogroup">
        {choices.map((c, k) => (
          <button key={k} role="radio" aria-checked={picked === k} className={`option ${picked === k ? `on ${choices[k].kind === 'correct' ? 'good' : 'bad'}` : ''}`} disabled={ok} onClick={() => pick(k)}>
            {formatRp(c.value)}
          </button>
        ))}
      </div>
      {picked !== null && <Feedback kind={ok ? 'good' : 'bad'} kiko>{CHOICE_FEEDBACK[choices[picked].kind]}</Feedback>}
      {ok && <button className="btn" onClick={onDone}>{t.simSeeDetail}</button>}
    </div>
  );
}

/** Rincian barang: dihitung otomatis. */
function ProductSheet({ product, onAdd, onClose }) {
  const b = priceBreakdown(product);
  const [challenge, setChallenge] = useState(false);
  return (
    <Sheet onClose={onClose}>
      <div className="row">
        <span className="sheet-product"><ProductIcon kind={product.kind} size={70} /></span>
        <div className="grow">
          <h2 style={{ margin: 0 }}>{product.name}</h2>
          <div className="muted small">{catName[product.category]} · {product.shop}</div>
        </div>
        <svg viewBox="0 0 100 130" width="48" height="62" aria-hidden="true">
          <Critter type="cat" role="cashier" shirt={PAL.lilac} x={50} y={128} wave />
        </svg>
      </div>
      {challenge ? (
        <CashierChallenge product={product} onDone={() => setChallenge(false)} />
      ) : (
        <>
          <PriceFlow b={b} />
          <div className="card calc small">
            <div>{t.simDisc}: <b className="c-percent">{formatBp(b.pct)}</b> = {formatValue(b.pct, 'frac')} = {formatValue(b.pct, 'dec')}</div>
            <div>{t.simCut}: {formatValue(b.pct, 'dec')} × <b className="c-price">{formatRp(b.price)}</b> = <b className="c-discount">{formatRp(b.disc)}</b></div>
            <div>{t.simPay}: <b className="c-price">{formatRp(b.price)}</b> − <b className="c-discount">{formatRp(b.disc)}</b> = <b className="c-result">{formatRp(b.final)}</b></div>
          </div>
        </>
      )}
      <div className="actions">
        <button className="btn" onClick={onClose}>{t.close}</button>
        {!challenge && <button className="btn" onClick={() => setChallenge(true)}>{t.simChallenge}</button>}
        <button className="btn btn-primary" onClick={onAdd}>{t.simAdd}</button>
      </div>
    </Sheet>
  );
}

/** Struk digital setelah bayar. */
function DigitalReceipt({ r, buyer, at, onAgain }) {
  return (
    <div className="stack grow">
      <div className="receipt-paper pop-in" aria-label={t.simReceipt}>
        <div className="rp-head">
          <svg viewBox="0 0 100 130" width="54" height="70" aria-hidden="true">
            <Critter type="cat" role="cashier" shirt={PAL.lilac} x={50} y={128} wave />
          </svg>
          <div>
            <b className="svg-display">{shop.storeName.toUpperCase()}</b>
            <div className="small">{t.simReceipt}</div>
            <div className="small muted">{at}{buyer ? ` · ${buyer}` : ''}</div>
          </div>
        </div>
        <div className="rp-sep" />
        {r.lines.map((l) => (
          <div key={l.id} className="rp-item">
            <div className="line"><b>{l.name} ×{l.qty}</b><span>{formatRp(l.lineprice)}</span></div>
            <div className="line small"><span>  Diskon {formatBp(l.pct)}</span><span className="c-discount">−{formatRp(l.disc)}</span></div>
            <div className="line small"><span>  Dibayar</span><span className="c-result">{formatRp(l.final)}</span></div>
          </div>
        ))}
        <div className="rp-sep" />
        <div className="line"><span>{t.simTotalBefore}</span><b>{formatRp(r.totalPrice)}</b></div>
        <div className="line"><span>{t.simSaved}</span><b className="c-discount">−{formatRp(r.totalDisc)}</b></div>
        <div className="line rp-total"><span>{t.simTotal}</span><b className="c-result">{formatRp(r.total)}</b></div>
        <div className="rp-saved">
          <svg viewBox="0 0 40 40" width="34" height="34" aria-hidden="true"><Star x={20} y={20} r={16} /></svg>
          <span>{t.simYouSaved(formatRp(r.totalDisc))}</span>
        </div>
        <div className="rp-thanks">{t.simThanks}</div>
      </div>
      <div className="actions">
        <button className="btn btn-primary" onClick={onAgain}>{t.simAgain}</button>
      </div>
    </div>
  );
}

export function ShopSim({ profile, onComplete = () => {} }) {
  const [cat, setCat] = useState('semua');
  const [cart, setCart] = useState([]);
  const [open, setOpen] = useState(null);
  const [paid, setPaid] = useState(null);
  const r = receipt(cart);
  const products = shop.products.filter((p) => cat === 'semua' || p.category === cat);

  const pay = () => {
    const at = new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
    setPaid({ r, at });
    play('success');
    logEvent('scene_interact', { moduleId: 'SIM', payload: { scene: 'pay', items: r.count, total: r.total, saved: r.totalDisc } });
    onComplete({ items: r.count, total: r.total, saved: r.totalDisc });
    window.scrollTo?.(0, 0);
  };

  if (paid) {
    return (
      <div className="screen">
        <Header title={t.simReceipt} />
        <DigitalReceipt r={paid.r} at={paid.at} buyer={profile?.name?.split(' ')[0]} onAgain={() => { setCart([]); setPaid(null); }} />
      </div>
    );
  }

  return (
    <div className="screen">
      <Header title={t.simTitle} />
      <div className="stack grow">
        <StoreFront name={shop.storeName} />
        <KikoSays mood="think" size={64}>{t.simIntro}</KikoSays>
        <div className="chips-scroll" role="tablist" aria-label={t.simCategory}>
          {[{ id: 'semua', name: t.simAll }, ...shop.categories].map((c) => (
            <button key={c.id} role="tab" aria-selected={cat === c.id} className={`chip ${cat === c.id ? 'on' : ''}`} onClick={() => setCat(c.id)}>
              {c.name}
            </button>
          ))}
        </div>
        <div className="shelf" key={cat}>
          {products.map((p, i) => {
            const b = priceBreakdown(p);
            return (
              <button
                key={p.id}
                className="product item-in"
                style={{ animationDelay: `${i * 0.05}s` }}
                onClick={() => setOpen(p)}
                aria-label={`${p.name}, ${formatRp(p.price)}, diskon ${formatBp(p.pct)}`}
              >
                <span className="product-tag">-{formatBp(p.pct)}</span>
                <ProductIcon kind={p.kind} />
                <b>{p.name}</b>
                <span className="product-old">{formatRp(b.price)}</span>
                <span className="product-cut">−{formatRp(b.disc)}</span>
                <span className="product-final">{formatRp(b.final)}</span>
              </button>
            );
          })}
        </div>

        <div className="card receipt cart" aria-label={t.simCart}>
          <div className="row"><b className="grow">🛒 {t.simCart}</b>{r.count > 0 && <span>{t.simItems(r.count)}</span>}</div>
          {cart.length === 0 ? (
            <div className="muted small">{t.simEmpty}</div>
          ) : (
            <>
              {r.lines.map((l) => (
                <div key={l.id} className="cart-line">
                  <div className="grow">
                    <div><b>{l.name}</b> ×{l.qty}</div>
                    <div className="small"><s className="muted">{formatRp(l.lineprice)}</s> → <b className="c-result">{formatRp(l.final)}</b></div>
                  </div>
                  <button className="icon-btn del" onClick={() => setCart(removeFromCart(cart, l.id))} aria-label={`${t.simRemove} ${l.name}`}>✕</button>
                </div>
              ))}
              <hr />
              <div className="line"><span>{t.simTotalBefore}</span><b className="n c-price">{formatRp(r.totalPrice)}</b></div>
              <div className="line"><span>{t.simSaved}</span><b className="n c-discount">−{formatRp(r.totalDisc)}</b></div>
              <div className="line"><span>{t.simTotal}</span><b className="n c-result">{formatRp(r.total)}</b></div>
            </>
          )}
        </div>
      </div>
      {cart.length > 0 && (
        <div className="actions">
          <button className="btn" onClick={() => setCart([])}>{t.simReset}</button>
          <button className="btn btn-primary" onClick={pay}>{t.simPayBtn}</button>
        </div>
      )}
      {open && (
        <ProductSheet
          product={open}
          onClose={() => setOpen(null)}
          onAdd={() => {
            setCart(addToCart(cart, open));
            play('coin');
            setOpen(null);
          }}
        />
      )}
    </div>
  );
}
