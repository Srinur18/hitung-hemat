// Ilustrasi dunia belanja HitungHemat: ruko, karakter, dan jalan pertokoan.
// Semua digambar sendiri sebagai SVG (orisinal, tanpa berkas gambar), ringan untuk HP kelas bawah.
// Animasi (pintu, lambaian, koin) murni CSS dan mati otomatis bila pengguna memilih "kurangi gerakan".
// Label harga pada ilustrasi selalu memuat angka diskon (P3: visual memuat relasi matematis).

export const PAL = {
  blue: '#1677d2',
  sky: '#bfe6ff',
  yellow: '#ffd600',
  pink: '#f863a8',
  pinkSoft: '#ffd1e3',
  green: '#2e8b57',
  greenSoft: '#9fdcb7',
  mint: '#c9f2e0',
  purple: '#8e44c9',
  lilac: '#e6d4ff',
  peach: '#ffd9b8',
  orange: '#f28c28',
  cream: '#fff8ec',
  brown: '#6b3f22',
  ink: '#2a1d24',
  white: '#ffffff',
  glass: '#d9f1ff',
  percent: '#9a4600',
};

/* ---------------- karakter ---------------- */

const FUR = {
  bunny: { fur: '#ffffff', inner: '#ffc2d6', line: '#e9d6dd' },
  cat: { fur: '#ffb35c', inner: '#ffd9b8', line: '#e8963d' },
  bear: { fur: '#b07a4f', inner: '#e3b98f', line: '#8f5e38' },
  penguin: { fur: '#33415c', inner: '#ffffff', line: '#26314a' },
};

/**
 * Karakter kartun bulat (pelanggan, kasir, pemilik toko).
 * @param {{type?:'bunny'|'cat'|'bear'|'penguin', shirt?:string, role?:'customer'|'cashier'|'owner', wave?:boolean, x?:number, y?:number, scale?:number}} p
 * (x, y) = titik tengah bawah kaki.
 */
