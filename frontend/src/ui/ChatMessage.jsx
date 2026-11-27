// Render pesan chat Teman Mikir: Markdown ringan (paragraf, **tebal**, *miring*, judul #, daftar - / 1.)
// + rumus LaTeX via KaTeX: blok $$…$$ atau \[…\], inline \(…\) atau $…$.
// KaTeX dibundel lokal (termasuk font) sehingga tetap jalan offline/di APK.
// Keamanan: KaTeX meng-escape teks masukan; trust=false menolak \href/\url/\includegraphics.
import katex from 'katex';
import 'katex/dist/katex.min.css';

const PH = (i) => `\u0000${i}\u0000`; // penanda posisi rumus di dalam teks
const PH_RE = /\u0000(\d+)\u0000/g;

/**
 * Rapikan LaTeX dari Gemini:
 * - `\\%`, `\\frac`, `\\text` (backslash ganda hasil escape JSON) → `\%`, `\frac`, `\text`.
 *   `\\` diikuti spasi/akhir tetap dianggap baris baru LaTeX.
 * - `%` tanpa escape → `\%` (di LaTeX, % memulai komentar dan memotong sisa rumus).
 */
export function normalizeTex(tex) {
  return String(tex)
    .replace(/\\\\(?=[A-Za-z%$&#_{}])/g, '\\')
    .replace(/(^|[^\\])%/g, '$1\\%')
    .trim();
}

/**
 * Pisahkan teks menjadi potongan teks biasa dan rumus.
 * @returns {Array<{type:'text', value:string} | {type:'math', value:string, display:boolean}>}
 */
export function splitMath(text) {
  const src = String(text ?? '');
  const out = [];
  // Urutan penting: $$ sebelum $, \[ dan \( sebelum teks.
  // $…$ hanya dianggap rumus bila tidak diawali/diakhiri spasi dan tidak diikuti angka (agar "$5 dan $10" aman).
  // Tanpa regex lookbehind: WebView Android lama (≥ 60) belum mendukungnya.
  const re = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$([^\s$](?:[^$\n]*?[^\s$])?)\$(?!\d)/g;
  let last = 0;
  let m;
  while ((m = re.exec(src))) {
    if (m.index > last) out.push({ type: 'text', value: src.slice(last, m.index) });
    const display = m[1] !== undefined || m[2] !== undefined;
    out.push({ type: 'math', value: m[1] ?? m[2] ?? m[3] ?? m[4], display });
    last = re.lastIndex;
  }
  if (last < src.length) out.push({ type: 'text', value: src.slice(last) });
  return out;
}

/** LaTeX → HTML KaTeX. Bila tetap gagal, kembalikan null (ditampilkan sebagai teks kode). */
export function texToHtml(tex, display) {
  try {
    return katex.renderToString(normalizeTex(tex), {
      displayMode: display,
      throwOnError: true,
      strict: 'ignore',
      trust: false,
      output: 'htmlAndMathml', // MathML tersembunyi untuk pembaca layar
      maxSize: 20,
      maxExpand: 200,
    });
  } catch {
    return null;
  }
}

function MathPiece({ tex, display }) {
  const html = texToHtml(tex, display);
  if (html === null) {
    return <code className="chat-math-raw">{tex}</code>;
  }
  return (
    <span
      className={display ? 'chat-math chat-math-block' : 'chat-math chat-math-inline'}
      // aman: keluaran KaTeX (masukan di-escape, trust=false)
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function renderEmphasis(text, keyBase) {
  // **tebal** dan *miring*. Tanpa lookbehind (WebView lama); "2 * 3 * 4" tidak dianggap miring
  // karena isi miring tidak boleh diawali/diakhiri spasi.
  const re = /\*\*([^*]+?)\*\*|(^|[^*\w])\*([^\s*](?:[^*\n]*?[^\s*])?)\*(?![*\w])/g;
  const nodes = [];
  let last = 0;
  let m;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m[1] !== undefined) {
      if (m.index > last) nodes.push(text.slice(last, m.index));
      nodes.push(<strong key={`${keyBase}-b${i++}`}>{m[1]}</strong>);
    } else {
      const start = m.index + m[2].length; // awalan (spasi/tanda baca) tetap teks biasa
      if (start > last) nodes.push(text.slice(last, start));
      nodes.push(<em key={`${keyBase}-i${i++}`}>{m[3]}</em>);
    }
    last = re.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/**
 * Teks satu baris/paragraf yang mungkin berisi penanda rumus.
 * **tebal** diproses lebih dulu di seluruh baris, sehingga "**diskon \(25\%\) dari Rp120.000**"
 * (tebal yang membungkus rumus) tetap menjadi tebal, bukan tanda ** mentah.
 */
function renderInline(text, math, keyBase = 'x') {
  const out = [];
  const re = /\*\*([^*]+?)\*\*/g;
  let last = 0;
  let k = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(...renderPieces(text.slice(last, m.index), math, `${keyBase}-t${k++}`));
    out.push(<strong key={`${keyBase}-s${k++}`}>{renderPieces(m[1], math, `${keyBase}-s${k}`)}</strong>);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(...renderPieces(text.slice(last), math, `${keyBase}-t${k++}`));
  return out;
}

/** Potongan teks (tanpa **tebal** lintas rumus): penanda rumus + *miring*. */
function renderPieces(text, math, keyBase) {
  const nodes = [];
  let last = 0;
  let k = 0;
  for (const m of text.matchAll(PH_RE)) {
    if (m.index > last) nodes.push(...renderEmphasis(text.slice(last, m.index), `${keyBase}-${k++}`));
    const piece = math[Number(m[1])];
    nodes.push(<MathPiece key={`${keyBase}-m${k++}`} tex={piece.value} display={piece.display} />);
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(...renderEmphasis(text.slice(last), `${keyBase}-${k++}`));
  return nodes;
}

/** Konten pesan → elemen React (paragraf, daftar, judul, rumus). */
export function renderMessage(content) {
  const math = [];
  const flat = splitMath(content)
    .map((s) => {
      if (s.type === 'text') return s.value;
      math.push(s);
      const ph = PH(math.length - 1);
      return s.display ? `\n${ph}\n` : ph; // rumus blok selalu berdiri di barisnya sendiri
    })
    .join('');

  const blocks = [];
  let paragraph = [];
  let listItems = [];
  let listType = null;
  let listStart = 1;
  let gap = false; // baris kosong di dalam daftar: daftar baru ditutup bila baris berikutnya bukan bagian daftar

  const flushParagraph = () => {
    if (paragraph.length) {
      const key = `p-${blocks.length}`;
      blocks.push(<p key={key}>{renderInline(paragraph.join(' '), math, key)}</p>);
      paragraph = [];
    }
  };
  const flushList = () => {
    if (listItems.length) {
      const Tag = listType === 'number' ? 'ol' : 'ul';
      const key = `list-${blocks.length}`;
      blocks.push(
        <Tag key={key} start={listType === 'number' && listStart !== 1 ? listStart : undefined}>
          {listItems.map((item, i) => (
            <li key={i}>{renderInline(item, math, `${key}-${i}`)}</li>
          ))}
        </Tag>,
      );
      listItems = [];
      listType = null;
      listStart = 1;
    }
    gap = false;
  };

  for (const line of flat.split(/\r?\n/)) {
    const numbered = line.match(/^\s*(\d+)[.)]\s+(.+)/);
    const bulleted = line.match(/^\s*[-*•]\s+(.+)/);
    const heading = line.match(/^\s*#{1,6}\s+(.+)/);
    const lone = line.trim().match(/^\u0000(\d+)\u0000$/);

    if (!line.trim()) {
      // Di dalam daftar bernomor, baris kosong belum menutup daftar: Gemini sering menulis
      // "1. langkah\n\n$$rumus$$\n\n2. langkah" — rumus itu milik langkah 1, nomor tetap berlanjut.
      if (listItems.length && listType === 'number') gap = true;
      else {
        flushParagraph();
        flushList();
      }
      continue;
    }

    if (lone && math[Number(lone[1])].display && listItems.length && listType === 'number') {
      listItems[listItems.length - 1] += ` ${line.trim()}`; // rumus blok di dalam butir daftar
      gap = false;
    } else if (lone && math[Number(lone[1])].display) {
      flushParagraph();
      flushList();
      const key = `m-${blocks.length}`;
      const piece = math[Number(lone[1])];
      blocks.push(
        <div key={key} className="chat-math-wrap">
          <MathPiece tex={piece.value} display />
        </div>,
      );
    } else if (heading) {
      flushParagraph();
      flushList();
      const key = `h-${blocks.length}`;
      blocks.push(
        <p key={key} className="chat-heading">
          <strong>{renderInline(heading[1].replace(/\*\*/g, ''), math, key)}</strong>
        </p>,
      );
    } else if (numbered || bulleted) {
      flushParagraph();
      const type = numbered ? 'number' : 'bullet';
      if (listType && listType !== type) flushList();
      if (!listItems.length && numbered) listStart = Number(numbered[1]) || 1;
      listType = type;
      listItems.push(numbered ? numbered[2] : bulleted[1]);
      gap = false;
    } else if (listItems.length && !gap && /^\s{2,}\S/.test(line)) {
      listItems[listItems.length - 1] += ` ${line.trim()}`; // baris lanjutan (menjorok) milik butir terakhir
    } else {
      flushList();
      paragraph.push(line.trim());
    }
  }
  flushParagraph();
  flushList();
  return <>{blocks}</>;
}

/** Gelembung pesan yang dipakai ChatPage untuk siswa maupun Plum. */
export default function ChatMessageBody({ content }) {
  return <div className="chat-bubble">{renderMessage(content)}</div>;
}
