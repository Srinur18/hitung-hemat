// @vitest-environment jsdom
// Render jawaban Plum: rumus LaTeX (KaTeX) + Markdown ringan.
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import ChatMessageBody, { normalizeTex, splitMath, texToHtml } from '../src/ui/ChatMessage.jsx';

vi.mock('../src/data/chat.js', () => ({
  sendChatMessage: vi.fn(async () => ({
    reply:
      'Rumusnya begini:\n\n$$\\text{Persentase Untung} = \\left( \\frac{\\text{Besar Untung}}{\\text{Harga Beli (Modal)}} \\right) \\times 100\\\\%$$\n\nJadi **untung** dibagi modal.',
    source: 'gemini',
  })),
}));

afterEach(cleanup);
// jsdom tidak punya scrollIntoView (dipakai ChatPage untuk gulir otomatis ke pesan terbaru).
beforeAll(() => {
  Element.prototype.scrollIntoView = () => {};
});
// KaTeX memakai spasi tak-putus (U+00A0) di 	ext{…}.
const txt = (n) => n.textContent.replace(/ /g, ' ');

const mount = (content) => render(<ChatMessageBody content={content} />).container;
const noRawLatex = (el) => {
  // Teks yang terlihat (tanpa MathML tersembunyi) tidak boleh memuat sintaks LaTeX mentah.
  const visible = [...el.querySelectorAll('.katex-html')].map((n) => n.textContent).join(' ');
  expect(visible).not.toMatch(/\\frac|\\text|\$\$|\\\(|\\\)/);
};

describe('rumus blok $$…$$', () => {
  it('dirender sebagai rumus blok KaTeX, bukan teks mentah', () => {
    const el = mount('Rumus:\n$$a^2 + b^2 = c^2$$');
    const block = el.querySelector('.chat-math-wrap .katex-display');
    expect(block).not.toBeNull();
    expect(el.textContent).not.toContain('$$');
    expect(el.querySelector('.katex-html sup, .katex-html .msupsub')).not.toBeNull(); // pangkat
    noRawLatex(el);
  });

  it('\\[…\\] juga dianggap rumus blok', () => {
    const el = mount('\\[\\sqrt{16} = 4\\]');
    expect(el.querySelector('.katex-display')).not.toBeNull();
    expect(el.querySelector('.sqrt')).not.toBeNull(); // akar
  });

  it('contoh dari laporan: persentase untung dengan \\\\% tampil rapi', () => {
    const el = mount(
      '$$\\text{Persentase Untung} = \\left( \\frac{\\text{Besar Untung}}{\\text{Harga Beli (Modal)}} \\right) \\times 100\\\\%$$',
    );
    const html = el.querySelector('.katex-html');
    expect(html).not.toBeNull();
    expect(el.querySelector('.chat-math-raw')).toBeNull(); // tidak jatuh ke teks kode
    expect(txt(html)).toContain('Persentase Untung');
    expect(txt(html)).toContain('Harga Beli (Modal)');
    expect(html.textContent).toContain('%');
    expect(html.textContent).toContain('×');
    expect(el.querySelector('.mfrac')).not.toBeNull();
    noRawLatex(el);
  });
});

describe('rumus inline \\(…\\)', () => {
  it('dirender di dalam kalimat, teks sekitarnya tetap', () => {
    const el = mount('Diskon \\(25\\%\\) dari harga awal.');
    const p = el.querySelector('p');
    expect(p.querySelector('.chat-math-inline .katex')).not.toBeNull();
    expect(p.querySelector('.katex-display')).toBeNull();
    expect(p.textContent).toMatch(/^Diskon .*dari harga awal\.$/);
    noRawLatex(el);
  });

  it('$…$ tunggal juga inline, tetapi "$5 dan $10" bukan rumus', () => {
    expect(splitMath('nilai $x^2$ ya').filter((s) => s.type === 'math')).toHaveLength(1);
    expect(splitMath('harga $5 dan $10').every((s) => s.type === 'text')).toBe(true);
  });
});

describe('pecahan, operasi, dan persen', () => {
  it('\\frac menjadi pecahan bertumpuk', () => {
    const el = mount('$$\\frac{30.000}{120.000} = \\frac{1}{4}$$');
    expect(el.querySelectorAll('.mfrac').length).toBe(2);
  });

  it('perkalian, pembagian, dan simbol lain tampil sebagai simbol', () => {
    const el = mount('$$120.000 \\times 25\\% \\div 5 \\leq 6.000 \\neq 7$$');
    const t = el.querySelector('.katex-html').textContent;
    for (const sym of ['×', '÷', '≤', '%']) expect(t).toContain(sym);
    // ≠ digambar sebagai '=' bercoret; simbolnya ada di MathML (dibaca pembaca layar)
    expect(el.querySelector('.katex-mathml').textContent).toContain('≠');
  });

  it('persen tanpa escape tidak memotong sisa rumus (% = komentar di LaTeX)', () => {
    expect(normalizeTex('25% \\times 80.000')).toBe('25\\% \\times 80.000');
    const t = mount('$$25% \\times 80.000$$').querySelector('.katex-html').textContent;
    expect(t).toContain('%');
    expect(t).toContain('80.000');
  });

  it('backslash ganda dari Gemini dirapikan: \\\\% → \\%, \\\\frac → \\frac', () => {
    expect(normalizeTex('100\\\\%')).toBe('100\\%');
    expect(normalizeTex('\\\\frac{1}{2}')).toBe('\\frac{1}{2}');
    expect(normalizeTex('a \\\\ b')).toBe('a \\\\ b'); // baris baru LaTeX tetap
  });
});

