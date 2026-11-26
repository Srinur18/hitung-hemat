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

/** Teks satu baris/paragraf yang mungkin berisi penanda rumus. */
function renderInline(text, math, keyBase = 'x') {
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
        <Tag key={key}>
          {listItems.map((item, i) => (
            <li key={i}>{renderInline(item, math, `${key}-${i}`)}</li>
          ))}
        </Tag>,
      );
      listItems = [];
      listType = null;
    }
  };

  for (const line of flat.split(/\r?\n/)) {
    const numbered = line.match(/^\s*\d+[.)]\s+(.+)/);
    const bulleted = line.match(/^\s*[-*•]\s+(.+)/);
    const heading = line.match(/^\s*#{1,6}\s+(.+)/);
    const lone = line.trim().match(/^\u0000(\d+)\u0000$/);

    if (lone && math[Number(lone[1])].display) {
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
      listType = type;
      listItems.push((numbered || bulleted)[1]);
    } else if (!line.trim()) {
      flushParagraph();
      flushList();
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