export function Critter({ type = 'bunny', shirt = PAL.pink, role = 'customer', wave = false, x = 0, y = 0, scale = 1, className = '' }) {
  const f = FUR[type];
  return (
    // Posisi (atribut transform) dan animasi (CSS) dipisah ke dua <g>: transform CSS menimpa atribut SVG.
    <g transform={`translate(${x - 50 * scale} ${y - 128 * scale}) scale(${scale})`}>
    <g className={`critter ${className}`}>
      <ellipse cx="50" cy="126" rx="26" ry="4" fill="#000" opacity="0.12" />
      {/* kaki */}
      <rect x="36" y="104" width="11" height="20" rx="5" fill={f.fur} stroke={f.line} strokeWidth="1.5" />
      <rect x="53" y="104" width="11" height="20" rx="5" fill={f.fur} stroke={f.line} strokeWidth="1.5" />
      {/* lengan kiri (diam) + tas belanja untuk pelanggan */}
      <path d="M32 80 Q22 92 25 104" stroke={f.fur} strokeWidth="9" strokeLinecap="round" fill="none" />
      {role === 'customer' && (
        <g>
          <path d="M16 100 h20 l-2 20 h-16 z" fill={PAL.yellow} stroke={PAL.ink} strokeWidth="1.2" />
          <path d="M21 100 q5 -8 10 0" stroke={PAL.ink} strokeWidth="1.4" fill="none" />
          <text x="26" y="115" fontSize="9" fontWeight="700" textAnchor="middle" fill={PAL.pink}>%</text>
        </g>
      )}
      {/* lengan kanan: melambai */}
      <g className={wave ? 'wave-arm' : ''} style={{ transformOrigin: '68px 80px' }}>
        <path d={wave ? 'M68 80 Q80 66 82 52' : 'M68 80 Q78 92 75 104'} stroke={f.fur} strokeWidth="9" strokeLinecap="round" fill="none" />
        <circle cx={wave ? 82 : 75} cy={wave ? 50 : 105} r="5.5" fill={f.fur} stroke={f.line} strokeWidth="1.2" />
      </g>
      {/* badan / baju */}
      <path d="M30 74 Q50 66 70 74 L73 108 Q50 114 27 108 Z" fill={shirt} />
      {role === 'owner' && (
        <g>
          <path d="M38 78 h24 v28 q-12 4 -24 0 z" fill={PAL.white} />
          <rect x="44" y="90" width="12" height="7" rx="2" fill={PAL.pinkSoft} />
        </g>
      )}
      {role === 'cashier' && (
        <g>
          <rect x="44" y="80" width="12" height="9" rx="2" fill={PAL.white} />
          <text x="50" y="87.5" fontSize="6.5" fontWeight="700" textAnchor="middle" fill={PAL.blue}>Rp</text>
        </g>
      )}
      {type === 'penguin' && <ellipse cx="50" cy="94" rx="13" ry="14" fill={f.inner} />}
      {/* telinga */}
      {type === 'bunny' && (
        <g>
          <ellipse cx="38" cy="16" rx="7" ry="19" fill={f.fur} stroke={f.line} strokeWidth="1.5" />
          <ellipse cx="62" cy="16" rx="7" ry="19" fill={f.fur} stroke={f.line} strokeWidth="1.5" />
          <ellipse cx="38" cy="17" rx="3.4" ry="13" fill={f.inner} />
          <ellipse cx="62" cy="17" rx="3.4" ry="13" fill={f.inner} />
        </g>
      )}
      {type === 'cat' && (
        <g>
          <path d="M27 36 L30 12 L46 26 Z" fill={f.fur} stroke={f.line} strokeWidth="1.5" />
          <path d="M73 36 L70 12 L54 26 Z" fill={f.fur} stroke={f.line} strokeWidth="1.5" />
          <path d="M31 31 L32 19 L41 27 Z" fill={f.inner} />
          <path d="M69 31 L68 19 L59 27 Z" fill={f.inner} />
        </g>
      )}
      {type === 'bear' && (
        <g>
          <circle cx="30" cy="27" r="9" fill={f.fur} />
          <circle cx="70" cy="27" r="9" fill={f.fur} />
          <circle cx="30" cy="27" r="4.5" fill={f.inner} />
          <circle cx="70" cy="27" r="4.5" fill={f.inner} />
        </g>
      )}
      {/* kepala */}
      <circle cx="50" cy="48" r="25" fill={f.fur} stroke={f.line} strokeWidth="1.5" />
      {type === 'penguin' && <ellipse cx="50" cy="53" rx="18" ry="16" fill={f.inner} />}
      {type === 'bear' && <ellipse cx="50" cy="57" rx="10" ry="7" fill={f.inner} />}
      {/* topi kasir */}
      {role === 'cashier' && (
        <g>
          <path d="M27 38 Q50 14 73 38 Z" fill={PAL.blue} />
          <path d="M60 37 q16 -2 22 4 q-12 2 -22 0 z" fill={PAL.blue} />
          <circle cx="50" cy="24" r="3" fill={PAL.yellow} />
        </g>
      )}
      {/* wajah */}
      <circle cx="41" cy="48" r="3.4" fill={PAL.ink} />
      <circle cx="59" cy="48" r="3.4" fill={PAL.ink} />
      <circle cx="42.2" cy="46.8" r="1.1" fill="#fff" />
      <circle cx="60.2" cy="46.8" r="1.1" fill="#fff" />
      <ellipse cx="35" cy="56" rx="4.2" ry="2.6" fill={PAL.pink} opacity="0.45" />
      <ellipse cx="65" cy="56" rx="4.2" ry="2.6" fill={PAL.pink} opacity="0.45" />
      {type === 'penguin' ? (
        <path d="M45 54 L55 54 L50 60 Z" fill={PAL.orange} />
      ) : (
        <>
          <ellipse cx="50" cy="54" rx="2.2" ry="1.6" fill={type === 'bunny' ? PAL.pink : PAL.ink} />
          <path d="M45 57 Q50 62 55 57" stroke={PAL.ink} strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </>
      )}
    </g>
    </g>
  );
}