describe('Markdown bercampur rumus', () => {
  it('tebal, daftar bernomor, bullet, paragraf, dan rumus tetap terbentuk', () => {
    const el = mount(
      [
        '### Cara menghitung',
        'Ini **penting** dan *mudah*.',
        '',
        '1. Cari besar diskon: \\(p\\% \\times \\text{harga awal}\\)',
        '2. Kurangkan dari harga awal',
        '',
        '- Harga awal = 100%',
        '- Ingat rumus berikut:',
        '',
        '$$\\text{Harga akhir} = \\text{Harga awal} - \\text{Besar diskon}$$',
        '',
        'Selesai!',
      ].join('\n'),
    );
    expect(el.querySelector('.chat-heading strong').textContent).toBe('Cara menghitung');
    expect(el.querySelector('strong').textContent).toBe('Cara menghitung');
    expect([...el.querySelectorAll('strong')].map((s) => s.textContent)).toContain('penting');
    expect(el.querySelector('em').textContent).toBe('mudah');
    const ol = el.querySelectorAll('ol li');
    expect(ol).toHaveLength(2);
    expect(ol[0].querySelector('.katex')).not.toBeNull();
    expect(el.querySelectorAll('ul li')).toHaveLength(2);
    expect(el.querySelector('.chat-math-wrap .katex-display')).not.toBeNull();
    expect([...el.querySelectorAll('p')].at(-1).textContent).toBe('Selesai!');
    noRawLatex(el);
  });

  it('"2 * 3 * 4" tidak berubah jadi miring', () => {
    const el = mount('Hitung 2 * 3 * 4 dulu.');
    expect(el.querySelector('em')).toBeNull();
    expect(el.textContent).toBe('Hitung 2 * 3 * 4 dulu.');
  });
});

describe('jawaban tanpa rumus', () => {
  it('teks biasa tampil apa adanya tanpa elemen KaTeX', () => {
    const el = mount('Halo! Diskon itu potongan harga.\n\nMau coba hitung bareng?');
    expect(el.querySelector('.katex')).toBeNull();
    const ps = el.querySelectorAll('p');
    expect(ps).toHaveLength(2);
    expect(ps[0].textContent).toBe('Halo! Diskon itu potongan harga.');
    expect(ps[1].textContent).toBe('Mau coba hitung bareng?');
  });

  it('harga Rupiah dan persen biasa tidak dianggap rumus', () => {
    const el = mount('Harga Rp120.000 diskon 25%, bayar Rp90.000.');
    expect(el.querySelector('.katex')).toBeNull();
    expect(el.textContent).toBe('Harga Rp120.000 diskon 25%, bayar Rp90.000.');
  });
});

describe('ketahanan', () => {
  it('LaTeX rusak ditampilkan sebagai teks kode, aplikasi tidak error', () => {
    expect(texToHtml('\\frac{1}{', true)).toBeNull();
    const el = mount('$$\\frac{1}{$$');
    expect(el.querySelector('.chat-math-raw').textContent).toBe('\\frac{1}{');
  });

  it('perintah berbahaya (\\href javascript) tidak menjadi tautan', () => {
    const el = mount('$$\\href{javascript:alert(1)}{klik}$$');
    expect(el.querySelector('a')).toBeNull();
  });
});

describe('halaman Teman Mikir', () => {
  it('jawaban Plum berumus dirender, pesan siswa terbaca, kolom ketik tetap ada', async () => {
    const { default: ChatPage } = await import('../src/features/ChatPage.jsx');
    const { container } = render(<ChatPage onBack={() => {}} />);
    const box = screen.getByPlaceholderText('Ketik pesanmu di sini...');
    fireEvent.change(box, { target: { value: 'Rumus persentase untung?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kirim' }));

    await waitFor(() => expect(container.querySelector('.chat-assistant .katex-display')).not.toBeNull());
    expect(container.querySelector('.chat-user .chat-bubble').textContent).toBe('Rumus persentase untung?');
    const plum = container.querySelector('.chat-assistant .chat-bubble');
    expect(plum.querySelector('.mfrac')).not.toBeNull();
    expect(plum.querySelector('strong').textContent).toBe('untung');
    expect(plum.querySelector('.chat-math-raw')).toBeNull();
    noRawLatex(plum);
    expect(screen.getByPlaceholderText('Ketik pesanmu di sini...')).toBeTruthy();
  });
});
