// Latar "PLUM ARCADE WORLD": mesin arcade bercahaya neon, untaian lampu pink & cyan, lantai grid neon,
// partikel cahaya, koin, dan label %. Selalu di belakang konten, tidak bisa diketuk, disembunyikan dari
// pembaca layar. calm = true di layar mengerjakan soal: mesin, partikel, dan grid disembunyikan agar
// tidak menambah beban kognitif ekstrinsik (EL03, DS03). Warna = token tema di styles.css.

const PURPLE = '#8B5CF6';
const PINK = '#F472B6';
const CYAN = '#22D3EE';
const LAV = '#C084FC';
const GOLD = '#FCD34D';
const CARD = '#2E1A45';
const DEEP = '#1D0F31';

/** Mesin arcade: kabinet ungu, papan nama neon, layar menyala, joystick & tombol. */
function Arcade({ className, label = 'HEMAT', screen = CYAN, accent = PINK }) {
  return (
    <svg className={`d ${className}`} viewBox="0 0 120 200" aria-hidden="true">
      <defs>
        <linearGradient id={`cab-${label}`} x1="0" x2="1">
          <stop offset="0" stopColor="#3B1F63" />
          <stop offset="0.55" stopColor="#4C2A7A" />
          <stop offset="1" stopColor="#2A1547" />
        </linearGradient>
      </defs>
      {/* cahaya lantai */}
      <ellipse cx="60" cy="196" rx="58" ry="6" fill={accent} opacity="0.35" />
      {/* kabinet */}
      <path d="M18 196 V70 L26 22 H94 L102 70 V196 Z" fill={`url(#cab-${label})`} stroke={PURPLE} strokeWidth="2.5" />
      {/* papan nama neon */}
      <rect x="24" y="8" width="72" height="22" rx="6" fill={DEEP} stroke={accent} strokeWidth="2.5" />
      <text x="60" y="24" textAnchor="middle" fontSize="12" fontWeight="800" fill={accent} fontFamily="Fredoka, sans-serif" className="lamp">
        {label}
      </text>
      {/* layar */}
      <rect x="28" y="38" width="64" height="48" rx="6" fill="#0B1E33" stroke={screen} strokeWidth="2" />
      <g className="screen-glow">
        <rect x="30" y="40" width="60" height="44" rx="5" fill={screen} opacity="0.18" />
        {/* koin piksel & panah turun harga */}
        <circle cx="48" cy="60" r="8" fill={GOLD} />
        <text x="48" y="63.5" textAnchor="middle" fontSize="8" fontWeight="800" fill="#7A4B00">Rp</text>
        <path d="M66 50 v16 m-6 -6 l6 6 l6 -6" stroke={screen} strokeWidth="3" fill="none" strokeLinecap="round" />
        <rect x="34" y="74" width="52" height="4" rx="2" fill={screen} opacity="0.6" />
      </g>
      {/* panel kontrol */}
      <path d="M18 100 H102 L96 118 H24 Z" fill="#5B3394" />
      <circle cx="40" cy="104" r="3" fill="#160D25" />
      <line x1="40" y1="104" x2="36" y2="92" stroke="#160D25" strokeWidth="3" strokeLinecap="round" />
      <circle cx="36" cy="91" r="5" fill={PINK} />
      <circle cx="70" cy="108" r="5" fill={CYAN} />
      <circle cx="84" cy="106" r="5" fill={GOLD} />
      {/* celah koin bercahaya */}
      <rect x="52" y="140" width="16" height="22" rx="3" fill={DEEP} stroke={GOLD} strokeWidth="1.5" />
      <rect x="58" y="145" width="4" height="10" rx="2" fill={GOLD} className="lamp" />
      {/* garis neon samping */}
      <line x1="20" y1="72" x2="20" y2="194" stroke={accent} strokeWidth="2" opacity="0.8" />
      <line x1="100" y1="72" x2="100" y2="194" stroke={accent} strokeWidth="2" opacity="0.8" />
    </svg>
  );
}

