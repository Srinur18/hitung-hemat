// Hiasan latar (matahari, awan, bukit, pohon, semak, benda melayang bertema diskon).
// Selalu di belakang konten, tidak bisa diketuk, disembunyikan dari pembaca layar.
// calm = true di layar mengerjakan soal: hiasan diredupkan & benda melayang disembunyikan
// agar tidak menambah beban kognitif ekstrinsik (EL03, DS03).

const G = '#5FBF9E'; // hijau palet
const G2 = '#8DDCC0'; // tint hijau palet
const Y = '#FFD66B';
const P = '#FF7F87';
const W = '#FFFFFF';
const B = '#BBA5E8';

const Cloud = ({ className }) => (
  <svg className={`d ${className}`} viewBox="0 0 110 60" aria-hidden="true">
    <path d="M14 52 Q8 34 28 32 Q32 14 52 18 Q64 4 80 16 Q100 14 100 34 Q110 40 102 52 Z" fill={W} />
  </svg>
);

const Tree = ({ className }) => (
  <svg className={`d ${className}`} viewBox="0 0 60 100" aria-hidden="true">
    <rect x="25" y="50" width="10" height="46" rx="5" fill={Y} />
    <circle cx="30" cy="34" r="28" fill={G} />
    <circle cx="21" cy="25" r="10" fill={G2} opacity="0.7" />
  </svg>
);

const Bush = ({ className }) => (
  <svg className={`d ${className}`} viewBox="0 0 90 44" aria-hidden="true">
    <circle cx="20" cy="30" r="16" fill={G} />
    <circle cx="44" cy="22" r="20" fill={G} />
    <circle cx="68" cy="30" r="16" fill={G} />
    <circle cx="38" cy="16" r="7" fill={G2} opacity="0.7" />
    {[[18, 22, P], [50, 12, Y], [70, 24, P], [34, 32, Y]].map(([x, y, c]) => (
      <g key={`${x}${y}`}>
        <circle cx={x} cy={y} r="4.5" fill={c} />
        <circle cx={x} cy={y} r="1.6" fill={W} />
      </g>
    ))}
  </svg>
);

const Tag = ({ className }) => (
  <svg className={`d float ${className}`} viewBox="0 0 60 40" aria-hidden="true">
    <path d="M4 20 L16 4 L56 4 L56 36 L16 36 Z" fill={W} stroke={P} strokeWidth="3" strokeLinejoin="round" />
    <circle cx="16" cy="20" r="3.5" fill={Y} />
    <text x="37" y="27" textAnchor="middle" fontSize="20" fontWeight="700" fill={P} fontFamily="Fredoka, sans-serif">%</text>
  </svg>
);

const Coin = ({ className }) => (
  <svg className={`d float ${className}`} viewBox="0 0 44 44" aria-hidden="true">
    <circle cx="22" cy="22" r="20" fill={Y} />
    <circle cx="22" cy="22" r="14" fill="none" stroke="#E6B53F" strokeWidth="2.5" />
    <text x="22" y="27" textAnchor="middle" fontSize="13" fontWeight="700" fill="#9A6200" fontFamily="Fredoka, sans-serif">Rp</text>
  </svg>
);

const Star = ({ className, color = Y }) => (
  <svg className={`d float ${className}`} viewBox="0 0 40 40" aria-hidden="true">
    <path
      d="M20 3 L25 14 L37 15 L28 23 L31 35 L20 29 L9 35 L12 23 L3 15 L15 14 Z"
      fill={color}
      stroke={W}
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
  </svg>
);

export default function Decor({ calm = false }) {
  return (
    <div className={`decor ${calm ? 'calm' : ''}`} aria-hidden="true">
      <svg className="d d-sun" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="58" fill={Y} opacity="0.35" />
        <circle cx="60" cy="60" r="44" fill={Y} />
      </svg>
      <Cloud className="d-cloud1" />
      <Cloud className="d-cloud2" />
      <Star className="d-star1" />
      <Star className="d-star2" color={B} />
      <Tag className="d-tag" />
      <Coin className="d-coin" />
      <svg className="d d-ground" viewBox="0 0 400 110" preserveAspectRatio="none">
        <path d="M0 50 Q60 14 130 42 T260 36 T400 28 V110 H0 Z" fill={G2} />
        <path d="M0 74 Q90 46 200 70 T400 62 V110 H0 Z" fill={G} />
      </svg>
      <Tree className="d-tree-l" />
      <Tree className="d-tree-r" />
      <Bush className="d-bush-l" />
      <Bush className="d-bush-r" />
    </div>
  );
}
