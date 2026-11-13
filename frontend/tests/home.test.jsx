// @vitest-environment jsdom
// Dunia toko v0.4: simulasi belanja (keranjang, struk), materi (bab, rumus, kamus), profil (lencana,
// aspirasi), suara, tombol beranda, dan privasi nama.
import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import glossary from '../../shared/content/glossary.json';
import journey from '../../shared/content/journey.json';
import material from '../../shared/content/material.json';
import shop from '../../shared/content/shop.json';
import { db, getProfile, saveProfile } from '../src/data/db.js';
import { materialVars } from '../src/domain/literacy.js';
import { formatRp } from '../src/domain/money.js';
import { activity, BADGES, earnedBadges, overallProgress, percentTable } from '../src/domain/progress.js';
import { addToCart, checkoutChoices, priceBreakdown, receipt, removeFromCart } from '../src/domain/shop.js';
import { FormulaSummary, Glossary, MaterialChapter } from '../src/features/Material.jsx';
import { ShopSim } from '../src/features/Shop.jsx';
import { getSettings, play, setSetting, unlock } from '../src/ui/audio.js';

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = () => null;
  window.scrollTo = () => {};
});
afterEach(cleanup);

const click = (el) => fireEvent.click(el);
const btn = (name) => screen.getByRole('button', { name });
const P = Object.fromEntries(shop.products.map((p) => [p.id, p]));

describe('domain simulasi belanja', () => {
  it('rincian tas sekolah sesuai contoh: Rp150.000 − Rp30.000 = Rp120.000', () => {
    expect(priceBreakdown(P.tas)).toEqual({ price: 150000, pct: 2000, disc: 30000, final: 120000 });
  });

  it('semua barang menghasilkan Rupiah bulat & harga akhir < harga awal', () => {
    for (const p of shop.products) {
      const b = priceBreakdown(p);
      expect(Number.isInteger(b.disc) && Number.isInteger(b.final)).toBe(true);
      expect(b.final).toBeLessThan(b.price);
      expect(b.disc + b.final).toBe(b.price);
    }
  });

  it('keranjang: tambah (jumlah bertambah), hapus, total diperbarui', () => {
    let cart = addToCart([], P.tas);
    cart = addToCart(cart, P.tas);
    cart = addToCart(cart, P.kaos);
    let r = receipt(cart);
    expect(r).toMatchObject({ count: 3, totalPrice: 380000, totalDisc: 80000, total: 300000 });
    cart = removeFromCart(cart, 'tas');
    r = receipt(cart);
    expect(r).toMatchObject({ count: 1, totalPrice: 80000, totalDisc: 20000, total: 60000 });
    expect(receipt([])).toMatchObject({ count: 0, total: 0 });
  });

  it('tantangan kasir: tepat satu benar + pengecoh miskonsepsi', () => {
    for (const p of shop.products) {
      const c = checkoutChoices(p, () => 0.3);
      expect(c.filter((x) => x.kind === 'correct')).toHaveLength(1);
      expect(c).toHaveLength(3);
      expect(new Set(c.map((x) => x.value)).size).toBe(3); // tidak ada pilihan kembar
    }
    // diskon 50%: besar diskon = harga akhir → pengecoh cadangan dipakai
    const pulpen = checkoutChoices(P.pulpen, () => 0.3).map((x) => x.kind).sort();
    expect(pulpen).toEqual(['MC5', 'RP', 'correct']);
    for (const p of shop.products.filter((x) => x.pct !== 5000)) {
      expect(checkoutChoices(p, () => 0.3).map((x) => x.kind).sort()).toEqual(['MC1', 'RP', 'correct']);
    }
  });
});