/* ---------------- isi etalase ---------------- */

function Goods({ kind, x, y, w }) {
  const c = x + w / 2;
  switch (kind) {
    case 'baju':
      return (
        <g>
          {[c - w * 0.24, c + w * 0.24].map((cx, i) => (
            <path
              key={i}
              d={`M${cx - 9} ${y + 12} l-7 5 l4 6 l3 -2 v15 h18 v-15 l3 2 l4 -6 l-7 -5 q-5 4 -11 0 z`}
              fill={i ? PAL.yellow : PAL.pink}
              stroke={PAL.ink}
              strokeWidth="0.8"
            />
          ))}
        </g>
      );
    case 'sekolah':
      return (
        <g>
          <rect x={c - w * 0.38} y={y + 14} width="12" height="24" rx="1.5" fill={PAL.blue} />
          <rect x={c - w * 0.38 + 13} y={y + 18} width="10" height="20" rx="1.5" fill={PAL.green} />
          <rect x={c + 2} y={y + 10} width="5" height="28" rx="1" fill={PAL.yellow} transform={`rotate(12 ${c + 4} ${y + 24})`} />
          <path d={`M${c + 12} ${y + 22} h14 l-2 16 h-10 z`} fill={PAL.pink} />
        </g>
      );
    case 'eskrim':
      return (
        <g>
          {[c - w * 0.22, c + w * 0.22].map((cx, i) => (
            <g key={i}>
              <path d={`M${cx - 7} ${y + 22} l7 16 l7 -16 z`} fill="#e7b46a" />
              <circle cx={cx} cy={y + 18} r="8" fill={i ? PAL.greenSoft : PAL.pinkSoft} />
              <circle cx={cx + 2} cy={y + 11} r="2" fill="#e8343f" />
            </g>
          ))}
        </g>
      );
    case 'sepatu':
      return (
        <g>
          {[c - w * 0.2, c + w * 0.2].map((cx, i) => (
            <g key={i}>
              <path
                d={`M${cx - 13} ${y + 36} v-16 q0 -3 3 -3 h6 q1 7 7 9 l8 3 q3 1 3 4 v3 z`}
                fill={i ? PAL.blue : PAL.pink}
                stroke={PAL.ink}
                strokeWidth="0.9"
              />
              <rect x={cx - 13} y={y + 34} width="27" height="3.5" rx="1.5" fill={PAL.white} stroke={PAL.ink} strokeWidth="0.6" />
              <path d={`M${cx - 4} ${y + 24} l4 2 M${cx - 2} ${y + 21} l4 2`} stroke={PAL.white} strokeWidth="1.3" strokeLinecap="round" />
            </g>
          ))}
        </g>
      );
    case 'tas':
      return (
        <g>
          <path d={`M${c - 9} ${y + 14} q0 -9 9 -9 q9 0 9 9`} stroke={PAL.ink} strokeWidth="2.2" fill="none" />
          <rect x={c - 15} y={y + 13} width="30" height="26" rx="7" fill={PAL.purple} stroke={PAL.ink} strokeWidth="0.9" />
          <rect x={c - 10} y={y + 25} width="20" height="11" rx="4" fill={PAL.lilac} stroke={PAL.ink} strokeWidth="0.7" />
          <circle cx={c} cy={y + 25} r="1.8" fill={PAL.yellow} />
        </g>
      );
    case 'kasir':
      return (
        <g>
          <rect x={c - 16} y={y + 16} width="32" height="22" rx="3" fill={PAL.lilac} stroke={PAL.ink} strokeWidth="0.8" />
          <rect x={c - 11} y={y + 19} width="22" height="7" rx="1.5" fill="#9ff0b8" />
          <text x={c} y={y + 25} fontSize="5.5" fontWeight="700" textAnchor="middle" fill={PAL.green}>Rp</text>
          <path d={`M${c - 6} ${y + 16} v-8 h12 v8`} fill={PAL.white} stroke={PAL.ink} strokeWidth="0.6" />
        </g>
      );
    default:
      return (
        <g>
          <ellipse cx={c - 8} cy={y + 30} rx="12" ry="7" fill="#e7b46a" />
          <ellipse cx={c + 12} cy={y + 30} rx="9" ry="6" fill="#d99a4a" />
        </g>
      );
  }
}

