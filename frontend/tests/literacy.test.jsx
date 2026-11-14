// @vitest-environment jsdom
// Tes Literasi Matematis: paritas penilaian Python ↔ JavaScript, skor 24, skor parsial, dan alur layar.
import 'fake-indexeddb/auto';
import { configure, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import literacy from '../../shared/content/literacy.json';
import material from '../../shared/content/material.json';
import vectors from '../../shared/test-vectors.json';
import { Discussion, LiteracyResult, LiteracyRunner } from '../src/features/Literacy.jsx';
import { answerKey, leaksAnswer, materialVars, rubricOf, scoreItem, scoreTest, stepFeedback } from '../src/domain/literacy.js';
import { fillText } from '../src/domain/text.js';

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = () => null;
  window.scrollTo = () => {};
});
afterEach(cleanup);
// Layar kini merender SVG arcade & maskot yang lebih kaya → beri waktu tunggu lebih lama di jsdom.
configure({ asyncUtilTimeout: 5000 });

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
    let expected = 0;
    for (const it of literacy.test) {
      for (const st of it.steps) {
        // sebelum menjawab: Periksa nonaktif, Bantuan tersedia, Soal Berikutnya belum muncul
        expect(btn('Periksa Jawaban').disabled).toBe(true);
        expect(btn('Bantuan')).toBeTruthy();
        expect(screen.queryByRole('button', { name: /Soal Berikutnya|Lihat Hasil/ })).toBeNull();
        answerStep(container, st, FULL[it.id][st.id]);
        click(btn('Periksa Jawaban'));
        expected += st.points;
        expect(screen.getByText('HEBAT! JAWABAN KAMU BENAR!')).toBeTruthy();
        expect(document.querySelector('.score-chip').textContent).toBe(`⭐ ${expected}/24`);
        // sudah dikunci: tombol periksa hilang → tidak bisa menambah skor dua kali
        expect(screen.queryByRole('button', { name: 'Periksa Jawaban' })).toBeNull();
        click(screen.getByRole('button', { name: /Soal Berikutnya|Lihat Hasil/ }));
      }
    }
    expect(onFinish).toHaveBeenCalledTimes(1);
    const { answers } = onFinish.mock.calls[0][0];
    expect(scoreTest(literacy.test, answers).total).toBe(24);

    cleanup();
    render(<LiteracyResult mode="test" items={literacy.test} answers={answers} onBack={() => {}} />);
    expect(document.querySelector('.score b').textContent).toBe('24');
    expect(document.querySelector('.finish-cat').textContent).toMatch(/Sangat baik/);
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
    expect(screen.queryByText('Mau petunjuk?')).toBeNull(); // tawaran otomatis belum setelah 1× salah
    expect(screen.getByRole('status').textContent).toMatch(/Cara memperbaiki:/);
    click(btn('Periksa'));
    expect(screen.getByText('Mau petunjuk?')).toBeTruthy(); // ditawarkan setelah 2× salah (P9)
    click(btn('Bantuan'));
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
        click(btn('Periksa Jawaban'));
        click(screen.getByRole('button', { name: /Soal Berikutnya|Lihat Hasil/ }));
      }
    }
    expect(await screen.findByText('Hasil Tes Literasi')).toBeTruthy();
    expect(screen.getByText('TES SELESAI!')).toBeTruthy();
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