/** Untaian lampu pink & cyan di atas. */
function Lights() {
  const n = 18;
  return (
    <svg className="d d-lights" viewBox="0 0 360 34" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 6 Q90 30 180 8 T360 8" stroke={LAV} strokeWidth="1.2" fill="none" opacity="0.6" />
      {Array.from({ length: n }, (_, i) => {
        const x = 10 + (i * 340) / (n - 1);
        const y = 8 + 12 * Math.sin((i / (n - 1)) * Math.PI * 2) ** 2;
        return (
          <circle
            key={i}
            cx={x}
            cy={y + 4}
            r="3.2"
            fill={i % 2 ? CYAN : PINK}
            className="lamp"
            style={{ animationDelay: `${(i % 4) * 0.45}s` }}
          />
        );
      })}
    </svg>
  );
}

/** Lantai grid neon (perspektif). */
function Grid() {
  const v = Array.from({ length: 11 }, (_, i) => i);
  return (
    <svg className="d d-grid" viewBox="0 0 400 140" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="grid-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={PURPLE} stopOpacity="0" />
          <stop offset="1" stopColor={PURPLE} stopOpacity="0.9" />
        </linearGradient>
      </defs>
      {v.map((i) => (
        <line key={`v${i}`} x1={200 + (i - 5) * 18} y1="0" x2={200 + (i - 5) * 90} y2="140" stroke="url(#grid-fade)" strokeWidth="1.2" />
      ))}
      {[20, 46, 76, 110].map((y) => (
        <line key={`h${y}`} x1="0" y1={y} x2="400" y2={y} stroke="url(#grid-fade)" strokeWidth="1.2" />
      ))}
    </svg>
  );
}

const Tag = ({ className }) => (
  <svg className={`d float ${className}`} viewBox="0 0 60 40" aria-hidden="true">
    <path d="M4 20 L16 4 L56 4 L56 36 L16 36 Z" fill={CARD} stroke={PINK} strokeWidth="3" strokeLinejoin="round" />
    <circle cx="16" cy="20" r="3.5" fill={CYAN} />
    <text x="37" y="27" textAnchor="middle" fontSize="20" fontWeight="700" fill={PINK} fontFamily="Fredoka, sans-serif">%</text>
  </svg>
);

const Coin = ({ className }) => (
  <svg className={`d float ${className}`} viewBox="0 0 44 44" aria-hidden="true">
    <circle cx="22" cy="22" r="20" fill={GOLD} />
    <circle cx="22" cy="22" r="14" fill="none" stroke="#D97706" strokeWidth="2.5" />
    <text x="22" y="27" textAnchor="middle" fontSize="13" fontWeight="700" fill="#7A4B00" fontFamily="Fredoka, sans-serif">Rp</text>
  </svg>
);

const Star = ({ className, color = GOLD }) => (
  <svg className={`d float ${className}`} viewBox="0 0 40 40" aria-hidden="true">
    <path d="M20 3 L25 14 L37 15 L28 23 L31 35 L20 29 L9 35 L12 23 L3 15 L15 14 Z" fill={color} />
  </svg>
);

const SPARKS = [
  [12, 22, ''], [82, 18, 'p'], [30, 40, 'g'], [70, 52, ''], [8, 64, 'p'], [92, 70, ''], [48, 30, 'p'], [60, 80, 'g'],
];

export default function Decor({ calm = false }) {
  return (
    <div className={`decor ${calm ? 'calm' : ''}`} aria-hidden="true">
      <Lights />
      <Grid />
      {SPARKS.map(([l, t, c], i) => (
        <span key={i} className={`d d-spark ${c}`} style={{ left: `${l}%`, top: `${t}%`, animationDelay: `${i * 0.33}s` }} />
      ))}
      <Star className="d-star1" />
      <Star className="d-star2" color={LAV} />
      <Tag className="d-tag" />
      <Coin className="d-coin" />
      <Arcade className="d-arcade-l" label="HEMAT" screen={CYAN} accent={PINK} />
      <Arcade className="d-arcade-r" label="DISKON" screen={PINK} accent={CYAN} />
    </div>
  );
}