/**
 * Satu ruko: papan nama, tenda bergaris, etalase, pintu yang membuka, dan label diskon.
 * (x, y) = pojok kiri atas; tinggi total h, alas di y + h.
 */
export function Ruko({ x, y, w = 110, h = 160, wall = PAL.cream, awningA = PAL.pink, awningB = PAL.white, sign, signColor = PAL.blue, kind, tag, doorDelay = 0, active = false }) {
  const stripes = 6;
  const sw = w / stripes;
  const awY = y + 52;
  const winW = w * 0.5;
  const doorX = x + w * 0.62;
  const doorW = w * 0.3;
  const baseY = y + h;
  return (
    <g className={`ruko ${active ? 'ruko-active' : ''}`}>
      {/* atap & dinding */}
      <rect x={x - 3} y={y + 6} width={w + 6} height="10" rx="4" fill={signColor} />
      <rect x={x} y={y + 14} width={w} height={h - 14} fill={wall} stroke="#00000014" />
      {/* papan nama */}
      <rect x={x + 8} y={y + 20} width={w - 16} height="24" rx="8" fill={PAL.white} stroke={signColor} strokeWidth="2.5" />
      <text x={x + w / 2} y={y + 37} textAnchor="middle" fontSize={sign && sign.length > 10 ? 10 : 12} fontWeight="700" fill={signColor} className="svg-display">
        {sign}
      </text>
      {/* tenda bergaris + gerigi */}
      {Array.from({ length: stripes }, (_, i) => (
        <rect key={i} x={x + i * sw} y={awY} width={sw} height="18" fill={i % 2 ? awningB : awningA} />
      ))}
      {Array.from({ length: stripes }, (_, i) => (
        <circle key={`s${i}`} cx={x + i * sw + sw / 2} cy={awY + 18} r={sw / 2} fill={i % 2 ? awningB : awningA} />
      ))}
      {/* etalase */}
      <rect x={x + 8} y={awY + 32} width={winW} height="46" rx="5" fill={PAL.glass} stroke={PAL.white} strokeWidth="3" />
      <Goods kind={kind} x={x + 8} y={awY + 32} w={winW} />
      <path d={`M${x + 14} ${awY + 40} l10 -4`} stroke={PAL.white} strokeWidth="3" strokeLinecap="round" opacity="0.8" />
      {/* pintu: kusen + daun pintu yang membuka */}
      <rect x={doorX - 3} y={awY + 30} width={doorW + 6} height={baseY - awY - 30} rx="4" fill={PAL.brown} />
      <rect x={doorX} y={awY + 33} width={doorW} height={baseY - awY - 33} fill="#fff3c4" />
      <g className="door" style={{ transformOrigin: `${doorX}px ${awY + 33}px`, animationDelay: `${doorDelay}s` }}>
        <rect x={doorX} y={awY + 33} width={doorW} height={baseY - awY - 33} fill={awningA === PAL.white ? PAL.pink : awningA} />
        <rect x={doorX + 4} y={awY + 38} width={doorW - 8} height="16" rx="2" fill={PAL.glass} />
        <circle cx={doorX + doorW - 5} cy={awY + 33 + (baseY - awY - 33) / 2} r="2" fill={PAL.yellow} />
      </g>
      {/* label diskon menggantung */}
      {tag && (
        <g className="hang-tag" style={{ transformOrigin: `${x + 14 + winW - 8}px ${awY + 22}px` }}>
          <line x1={x + winW + 6} y1={awY + 22} x2={x + winW + 6} y2={awY + 30} stroke={PAL.ink} strokeWidth="1" />
          <rect x={x + winW - 12} y={awY + 29} width="36" height="17" rx="5" fill={PAL.white} stroke={PAL.percent} strokeWidth="1.6" />
          <text x={x + winW + 6} y={awY + 41.5} textAnchor="middle" fontSize="10.5" fontWeight="800" fill={PAL.percent}>
            {tag}
          </text>
        </g>
      )}
    </g>
  );
}