describe('domain materi & pencapaian', () => {
  it('tabel persen: desimal benar dan potongan dari harga', () => {
    expect(percentTable(100000, [1000, 2000, 2500, 5000]).map((r) => [r.dec, r.disc])).toEqual([
      ['0,1', 10000], ['0,2', 20000], ['0,25', 25000], ['0,5', 50000],
    ]);
  });

  it('angka contoh materi, rumus, & perjalanan selalu bulat', () => {
    const blocks = [...material.chapters.flatMap((c) => c.cards), ...material.formulas, ...journey.stages];
    for (const b of blocks) expect(Object.values(materialVars(b)).every(Number.isInteger)).toBe(true);
  });

  it('rumus 2 dan rumus 3 menghasilkan harga akhir yang sama', () => {
    const [, r2, r3] = material.formulas.map(materialVars);
    expect(r2.f).toBe(r3.f);
  });

  it('kamus memuat 9 istilah wajib, masing-masing dengan pengertian & contoh', () => {
    for (const k of ['diskon', 'rabat', 'persen', 'harga-awal', 'potongan-harga', 'harga-akhir', 'harga-setelah-diskon', 'penghematan', 'perbandingan-harga']) {
      expect(glossary[k].meaning && glossary[k].example).toBeTruthy();
    }
  });

  it('lencana & progres', () => {
    const meta = { chapters: 5, modules: ['M1', 'M2'] };
    expect(earnedBadges({}, {}, meta)).toEqual([]);
    expect(overallProgress({}, {}, meta)).toBe(0);
    const p = {
      journeyDone: true, simCount: 3, pretestDone: true, materialSeen: ['B1', 'B2', 'B3', 'B4', 'B5'],
      literacy: { attempts: 2, last: { total: 21 }, history: [{ total: 15 }, { total: 21 }] },
      literacyPractice: { P1: {}, P2: {}, P3: {}, P4: {} }, posttestDone: true,
    };
    const prog = { M1: { completed: true }, M2: { completed: true } };
    expect(earnedBadges(p, prog, meta)).toEqual(BADGES.map((b) => b.id));
    expect(overallProgress(p, prog, meta)).toBe(100);
    expect(activity(p, prog, meta)).toMatchObject({ materials: 5, sims: 3, literacyBest: 21, quizzes: 2 + 4 + 2 });
  });
});

describe('suara', () => {
  it('tanpa AudioContext (jsdom) tidak error; pengaturan tersimpan', () => {
    unlock();
    expect(() => play('correct')).not.toThrow();
    setSetting({ sfx: false });
    expect(getSettings().sfx).toBe(false);
    expect(JSON.parse(localStorage.getItem('hh-sound-v1')).sfx).toBe(false);
    setSetting({ sfx: true, music: false });
    expect(getSettings().music).toBe(false); // musik mati bawaan
  });
});

describe('layar simulasi belanja', () => {
  it('rincian otomatis → keranjang (tambah/hapus) → bayar → struk digital', () => {
    const onComplete = vi.fn();
    render(<ShopSim onComplete={onComplete} />);
    // kategori Tas
    click(screen.getByRole('tab', { name: 'Tas' }));
    expect(screen.queryByRole('button', { name: /^Kaos,/ })).toBeNull();
    click(screen.getByRole('button', { name: /^Tas Sekolah,/ }));
    // Harga Awal → Potongan Harga → Harga Akhir
    const flow = screen.getByLabelText('Harga awal, potongan harga, harga akhir');
    expect(flow.textContent).toMatch(/Rp150\.000.*−Rp30\.000.*Rp120\.000/);
    // Tantangan kasir (fitur lama) tetap ada
    click(btn('Tantangan Kasir'));
    const radios = () => within(screen.getByRole('radiogroup')).getAllByRole('radio');
    click(radios().find((r) => r.textContent === formatRp(30000)));
    expect(screen.getByText(/Itu besar diskonnya/)).toBeTruthy();
    click(radios().find((r) => r.textContent === formatRp(120000)));
    click(btn('Lihat rincian'));
    click(btn('Ke keranjang'));
    // tambah sekali lagi → jumlah 2
    click(screen.getByRole('button', { name: /^Tas Sekolah,/ }));
    click(btn('Ke keranjang'));
    click(screen.getByRole('tab', { name: 'Semua' }));
    click(screen.getByRole('button', { name: /^Kaos,/ }));
    click(btn('Ke keranjang'));
    const cart = () => screen.getByLabelText('Keranjang');
    expect(within(cart()).getByText('3 barang')).toBeTruthy();
    const totals = () => cart().textContent.replace(/\s+/g, ' ');
    expect(totals()).toMatch(/Total sebelum diskon ?Rp380\.000/);
    expect(totals()).toMatch(/Kamu hemat ?−Rp80\.000/);
    expect(totals()).toMatch(/Total bayar ?Rp300\.000/);
    // hapus kaos → total diperbarui otomatis
    click(btn('Hapus Kaos'));
    expect(totals()).toMatch(/Total bayar ?Rp240\.000/);
    expect(totals()).toMatch(/Kamu hemat ?−Rp60\.000/);
    // bayar → struk
    click(btn('Bayar'));
    const struk = screen.getByLabelText('Struk Belanja');
    expect(within(struk).getByText('Tas Sekolah ×2')).toBeTruthy();
    expect(within(struk).getByText(/Kamu hemat Rp60\.000/)).toBeTruthy();
    expect(onComplete).toHaveBeenCalledWith({ items: 2, total: 240000, saved: 60000 });
    click(btn('Belanja lagi'));
    expect(within(cart()).getByText('Keranjang masih kosong.')).toBeTruthy();
  });
});