describe('tes interaktif: bantuan, benar/salah, pembahasan, skor tidak ganda, hasil', () => {
  const L1 = literacy.test[0];
  const start = () => {
    const onFinish = vi.fn();
    const utils = render(<LiteracyRunner mode="test" items={literacy.test} onFinish={onFinish} onExit={() => {}} />);
    click(btn('Mulai tes'));
    return { ...utils, onFinish };
  };

  it('bantuan bisa dibuka & ditutup, isinya sesuai soal, tidak menilai & tidak membocorkan jawaban', () => {
    start();
    expect(document.querySelector('.score-chip').textContent).toBe('⭐ 0/24');
    click(btn('Bantuan'));
    const box = screen.getByRole('note', { name: 'Petunjuk dari Plum' });
    expect(box.textContent).toContain(L1.steps[0].hints[0]);
    expect(document.querySelector('.plum-guide .bubble').textContent).toMatch(/petunjukku/);
    expect(screen.queryByRole('status')).toBeNull(); // belum dinilai
    expect(document.querySelector('.score-chip').textContent).toBe('⭐ 0/24');
    click(btn('Tutup bantuan'));
    expect(screen.queryByRole('note', { name: 'Petunjuk dari Plum' })).toBeNull();
    // petunjuk setiap tahap tes tidak memuat angka jawaban
    for (const it of literacy.test) {
      const key = answerKey(it);
      for (const st of it.steps) {
        expect(st.hints?.length).toBeGreaterThan(0);
        if (st.input === 'rupiah') expect(leaksAnswer(st.hints.join(' '), key[st.id])).toBe(false);
      }
    }
  });

  it('jawaban salah: pesan, jawaban benar, penjelasan, skor tetap; Plum berpikir', () => {
    const { container } = start();
    answerStep(container, L1.steps[0], 1); // salah
    click(btn('Periksa Jawaban'));
    expect(screen.getByText('BELUM TEPAT, YUK COBA PAHAMI LAGI!')).toBeTruthy();
    const banner = screen.getByRole('status');
    expect(banner.textContent).toMatch(/Jawaban yang benar: Harga akhir sepatu di setiap toko/);
    expect(banner.textContent).toMatch(/Persen besar belum tentu paling murah/); // umpan balik miskonsepsi
    expect(banner.textContent).toMatch(/Penjelasan:/);
    expect(document.querySelector('.score-chip').textContent).toBe('⭐ 0/24');
    expect(document.querySelector('.option.key')).toBeTruthy(); // opsi benar ditandai
    expect(document.querySelector('.plum-guide .mascot').className.baseVal).toMatch(/shake/);
    // opsi terkunci: memilih lagi tidak mengubah apa pun
    const radios = within(container.querySelector('.options')).getAllByRole('radio');
    expect(radios.every((r) => r.disabled)).toBe(true);
  });

  it('jawaban angka benar → +poin, pembahasan lengkap sesuai angka soal', () => {
    const { container } = start();
    answerStep(container, L1.steps[0], 0);
    click(btn('Periksa Jawaban'));
    click(btn('Soal Berikutnya'));
    expect(document.querySelector('.bar[role="progressbar"]').getAttribute('aria-valuenow')).toBe('1');
    answerStep(container, L1.steps[1], 200000);
    click(btn('Periksa Jawaban'));
    expect(screen.getByText('+1 poin')).toBeTruthy();
    expect(document.querySelector('.score-chip').textContent).toBe('⭐ 2/24');
    click(btn('Pembahasan'));
    const d = screen.getByLabelText('Pembahasan');
    const txt = d.textContent.replace(/\s+/g, ' ');
    for (const part of ['Diketahui:', 'Ditanyakan:', 'Rumus:', 'Penyelesaian:', 'Hasil akhir:', 'Kesimpulan:']) expect(txt).toContain(part);
    expect(txt).toMatch(/0,2 × Rp250\.000 = Rp50\.000/);
    expect(txt).toMatch(/Rp250\.000 − Rp50\.000 = Rp200\.000/);
    expect(txt).toMatch(/0,15 × Rp230\.000 = Rp34\.500/);
    expect(txt).toMatch(/Toko B/);
    expect(document.querySelector('.plum-guide .bubble').textContent).toMatch(/pembahasan/);
  });

  it('pembahasan tiap soal berbeda & cocok dengan kuncinya', () => {
    const texts = literacy.test.map((it) => {
      render(<Discussion item={it} />);
      const t = document.body.textContent;
      cleanup();
      return t;
    });
    expect(new Set(texts).size).toBe(4);
    expect(texts[1]).toMatch(/Rp170\.000/); // spidol
    expect(texts[1]).toMatch(/Rp10\.000/);
    expect(texts[2]).toMatch(/Rp80\.000/); // jaket
    expect(texts[2]).toMatch(/Rp240\.000/);
    expect(texts[3]).toMatch(/Rp120\.000/); // kasir
    expect(texts[3]).toMatch(/Rp280\.000/);
  });

  it('halaman hasil: TES SELESAI!, nama, jumlah benar/salah, skor, persentase, kategori, pembahasan', () => {
    const answers = { L1: { ...FULL.L1, s2a: 50000 }, L4: { ...FULL.L4, s4: 30, s5: 399970 } };
    render(<LiteracyResult mode="test" items={literacy.test} answers={answers} studentName="Sri Nur" onBack={() => {}} onRetry={() => {}} />);
    expect(screen.getByText('TES SELESAI!')).toBeTruthy();
    const grid = document.querySelector('.finish-grid').textContent;
    expect(grid).toMatch(/Nama siswaSri Nur/);
    expect(grid).toMatch(/Dikerjakan2 soal · 12 tahap/);
    expect(grid).toMatch(/Tahap benar9/);
    expect(grid).toMatch(/Tahap salah3/);
    expect(grid).toMatch(/Total skor9 \/ 24/);
    expect(grid).toMatch(/Persentase38%/);
    expect(document.querySelector('.finish-cat').textContent).toMatch(/Perlu berlatih lagi/);
    expect(document.querySelector('.finish-card .bubble').textContent).toMatch(/Tetap semangat, Sri!/);
    click(btn('Lihat Pembahasan'));
    expect(document.querySelectorAll('details.review[open]')).toHaveLength(4);
    expect(document.querySelectorAll('.disc-in-review')).toHaveLength(4);
    expect(btn('Ulangi tes')).toBeTruthy();
  });
});

describe('v0.6 — latihan literasi: bantuan, progres, apresiasi, pembahasan', () => {
  it('bantuan sejak awal; progres & skor percobaan pertama; pembahasan setelah benar', () => {
    const item = literacy.practice.find((i) => i.id === 'P1');
    const { container } = render(<LiteracyRunner mode="practice" items={[item]} onFinish={() => {}} onExit={() => {}} />);
    expect(btn('Bantuan')).toBeTruthy();
    expect(document.querySelector('.practice-status').textContent).toMatch(/0 dari 6 tahap selesai/);
    expect(answerKey(item).s1).toBe(1);
    answerStep(container, item.steps[0], 0); // salah
    click(btn('Periksa'));
    answerStep(container, item.steps[0], 0); // salah lagi
    click(btn('Periksa'));
    expect(screen.queryByRole('button', { name: 'Pembahasan' })).toBeNull();
    answerStep(container, item.steps[0], 1); // benar
    click(btn('Periksa'));
    expect(document.querySelector('.practice-status .score-chip').textContent).toBe('⭐ 0/6'); // percobaan pertama salah
    expect(document.querySelector('.practice-status').textContent).toMatch(/1 dari 6 tahap selesai/);
    expect(screen.getByRole('status').textContent).toMatch(/Bandingkan harga yang dibayar|Tepat|Hebat|Mantap|Keren|Luar biasa/);
    click(btn('Pembahasan'));
    const d = screen.getByLabelText('Pembahasan').textContent.replace(/\s+/g, ' ');
    expect(d).toMatch(/Rp180\.000 − Rp45\.000 = Rp135\.000/);
    expect(d).toMatch(/Rp160\.000 − Rp16\.000 = Rp144\.000/);
    expect(d).toMatch(/Toko Ceria/);
  });
});