export function Coin({ x, y, className = 'float' }) {
  return (
    <g className={className} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
      <circle cx={x} cy={y} r="9" fill={PAL.yellow} stroke="#d4b100" strokeWidth="2" />
      <text x={x} y={y + 3.5} textAnchor="middle" fontSize="8" fontWeight="800" fill="#9a7400">Rp</text>
    </g>
  );
}

export function Star({ x, y, r = 7, className = 'twinkle', fill = PAL.yellow }) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    return `${x + rr * Math.cos(a)},${y + rr * Math.sin(a)}`;
  }).join(' ');
  return <polygon points={pts} fill={fill} className={className} style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />;
}

/** Ilustrasi beranda: tiga ruko lucu, pelanggan melambai, koin & bintang. */
export function ShopStreet() {
  return (
    <svg viewBox="0 0 360 236" className="shop-street" role="img" aria-label="Deretan ruko dengan label diskon dan pelanggan yang melambai">
      <Star x={30} y={22} />
      <Star x={330} y={30} r={6} />
      <Coin x={180} y={18} />
      <Ruko x={6} y={30} w={110} h={170} sign="TOKO BAJU" signColor={PAL.pink} awningA={PAL.pink} kind="baju" tag="-25%" doorDelay={0} />
      <Ruko x={125} y={14} w={110} h={186} sign="ALAT SEKOLAH" signColor={PAL.blue} awningA={PAL.blue} wall="#eef7ff" kind="sekolah" tag="-20%" doorDelay={1.2} />
      <Ruko x={244} y={30} w={110} h={170} sign="ES KRIM" signColor={PAL.green} awningA={PAL.green} wall="#f1fff6" kind="eskrim" tag="-10%" doorDelay={2.4} />
      {/* trotoar */}
      <rect x="0" y="200" width="360" height="36" fill="#f6e2c8" />
      {Array.from({ length: 12 }, (_, i) => (
        <rect key={i} x={i * 32 - 4} y="200" width="28" height="5" rx="2" fill="#ead0ae" />
      ))}
      <Critter type="bunny" shirt={PAL.pink} wave x={104} y={232} scale={0.62} className="bob" />
      <Critter type="penguin" shirt={PAL.yellow} x={262} y={232} scale={0.55} />
      <Critter type="cat" role="cashier" shirt={PAL.lilac} x={196} y={232} scale={0.5} />
    </svg>
  );
}

/* ---------------- jalan perjalanan belajar ---------------- */

export const JOURNEY_GAP = 220;
export const journeyX = (i) => 140 + i * JOURNEY_GAP;

function Gate({ cx }) {
  return (
    <g>
      <rect x={cx - 92} y="40" width="14" height="140" rx="5" fill={PAL.pink} />
      <rect x={cx + 78} y="40" width="14" height="140" rx="5" fill={PAL.pink} />
      <path d={`M${cx - 98} 50 Q${cx} 6 ${cx + 98} 50 v22 Q${cx} 30 ${cx - 98} 72 z`} fill={PAL.blue} />
      <text x={cx} y="54" textAnchor="middle" fontSize="13" fontWeight="800" fill="#fff" className="svg-display">JALAN RUKO HEMAT</text>
      {[[-70, 92, PAL.yellow], [-56, 80, PAL.pink], [60, 86, PAL.green], [74, 98, PAL.yellow]].map(([dx, cy, c]) => (
        <g key={dx} className="float">
          <ellipse cx={cx + dx} cy={cy} rx="9" ry="11" fill={c} />
          <line x1={cx + dx} y1={cy + 11} x2={cx + dx} y2={cy + 30} stroke={PAL.ink} strokeWidth="0.8" />
        </g>
      ))}
    </g>
  );
}

