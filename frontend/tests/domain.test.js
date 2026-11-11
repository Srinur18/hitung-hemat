// Uji domain + PARITAS dengan Python: angka JavaScript harus identik dengan shared/test-vectors.json
// (dibuat oleh: cd backend && py -m app.tools.gen_vectors).
import { describe, expect, it } from 'vitest';
import curriculum from '../../shared/content/curriculum.json';
import vectors from '../../shared/test-vectors.json';
import { FN } from '../src/domain/discount.js';
import { classify } from '../src/domain/misconceptions.js';
import { formatValue, parsePercent, parseRupiah } from '../src/domain/money.js';
import { buildProblem, instantiate } from '../src/domain/problems.js';
import { mulberry32 } from '../src/domain/rng.js';
import { isMastered, masteryLevel, onWrong, initialHintState, scaffoldFor } from '../src/domain/scaffold.js';
import { parseText } from '../src/domain/text.js';
import { segmentsFor } from '../src/three/segments.js';

describe('paritas Python ↔ JavaScript', () => {
  it('RNG mulberry32 identik', () => {
    const r = mulberry32(vectors.rng.seed);
    expect(vectors.rng.first5.map(() => r())).toEqual(vectors.rng.first5);
  });

  it.each(vectors.functions)('$fn($args) = $out', ({ fn, args, out }) => {
    expect(FN[fn](...args)).toBe(out);
  });

  it.each(vectors.formats)('format $value|$fmt = $out', ({ value, fmt, out }) => {
    expect(formatValue(value, fmt)).toBe(out);
  });

  it.each(vectors.problems)('soal $template seed=$seed identik', ({ template, seed, vars, answers }) => {
    const p = instantiate(curriculum.templates[template], seed);
    expect(p.vars).toEqual(vars);
    expect(p.answers).toEqual(answers);
  });
});

describe('domain', () => {
  it('parse input', () => {
    expect(parseRupiah('Rp120.000')).toBe(120000);
    expect(parsePercent('12,5')).toBe(1250);
    expect(parsePercent('')).toBeNull();
  });

  it('teks soal punya angka bertanda peran (signaling)', () => {
    const segs = parseText('Baju {price|price} diskon {pct|percent} [[rabat]]', { price: 120000, pct: 2500 });
    expect(segs.filter((s) => s.type === 'num').map((s) => [s.role, s.text])).toEqual([
      ['price', 'Rp120.000'],
      ['percent', '25%'],
    ]);
    expect(segs.at(-1)).toEqual({ type: 'term', id: 'rabat' });
  });

  it('buildProblem: opsi pilihan punya tepat satu jawaban benar', () => {
    for (const tid of ['m4-t1', 'm5-t1', 'm7-t1']) {
      for (let seed = 1; seed < 50; seed++) {
        const p = buildProblem(curriculum, tid, seed);
        for (const st of p.steps.filter((s) => s.input === 'choice')) {
          expect(st.options.filter((o) => o.isCorrect)).toHaveLength(1);
          expect(st.options[st.answer].isCorrect).toBe(true);
        }
      }
    }
  });

  it('soal transfer menambah kalimat pengecoh', () => {
    const p = buildProblem(curriculum, 'm3-t1', 5, { transfer: true });
    expect(p.text.length).toBeGreaterThan(curriculum.templates['m3-t1'].text.length);
  });
});

describe('miskonsepsi', () => {
  const v = { price: 120000, pct: 2500, disc: 30000, final: 90000 };
  it('MC1: menjawab besar diskon', () => expect(classify({ mc: ['MC1', 'MC5'] }, v, 30000)).toBe('MC1'));
  it('MC5: lebih mahal dari harga awal', () => expect(classify({ mc: ['MC1', 'MC5'] }, v, 150000)).toBe('MC5'));
  it('MC2: 50% + 20% dijumlah', () =>
    expect(classify({ mc: ['MC2'] }, { price: 200000, p1: 5000, p2: 2000 }, 60000)).toBe('MC2'));
  it('MC4: soal terbalik dikali', () => expect(classify({ mc: ['MC4'] }, { final: 90000, pct: 2500 }, 67500)).toBe('MC4'));
  it('MC6: dibagi harga akhir', () =>
    expect(classify({ mc: ['MC6'] }, { price: 100000, final: 80000 }, 2500)).toBe('MC6'));
  it('jawaban acak → tidak terklasifikasi', () => expect(classify({ mc: ['MC1'] }, v, 12345)).toBeNull());
});

describe('scaffolding & fading', () => {
  it('bantuan otomatis setelah 2 kali salah (DS02)', () => {
    let s = initialHintState();
    let r = onWrong(s);
    expect(r.offer).toBe(false);
    r = onWrong(r.state);
    expect(r.offer).toBe(true);
    expect(onWrong(r.state).offer).toBe(false); // hanya ditawarkan sekali
  });

  it('penanda warna memudar seiring penguasaan', () => {
    expect(scaffoldFor(0).signaling).toBe(true);
    expect(scaffoldFor(2).signaling).toBe(false);
    expect(scaffoldFor(0, { transfer: true }).markMode).toBe(true);
  });

  it('penguasaan modul', () => {
    const good = { stage: 'independent', correct: true, maxHint: 0 };
    const h = [good, good, good, { stage: 'independent', correct: false, maxHint: 3 }, { stage: 'transfer', correct: true, maxHint: 0 }];
    expect(masteryLevel(h)).toBe(2);
    expect(isMastered(h)).toBe(true);
    expect(isMastered(h.slice(0, 4))).toBe(false);
  });
});

describe('ilustrasi', () => {
  it('diskon bertingkat 50% + 20% menyisakan 40%', () => {
    const segs = segmentsFor('stacked', { p1: 5000, p2: 2000, step: 3 });
    const rest = segs.find((s) => s.key === 'rest');
    expect(rest.frac).toBeCloseTo(0.4);
    expect(segs.reduce((a, s) => a + s.frac, 0)).toBeCloseTo(1);
  });
});