describe('layar materi', () => {
  it('kartu bab: contoh bisa maju/mundur/ulang; navigasi kartu', () => {
    const onNav = vi.fn();
    const onSeen = vi.fn();
    render(<MaterialChapter index={2} card={0} onNav={onNav} onBack={() => {}} onSeen={onSeen} />);
    expect(screen.getByText('Besar diskon = persentase diskon × harga awal')).toBeTruthy();
    const next = btn('Langkah berikutnya');
    click(next);
    click(next);
    expect(document.querySelectorAll('.ex-steps li')).toHaveLength(2);
    expect(document.querySelector('.ex-steps').textContent).toMatch(/25% = 25\/100 = 0,25/); // persen → desimal
    click(btn('Langkah sebelumnya'));
    expect(document.querySelectorAll('.ex-steps li')).toHaveLength(1);
    click(btn('Ulang'));
    expect(document.querySelectorAll('.ex-steps li')).toHaveLength(0);
    click(btn('Berikutnya'));
    expect(onNav).toHaveBeenCalledWith(2, 1);
    expect(onSeen).not.toHaveBeenCalled();
  });

  it('kartu terakhir bab menandai bab sudah dipelajari; tabel persen tampil', () => {
    const onSeen = vi.fn();
    render(<MaterialChapter index={1} card={1} onNav={() => {}} onBack={() => {}} onSeen={onSeen} />);
    const table = screen.getByLabelText('Tabel arti persen diskon');
    expect(table.textContent).toMatch(/50%.*1\/2|50%.*50\/100/);
    expect(table.textContent).toMatch(/Rp25\.000/);
    cleanup();
    render(<MaterialChapter index={1} card={2} onNav={() => {}} onBack={() => {}} onSeen={onSeen} />);
    expect(onSeen).toHaveBeenCalledWith('B2');
  });

  it('rangkuman rumus: 3 rumus + simbol + contoh', () => {
    render(<FormulaSummary onBack={() => {}} />);
    expect(screen.getByText('Besar Diskon = Persentase Diskon × Harga Awal')).toBeTruthy();
    expect(screen.getByText('Harga Setelah Diskon = Harga Awal − Besar Diskon')).toBeTruthy();
    expect(screen.getByText('Harga Setelah Diskon = Harga Awal × (100% − Persentase Diskon)')).toBeTruthy();
    expect(document.body.textContent).toMatch(/0,15 × Rp200\.000 = Rp30\.000/);
    expect(document.body.textContent).toMatch(/Rp200\.000 × 0,85 = Rp170\.000/);
  });

  it('kamus istilah: dapat dicari dan dibuka', () => {
    render(<Glossary onBack={() => {}} />);
    expect(document.querySelectorAll('.glossary-item').length).toBe(Object.keys(glossary).length);
    fireEvent.change(screen.getByLabelText('Cari istilah…'), { target: { value: 'hemat' } });
    expect(document.querySelectorAll('.glossary-item')).toHaveLength(1);
    expect(screen.getByText('Penghematan')).toBeTruthy();
  });
});

describe('beranda, profil, dan privasi', () => {
  it('Profil: identitas, nilai, lencana, aspirasi tersimpan; tombol Beranda; nama tidak bocor', async () => {
    const { default: App } = await import('../src/App.jsx');
    await saveProfile({
      studentCode: 'S07', name: 'Rani Putri', kelas: '7F', consentAt: 'x', pretestDone: true, preScore: 5,
      simCount: 1, journeyDone: true,
      literacy: { attempts: 2, first: { total: 12, max: 24 }, last: { total: 20, max: 24 }, history: [{ total: 12, max: 24, at: '2026-11-13' }, { total: 20, max: 24, at: '2026-11-14' }] },
    });
    render(<App />);
    expect(await screen.findByText('Halo, Rani!')).toBeTruthy();
    click(screen.getByRole('button', { name: /^Profil/ }));
    expect(await screen.findByText('Rani Putri')).toBeTruthy();
    expect(screen.getAllByText('12/24').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('20/24').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('5/8')).toBeTruthy();
    expect(screen.getByText('Penjelajah Ruko').closest('.badge').className).toMatch(/got/);
    expect(screen.getByText('Ahli Literasi').closest('.badge').className).toMatch(/got/);
    expect(screen.getByText('Raja Hemat').closest('.badge').className).toMatch(/locked/);
    // aspirasi tersimpan permanen
    fireEvent.change(screen.getByPlaceholderText('contoh: Skor Tes Literasi minimal 20'), { target: { value: 'Skor 24!' } });
    click(screen.getByRole('button', { name: 'Simpan' }));
    await waitFor(async () => expect((await getProfile()).aspiration?.target).toBe('Skor 24!'));
    click(screen.getByRole('button', { name: 'Beranda' }));
    expect(await screen.findByText('Belajar Diskon, Belanja Jadi Pintar!')).toBeTruthy();

    const events = await db.events.toArray();
    expect(events.length).toBeGreaterThan(0);
    expect(JSON.stringify(events)).not.toMatch(/Rani|Skor 24/);
  });
});
