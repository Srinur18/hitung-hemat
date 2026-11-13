// @vitest-environment jsdom
// Tes Literasi Matematis: paritas penilaian Python ↔ JavaScript, skor 24, skor parsial, dan alur layar.
import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import literacy from '../../shared/content/literacy.json';
import material from '../../shared/content/material.json';
import vectors from '../../shared/test-vectors.json';
import { LiteracyResult, LiteracyRunner } from '../src/features/Literacy.jsx';
import { answerKey, leaksAnswer, materialVars, rubricOf, scoreItem, scoreTest, stepFeedback } from '../src/domain/literacy.js';
import { fillText } from '../src/domain/text.js';

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = () => null;
  window.scrollTo = () => {};
});
afterEach(cleanup);

const click = (el) => fireEvent.click(el);
const btn = (name) => screen.getByRole('button', { name });
const byId = Object.fromEntries(literacy.test.map((it) => [it.id, it]));
const FULL = Object.fromEntries(literacy.test.map((it) => [it.id, answerKey(it)]));

describe('paritas penilaian Python ↔ JavaScript', () => {
  it.each(vectors.literacy)('$set / $scenario', ({ set, answers, result }) => {
    expect(scoreTest(literacy[set], answers)).toEqual(result);
  });
});

describe('sistem penilaian', () => {
  it('empat indikator terwakili, satu soal masing-masing', () => {
    expect(literacy.test.map((i) => i.process)).toEqual(['reason', 'formulate', 'employ', 'interpret']);
  });

  it('poin per tahap sesuai pedoman', () => {
    expect(literacy.test.map(rubricOf)).toEqual([[1, 2, 1, 1, 1], [1, 1, 1, 1, 1, 1], [1, 2, 2, 1], [1, 1, 1, 1, 1, 1]]);
  });

  it('jawaban benar semua = 24, kosong = 0', () => {
    expect(scoreTest(literacy.test, FULL)).toMatchObject({ total: 24, max: 24 });
    expect(scoreTest(literacy.test, {}).total).toBe(0);
  });

  it('rumus diskon benar (kunci = kisi-kisi)', () => {
    expect(FULL.L1).toMatchObject({ s2a: 200000, s2b: 195500, s4: 1 });
    expect(FULL.L2).toMatchObject({ s2: 200000, s4: 30000, s5: 170000 });
    expect(FULL.L3).toMatchObject({ s2b: 80000, s3b: 240000 });
    expect(FULL.L4).toMatchObject({ s4: 120000, s5: 280000 });
  });

  it('skor parsial: tahap awal benar tetap dinilai', () => {
    const r = scoreItem(byId.L3, { ...FULL.L3, s3b: 1, s4: 0 });
    expect(r.earned).toBe(4);
  });

  it('error carried forward: langkah konsisten tetap dapat poin', () => {
    const r = scoreItem(byId.L2, { ...FULL.L2, s2: 40000, s4: 6000, s5: 34000 });
    expect(r.steps.map((s) => s.via)).toEqual(['key', null, 'key', 'ecf', 'ecf', 'key']);
  });

  it('umpan balik spesifik dan tidak membocorkan kunci', () => {
    const f = stepFeedback(byId.L1, 's2a', 50000, {});
    expect(f).toMatchObject({ correct: false, code: 'trap' });
    expect(f.text).toMatch(/besar diskon/);
    expect(stepFeedback(byId.L4, 's1', 2, {}).text).toMatch(/30 per 100/);
    for (const set of ['test', 'practice']) {
      for (const it of literacy[set]) {
        const key = answerKey(it);
        for (const st of it.steps.filter((s) => s.input === 'rupiah')) {
          for (const txt of [st.fb, ...(st.hints ?? []), ...(st.traps ?? []).map((x) => x.fb)]) {
            expect(leaksAnswer(txt ?? '', key[st.id])).toBe(false);
          }
        }
      }
    }
  });

  it('angka contoh materi selalu bulat', () => {
    for (const card of material.chapters.flatMap((c) => c.cards)) {
      const v = materialVars(card);
      expect(Object.values(v).every(Number.isInteger)).toBe(true);
      const texts = [card.body, ...(card.points ?? []), ...(card.example ? [card.example.text, ...card.example.steps] : [])];
      for (const s of texts) expect(fillText(s, v)).not.toMatch(/\{|(^|\s)\?/); // placeholder kosong tampil sebagai "?"
    }
  });
});

/** Menjawab satu tahap di layar: pilihan atau angka. */
function answerStep(container, st, value) {
  if (st.input === 'choice') {
    click(within(container.querySelector('.options')).getAllByRole('radio')[value]);
  } else {
    const keys = [...container.querySelectorAll('.numpad button')];
    for (const d of String(value)) click(keys.find((b) => b.textContent === d));
  }
}

describe('layar tes literasi', () => {
  it('benar semua → hasil 24/24 dengan skor per indikator', () => {
    const onFinish = vi.fn();
    const { container } = render(<LiteracyRunner mode="test" items={literacy.test} onFinish={onFinish} onExit={() => {}} />);
    click(btn('Mulai tes'));
    for (const it of literacy.test) {
      for (const st of it.steps) {
        expect(screen.queryByRole('button', { name: 'Petunjuk' })).toBeNull(); // tanpa petunjuk saat tes
        expect(btn('Lanjut').disabled).toBe(true);
        answerStep(container, st, FULL[it.id][st.id]);
        click(btn('Lanjut'));
      }
    }
    expect(onFinish).toHaveBeenCalledTimes(1);
    const { answers } = onFinish.mock.calls[0][0];
    expect(scoreTest(literacy.test, answers).total).toBe(24);

    cleanup();
    render(<LiteracyResult mode="test" items={literacy.test} answers={answers} onBack={() => {}} />);
    expect(document.querySelector('.score b').textContent).toBe('24');
    expect(screen.getByText('Sangat baik')).toBeTruthy();
    expect(screen.getAllByText('6/6')).toHaveLength(8); // 4 indikator + 4 soal
  });

  it('jawaban salah → skor parsial + umpan balik miskonsepsi di hasil', () => {
    // L1: Toko A salah (Rp50.000) → 5; L4: ikut cara kasir → 4; L2 & L3 kosong → 0
    const answers = { L1: { ...FULL.L1, s2a: 50000 }, L4: { ...FULL.L4, s4: 30, s5: 399970 } };
    render(<LiteracyResult mode="test" items={literacy.test} answers={answers} onBack={() => {}} />);
    expect(document.querySelector('.score b').textContent).toBe('9');
    expect(screen.getAllByText('5/6')).toHaveLength(2); // indikator + soal
    expect(screen.getByText(/Itu cara kasir/)).toBeTruthy();
    expect(screen.getByText(/Itu hasil kasir yang keliru/)).toBeTruthy();
    expect(screen.getAllByText('Jawabanmu:', { exact: false }).length).toBeGreaterThan(0);
  });
});

describe('layar latihan literasi', () => {
  it('salah 2× → petunjuk ditawarkan; benar → lanjut', () => {
    const item = literacy.practice.find((i) => i.id === 'P3');
    const onFinish = vi.fn();
    const { container } = render(<LiteracyRunner mode="practice" items={[item]} onFinish={onFinish} onExit={() => {}} />);
    answerStep(container, item.steps[0], 1);
    click(btn('Periksa'));
    expect(screen.getByRole('status').textContent).toMatch(/persen/);
    expect(screen.queryByRole('button', { name: 'Petunjuk' })).toBeNull(); // belum setelah 1× salah
    click(btn('Periksa'));
    click(btn('Petunjuk'));
    expect(screen.getByText('Petunjuk 1')).toBeTruthy();
    click(btn('Coba lagi'));
    answerStep(container, item.steps[0], 0);
    click(btn('Periksa'));
    click(btn('Lanjut'));
    const key = answerKey(item);
    for (const st of item.steps.slice(1)) {
      answerStep(container, st, key[st.id]);
      click(btn('Periksa'));
      click(btn('Lanjut'));
    }
    expect(onFinish).toHaveBeenCalledTimes(1);
    // skor percobaan pertama: tahap 1 salah → 5/6
    expect(scoreTest([item], onFinish.mock.calls[0][0].answers).total).toBe(5);
  });
});

// Uji layar materi dipindah ke tests/home.test.jsx (struktur bab v0.4).

describe('alur aplikasi: tab Tes → Tes Literasi → hasil tersimpan', () => {
  it('skor 24/24 tersimpan di profil dan bisa dilihat lagi', async () => {
    const { saveProfile, getProfile } = await import('../src/data/db.js');
    const { default: App } = await import('../src/App.jsx');
    await saveProfile({ studentCode: 'S09', consentAt: 'x', pretestDone: true, diagnosticDone: true });
    const { container } = render(<App />);
    click(await screen.findByRole('button', { name: /Kuis \/ Tes/ }));
    click(await screen.findByRole('button', { name: 'Mulai tes' }));
    click(btn('Mulai tes')); // layar aturan tes
    for (const it of literacy.test) {
      for (const st of it.steps) {
        answerStep(container, st, FULL[it.id][st.id]);
        click(btn('Lanjut'));
      }
    }
    expect(await screen.findByText('Hasil Tes Literasi')).toBeTruthy();
    expect(document.querySelector('.score b').textContent).toBe('24');
    const p = await getProfile();
    expect(p.literacy).toMatchObject({ attempts: 1, last: { total: 24, max: 24 } });
    click(btn('Kembali ke peta'));
    click(await screen.findByRole('tab', { name: 'Tes' }));
    expect(screen.getByText('Skor terakhir: 24/24')).toBeTruthy();
    click(btn('Lihat hasil terakhir'));
    expect(await screen.findByText('Hasil Tes Literasi')).toBeTruthy();
  });
});