function Finish({ cx }) {
  return (
    <g>
      <rect x={cx - 4} y="40" width="6" height="140" fill={PAL.ink} />
      <g className="flag">
        <path d={`M${cx + 2} 42 h54 l-10 15 l10 15 h-54 z`} fill={PAL.green} />
        <text x={cx + 26} y="62" textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff">LULUS</text>
      </g>
      <Star x={cx - 50} y={70} r={16} />
      <Star x={cx + 70} y={110} r={10} />
      <Critter type="bear" role="owner" shirt={PAL.green} wave x={cx - 40} y={182} scale={0.62} />
    </g>
  );
}

/**
 * Jalan pertokoan panjang. Kamera bergeser mengikuti tahap; pelanggan berjalan di tengah.
 * @param {{stage:number, walking:boolean}} props
 */
export function JourneyStreet({ stage, walking }) {
  const W = journeyX(5) + 160;
  return (
    <div className="journey-view" aria-hidden="true">
      <svg
        className="journey-strip"
        viewBox={`0 0 ${W} 200`}
        width={W}
        height="200"
        style={{ transform: `translateX(${-journeyX(stage)}px)` }}
      >
        <rect x="0" y="180" width={W} height="20" fill="#f6e2c8" />
        <rect x="0" y="178" width={W} height="4" fill="#ead0ae" />
        <Gate cx={journeyX(0)} />
        <Ruko x={journeyX(1) - 60} y={20} w={120} h={160} sign="TOKO BAJU" signColor={PAL.pink} awningA={PAL.pink} kind="baju" tag="-25%" active={stage === 1} />
        <Ruko x={journeyX(2) - 60} y={20} w={120} h={160} sign="ALAT SEKOLAH" signColor={PAL.blue} awningA={PAL.blue} wall="#eef7ff" kind="sekolah" tag="-20%" active={stage === 2} />
        <Ruko x={journeyX(3) - 60} y={20} w={120} h={160} sign="KASIR" signColor={PAL.purple} awningA={PAL.purple} wall="#f7f0ff" kind="kasir" active={stage === 3} />
        <Critter type="cat" role="cashier" shirt={PAL.lilac} x={journeyX(3) + 70} y={182} scale={0.55} wave={stage === 3} />
        <Ruko x={journeyX(4) - 100} y={36} w={96} h={144} sign="TOKO A" signColor={PAL.orange} awningA={PAL.orange} kind="sepatu" tag="-30%" active={stage === 4} />
        <Ruko x={journeyX(4) + 4} y={36} w={96} h={144} sign="TOKO B" signColor={PAL.green} awningA={PAL.green} wall="#f1fff6" kind="sepatu" tag="-20%" active={stage === 4} />
        <Finish cx={journeyX(5)} />
      </svg>
      <svg className={`journey-walker ${walking ? 'walking' : ''}`} viewBox="0 0 100 130" width="62" height="80">
        <Critter type="bunny" shirt={PAL.pink} x={50} y={128} wave={!walking} />
      </svg>
    </div>
  );
}

/** Rak toko untuk Simulasi Belanja. */
export function ProductIcon({ kind, size = 56 }) {
  return (
    <svg viewBox="0 0 60 50" width={size} height={size * (50 / 60)} aria-hidden="true">
      <Goods kind={kind} x={0} y={4} w={60} />
    </svg>
  );
}
