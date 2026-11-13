// @vitest-environment jsdom
// Dunia toko v0.3: beranda, simulasi belanja, profil, tombol beranda, privasi nama.
import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import journey from '../../shared/content/journey.json';
import shop from '../../shared/content/shop.json';
import { db, saveProfile } from '../src/data/db.js';
import { materialVars } from '../src/domain/literacy.js';
import { formatRp } from '../src/domain/money.js';
import { checkoutChoices, receipt } from '../src/domain/shop.js';
import { ShopSim } from '../src/features/Home.jsx';

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = () => null;
  window.scrollTo = () => {};
});
afterEach(cleanup);

const click = (el) => fireEvent.click(el);

describe('domain simulasi belanja', () => {
  it('pilihan kasir: tepat satu benar + pengecoh miskonsepsi', () => {
    for (const p of shop.products) {
      const c = checkoutChoices(p, () => 0.3);
      expect(c.map((x) => x.kind).sort()).toEqual(['MC1', 'RP', 'correct']);
      expect(new Set(c.map((x) => x.value)).size).toBe(3);
      expect(c.every((x) => Number.isInteger(x.value))).toBe(true);
    }
    const kaos = shop.products.find((p) => p.id === 'kaos');
    const v = Object.fromEntries(checkoutChoices(kaos).map((x) => [x.kind, x.value]));
    expect(v).toEqual({ correct: 60000, MC1: 20000, RP: 79975 });
  });

  it('struk: total = jumlah harga akhir', () => {
    const r = receipt(shop.products.slice(0, 2)); // kaos 80.000 −25%, tas 150.000 −20%
    expect(r).toMatchObject({ totalPrice: 230000, totalDisc: 50000, total: 180000 });
  });

  it('angka perjalanan belajar selalu bulat', () => {
    for (const st of journey.stages) expect(Object.values(materialVars(st)).every(Number.isInteger)).toBe(true);
  });
});

describe('layar simulasi belanja', () => {
  it('salah → umpan balik; benar → masuk keranjang & struk', () => {
    render(<ShopSim />);
    click(screen.getByRole('button', { name: /^Kaos,/ }));
    const radios = () => within(screen.getByRole('radiogroup')).getAllByRole('radio');
    click(radios().find((r) => r.textContent === formatRp(20000)));
    expect(screen.getByText(/Itu besar diskonnya/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ke keranjang' }).disabled).toBe(true);
    click(radios().find((r) => r.textContent === formatRp(60000)));
    click(screen.getByRole('button', { name: 'Ke keranjang' }));
    const struk = screen.getByLabelText('Keranjang');
    expect(within(struk).getByText('KAOS')).toBeTruthy();
    expect(within(struk).getAllByText(formatRp(60000)).length).toBeGreaterThan(0);
  });
});

describe('beranda, profil, dan privasi', () => {
  it('menu Profil menampilkan identitas & nilai; tombol Beranda kembali ke beranda', async () => {
    const { default: App } = await import('../src/App.jsx');
    await saveProfile({
      studentCode: 'S07', name: 'Rani Putri', kelas: '7F', consentAt: 'x', pretestDone: true, preScore: 5,
      literacy: { attempts: 2, first: { total: 12, max: 24 }, last: { total: 20, max: 24 } },
    });
    render(<App />);
    expect(await screen.findByText('Halo, Rani!')).toBeTruthy();
    click(screen.getByRole('button', { name: /^Profil/ }));
    expect(await screen.findByText('Rani Putri')).toBeTruthy();
    expect(screen.getByText('20/24')).toBeTruthy();
    expect(screen.getByText('12/24')).toBeTruthy();
    expect(screen.getByText('5/8')).toBeTruthy();
    click(screen.getByRole('button', { name: 'Beranda' }));
    expect(await screen.findByText('Belajar Diskon, Belanja Jadi Pintar!')).toBeTruthy();

    // nama siswa tidak pernah masuk ke event penelitian (yang dikirim/diekspor)
    const events = await db.events.toArray();
    expect(events.length).toBeGreaterThan(0);
    expect(JSON.stringify(events)).not.toMatch(/Rani/);
  });
});
