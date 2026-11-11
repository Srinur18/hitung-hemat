// Kiko si Rubah — maskot orisinal HitungHemat (bukan salinan maskot merek lain).
// Rubah berkacamata ungu, kaus pink berlengan kuning dengan logo label harga %, sepatu pink.
// Peran pedagogis: "teman belajar" yang memberi sapaan, petunjuk, dan umpan balik.

const C = {
  fur: '#F28C28',
  furDark: '#D9711A',
  cream: '#FFF4E6',
  brown: '#4A2A17',
  purple: '#8E44C9',
  pink: '#F863A8',
  yellow: '#FFD600',
};

function Arms({ mood }) {
  const arm = (x1, y1, x2, y2) => (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.fur} strokeWidth="13" strokeLinecap="round" />
      <circle cx={x2} cy={y2} r="8.5" fill={C.fur} />
    </g>
  );
  if (mood === 'cheer') return <>{arm(60, 146, 36, 108)}{arm(140, 146, 164, 108)}</>;
  if (mood === 'think') return <>{arm(60, 150, 50, 182)}{arm(140, 150, 120, 132)}</>;
  return <>{arm(60, 150, 50, 182)}{arm(140, 146, 166, 110)}</>; // melambai
}

/**
 * @param {{mood?: 'wave'|'cheer'|'think', size?: number, className?: string}} props
 */
export default function Mascot({ mood = 'wave', size = 120, className = '' }) {
  return (
    <svg
      viewBox="0 0 200 240"
      width={size}
      height={size * 1.2}
      role="img"
      aria-label="Kiko si rubah"
      className={`mascot ${className}`}
    >
      <ellipse cx="100" cy="228" rx="58" ry="8" fill="#000" opacity="0.12" />
      {/* ekor */}
      <path d="M130 184 C178 182 198 140 178 104 C172 134 158 156 126 164 Z" fill={C.fur} />
      <path d="M178 104 C190 120 190 142 182 156 C174 142 172 122 178 104 Z" fill={C.cream} />
      {/* kaki & sepatu */}
      <rect x="78" y="188" width="16" height="26" rx="7" fill={C.fur} />
      <rect x="106" y="188" width="16" height="26" rx="7" fill={C.fur} />
      <ellipse cx="84" cy="215" rx="16" ry="9" fill={C.pink} />
      <ellipse cx="117" cy="215" rx="16" ry="9" fill={C.pink} />
      <rect x="68" y="216" width="32" height="5" rx="2.5" fill="#fff" />
      <rect x="101" y="216" width="32" height="5" rx="2.5" fill="#fff" />
      {/* lengan (di belakang lengan kaus) */}
      <Arms mood={mood} />
      {/* kaus */}
      <path d="M66 134 Q100 124 134 134 L141 192 Q100 201 59 192 Z" fill={C.pink} />
      <circle cx="64" cy="145" r="14" fill={C.yellow} />
      <circle cx="136" cy="145" r="14" fill={C.yellow} />
      {/* logo HitungHemat: label harga + % */}
      <path d="M84 166 L91 155 L116 155 L116 177 L91 177 Z" fill="#fff" />
      <circle cx="89.5" cy="166" r="2.4" fill={C.pink} />
      <circle cx="101" cy="161" r="2.6" fill={C.pink} />
      <circle cx="110" cy="171" r="2.6" fill={C.pink} />
      <line x1="112" y1="158" x2="99" y2="174" stroke={C.pink} strokeWidth="2.6" strokeLinecap="round" />
      {/* telinga */}
      <path d="M50 72 L44 18 Q46 12 52 15 L92 48 Z" fill={C.fur} />
      <path d="M56 62 L52 30 L80 51 Z" fill={C.cream} />
      <path d="M44 18 Q46 12 52 15 L60 22 L47 32 Z" fill={C.brown} />
      <path d="M150 72 L156 18 Q154 12 148 15 L108 48 Z" fill={C.fur} />
      <path d="M144 62 L148 30 L120 51 Z" fill={C.cream} />
      <path d="M156 18 Q154 12 148 15 L140 22 L153 32 Z" fill={C.brown} />
      {/* kepala */}
      <ellipse cx="100" cy="92" rx="64" ry="52" fill={C.fur} />
      <path d="M100 44 Q92 62 100 74 Q108 62 100 44 Z" fill={C.furDark} opacity="0.5" />
      <path d="M56 102 Q100 90 144 102 Q140 142 100 144 Q60 142 56 102 Z" fill={C.cream} />
      {/* alis, mata, kacamata */}
      <path d="M68 73 Q78 66 89 71" stroke={C.brown} strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M111 71 Q122 66 132 73" stroke={C.brown} strokeWidth="4" strokeLinecap="round" fill="none" />
      <circle cx="80" cy="96" r="11" fill={C.brown} />
      <circle cx="120" cy="96" r="11" fill={C.brown} />
      <circle cx="84" cy="92" r="3.6" fill="#fff" />
      <circle cx="124" cy="92" r="3.6" fill="#fff" />
      <g stroke={C.purple} strokeWidth="5" fill={C.purple} fillOpacity="0.12">
        <rect x="60" y="80" width="39" height="32" rx="12" />
        <rect x="101" y="80" width="39" height="32" rx="12" />
      </g>
      <path d="M60 90 L42 84 M140 90 L158 84" stroke={C.purple} strokeWidth="4.5" strokeLinecap="round" />
      {/* hidung, mulut, pipi */}
      <ellipse cx="100" cy="119" rx="7" ry="5" fill={C.brown} />
      {mood === 'cheer' ? (
        <path d="M89 126 Q100 142 111 126 Z" fill={C.brown} />
      ) : mood === 'think' ? (
        <path d="M93 129 Q101 126 108 130" stroke={C.brown} strokeWidth="3" strokeLinecap="round" fill="none" />
      ) : (
        <path d="M91 125 Q100 134 109 125" stroke={C.brown} strokeWidth="3" strokeLinecap="round" fill="none" />
      )}
      <ellipse cx="64" cy="120" rx="8" ry="5" fill={C.pink} opacity="0.45" />
      <ellipse cx="136" cy="120" rx="8" ry="5" fill={C.pink} opacity="0.45" />
    </svg>
  );
}

/** Kiko dengan balon kata. */
export function KikoSays({ children, mood = 'wave', size = 84 }) {
  return (
    <div className="kiko-says">
      <Mascot mood={mood} size={size} />
      <div className="bubble">{children}</div>
    </div>
  );
}
