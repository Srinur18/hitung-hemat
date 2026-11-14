// Maskot HitungHemat.
// v0.5: maskot utama = KUCING PLUM (tema Plum Arcade World): kucing kecil ungu plum bergaya 3D kartun,
// mata besar berkilau, pipi pink, celemek pink, membawa keranjang belanja mini. Digambar sebagai SVG
// dengan gradien radial (kesan 3D) — ringan, tanpa berkas gambar.
// Kiko si Rubah (v0.3) tetap tersedia sebagai `KikoFox`.
// Kiko si Rubah — maskot orisinal HitungHemat (bukan salinan maskot merek lain).
// Rubah berkacamata ungu, kaus pink berlengan kuning dengan logo label harga %, sepatu pink.
// Peran pedagogis: "teman belajar" yang memberi sapaan, petunjuk, dan umpan balik.

const C = {
  fur: '#F28C28',
  furDark: '#D9711A',
  cream: '#FFF4E6',
  brown: '#4A2A17',
  purple: '#9C83D6',
  pink: '#FF7F87',
  yellow: '#FFD66B',
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
export function KikoFox({ mood = 'wave', size = 120, className = '' }) {
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
      {mood === 'point' ? (
        <>
          <PlumArm d="M64 160 Q54 180 56 192" paw={[56, 194]} />
          <Basket x={56} y={208} />
          <PlumArm d="M136 160 Q160 152 178 142" paw={[180, 141]} />
          <path d="M186 134 l10 -6 M188 142 h12 M186 150 l10 6" stroke="#FCD34D" strokeWidth="3" strokeLinecap="round" />
        </>
      ) : mood === 'book' ? (
        <>
          <PlumArm d="M64 160 Q66 176 78 182" paw={[78, 182]} />
          <PlumArm d="M136 160 Q134 176 122 182" paw={[122, 182]} />
          <Book x={100} y={180} />
        </>
      ) : mood === 'trophy' ? (
        <>
          <PlumArm d="M64 160 Q54 180 56 192" paw={[56, 194]} />
          <Basket x={56} y={208} />
          {/* lengan kanan + piala digambar di atas kepala (lihat akhir SVG) */}
        </>
      ) : mood === 'cheer' ? (
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

/* ======================= KUCING PLUM ======================= */
const P = {
  plumLight: '#C9A2F7',
  plum: '#8B5CF6',
  plumDark: '#5B2C9E',
  pink: '#F472B6',
  pinkLight: '#FBCFE8',
  cyan: '#22D3EE',
  gold: '#FCD34D',
  eye: '#1E0B33',
};

function PlumDefs() {
  return (
    <defs>
      <radialGradient id="plum-fur" cx="38%" cy="30%" r="75%">
        <stop offset="0" stopColor={P.plumLight} />
        <stop offset="0.55" stopColor={P.plum} />
        <stop offset="1" stopColor={P.plumDark} />
      </radialGradient>
      <radialGradient id="plum-apron" cx="40%" cy="25%" r="80%">
        <stop offset="0" stopColor={P.pinkLight} />
        <stop offset="1" stopColor={P.pink} />
      </radialGradient>
      <linearGradient id="plum-basket" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#67E8F9" />
        <stop offset="1" stopColor="#0891B2" />
      </linearGradient>
    </defs>
  );
}

function Basket({ x, y }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-14 -8 Q0 -30 14 -8" stroke="#0E7490" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <circle cx="-5" cy="-11" r="5" fill={P.gold} />
      <rect x="2" y="-16" width="8" height="10" rx="2" fill={P.pink} />
      <path d="M-18 -8 H18 L14 12 H-14 Z" fill="url(#plum-basket)" stroke="#0E7490" strokeWidth="1.5" />
      <path d="M-10 -8 L-8 12 M0 -8 V12 M10 -8 L8 12 M-16 2 H16" stroke="#0E7490" strokeWidth="1.2" opacity="0.7" />
    </g>
  );
}

function Book({ x, y }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-24 -14 Q-12 -20 0 -14 Q12 -20 24 -14 V16 Q12 10 0 16 Q-12 10 -24 16 Z" fill="#22D3EE" stroke="#0E7490" strokeWidth="2" />
      <path d="M0 -14 V16" stroke="#0E7490" strokeWidth="2" />
      <path d="M-18 -6 H-6 M-18 0 H-6 M6 -6 H18 M6 0 H18" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
      <text x="12" y="12" textAnchor="middle" fontSize="9" fontWeight="800" fill="#fff">%</text>
    </g>
  );
}

function Trophy({ x, y }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-14 -22 H14 V-8 Q14 6 0 8 Q-14 6 -14 -8 Z" fill="#FCD34D" stroke="#B45309" strokeWidth="2" />
      <path d="M-14 -18 Q-24 -16 -20 -6 Q-17 0 -12 -2 M14 -18 Q24 -16 20 -6 Q17 0 12 -2" stroke="#B45309" strokeWidth="2.5" fill="none" />
      <rect x="-4" y="8" width="8" height="8" fill="#F59E0B" />
      <rect x="-12" y="16" width="24" height="7" rx="2" fill="#8B5CF6" />
      <path d="M0 -17 l2.4 5 5.4 .6 -4 3.8 1.1 5.3 -4.9 -2.7 -4.9 2.7 1.1 -5.3 -4 -3.8 5.4 -.6 z" fill="#fff" opacity="0.9" />
    </g>
  );
}

function PlumArm({ d, paw }) {
  return (
    <g>
      <path d={d} stroke="url(#plum-fur)" strokeWidth="15" strokeLinecap="round" fill="none" />
      <circle cx={paw[0]} cy={paw[1]} r="9" fill={P.plumLight} />
      <circle cx={paw[0]} cy={paw[1] + 2} r="3" fill={P.pinkLight} />
    </g>
  );
}

/**
 * Kucing Plum — maskot utama.
 * Ekspresi pemandu tes: wave (senyum menyemangati), point (menunjuk petunjuk), cheer (melompat senang),
 * think (berpikir & menyemangati), book (membawa buku pembahasan), trophy (membawa piala).
 * Bentuk, warna, wajah, dan celemek Plum tidak berubah — hanya lengan & benda yang dipegang.
 * @param {{mood?: 'wave'|'cheer'|'think'|'point'|'book'|'trophy', size?: number, className?: string}} props
 */
export default function Mascot({ mood = 'wave', size = 120, className = '' }) {
  const happy = mood === 'cheer' || mood === 'trophy';
  const look = mood === 'think' ? -4 : 0; // mata melirik ke atas saat berpikir
  return (
    <svg viewBox="0 0 210 240" width={size} height={size * 1.15} role="img" aria-label="Plum si kucing" className={`mascot plum ${className}`}>
      <PlumDefs />
      {/* bayangan & cahaya lantai neon */}
      <ellipse cx="100" cy="230" rx="62" ry="8" fill={P.pink} opacity="0.25" />
      <ellipse cx="100" cy="230" rx="44" ry="5" fill="#000" opacity="0.35" />
      {/* ekor melengkung */}
      <path d="M136 200 C182 202 188 150 160 134" stroke="url(#plum-fur)" strokeWidth="15" strokeLinecap="round" fill="none" />
      <circle cx="160" cy="134" r="8" fill={P.plumLight} />
      {/* kaki */}
      <ellipse cx="80" cy="216" rx="18" ry="11" fill="url(#plum-fur)" />
      <ellipse cx="120" cy="216" rx="18" ry="11" fill="url(#plum-fur)" />
      {[74, 80, 86, 114, 120, 126].map((x) => <circle key={x} cx={x} cy="220" r="2.4" fill={P.pinkLight} />)}
      {/* badan */}
      <ellipse cx="100" cy="176" rx="46" ry="42" fill="url(#plum-fur)" />
      {/* celemek pink */}
      <path d="M72 152 Q100 142 128 152 L133 200 Q100 212 67 200 Z" fill="url(#plum-apron)" />
      <path d="M72 152 L84 132 M128 152 L116 132" stroke={P.pink} strokeWidth="4" strokeLinecap="round" />
      {[72, 82, 92, 102, 112, 122, 130].map((x) => <circle key={x} cx={x} cy={203 - Math.abs(x - 100) * 0.08} r="4" fill={P.pinkLight} />)}
      <rect x="86" y="166" width="28" height="20" rx="6" fill="#fff" opacity="0.92" />
      <text x="100" y="181" textAnchor="middle" fontSize="13" fontWeight="800" fill={P.pink} fontFamily="Fredoka, sans-serif">%</text>
      {/* lengan + keranjang mini */}
      {mood === 'cheer' ? (
        <>
          <PlumArm d="M64 158 Q46 132 42 112" paw={[42, 110]} />
          <PlumArm d="M136 158 Q154 132 158 112" paw={[158, 110]} />
          <Basket x={42} y={214} />
        </>
      ) : mood === 'think' ? (
        <>
          <PlumArm d="M64 160 Q54 180 56 192" paw={[56, 194]} />
          <Basket x={56} y={208} />
          <PlumArm d="M136 160 Q132 146 116 140" paw={[116, 140]} />
        </>
      ) : (
        <>
          <PlumArm d="M64 160 Q54 180 56 192" paw={[56, 194]} />
          <Basket x={56} y={208} />
          <g className="wave-arm" style={{ transformOrigin: '136px 160px' }}>
            <PlumArm d="M136 160 Q156 140 162 116" paw={[162, 114]} />
          </g>
        </>
      )}
      {/* telinga */}
      <path d="M48 74 L46 16 Q48 8 56 12 L94 46 Z" fill="url(#plum-fur)" />
      <path d="M56 62 L54 26 L82 48 Z" fill={P.pink} opacity="0.85" />
      <path d="M152 74 L154 16 Q152 8 144 12 L106 46 Z" fill="url(#plum-fur)" />
      <path d="M144 62 L146 26 L118 48 Z" fill={P.pink} opacity="0.85" />
      {/* kepala besar */}
      <ellipse cx="100" cy="96" rx="66" ry="58" fill="url(#plum-fur)" />
      <ellipse cx="76" cy="62" rx="22" ry="12" fill="#fff" opacity="0.22" transform="rotate(-18 76 62)" />
      {/* jepit bintang neon */}
      <path d="M138 52 l4 8 9 1 -7 6 2 9 -8 -5 -8 5 2 -9 -7 -6 9 -1 z" fill={P.gold} />
      {/* mata besar berkilau */}
      {happy ? (
        <>
          <path d="M66 100 Q78 84 90 100" stroke={P.eye} strokeWidth="6" strokeLinecap="round" fill="none" />
          <path d="M110 100 Q122 84 134 100" stroke={P.eye} strokeWidth="6" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <ellipse cx="78" cy="98" rx="15" ry="18" fill={P.eye} />
          <ellipse cx="122" cy="98" rx="15" ry="18" fill={P.eye} />
          <ellipse cx="78" cy={104 + look} rx="10" ry="8" fill="#6D28D9" opacity="0.7" />
          <ellipse cx="122" cy={104 + look} rx="10" ry="8" fill="#6D28D9" opacity="0.7" />
          <circle cx="84" cy={90 + look} r="6" fill="#fff" />
          <circle cx="128" cy={90 + look} r="6" fill="#fff" />
          <circle cx="73" cy={106 + look} r="2.6" fill="#fff" />
          <circle cx="117" cy={106 + look} r="2.6" fill="#fff" />
        </>
      )}
      {/* pipi pink */}
      <ellipse cx="58" cy="122" rx="11" ry="7" fill={P.pink} opacity="0.75" />
      <ellipse cx="142" cy="122" rx="11" ry="7" fill={P.pink} opacity="0.75" />
      {/* hidung, mulut, kumis */}
      <path d="M95 116 H105 L100 122 Z" fill={P.pink} />
      {happy ? (
        <path d="M90 124 Q100 140 110 124 Z" fill="#9D174D" />
      ) : mood === 'think' ? (
        <path d="M93 129 Q100 126 107 130" stroke={P.eye} strokeWidth="3" strokeLinecap="round" fill="none" />
      ) : (
        <path d="M90 124 Q95 130 100 124 Q105 130 110 124" stroke={P.eye} strokeWidth="3" strokeLinecap="round" fill="none" />
      )}
      <path d="M40 112 L62 116 M40 124 L62 122 M160 112 L138 116 M160 124 L138 122" stroke="#E9D5FF" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
      {mood === 'trophy' && (
        <g>
          <PlumArm d="M136 162 Q172 140 176 104" paw={[176, 102]} />
          <Trophy x={176} y={78} />
        </g>
      )}
    </svg>
  );
}

/** Plum dengan balon kata (nama komponen lama dipertahankan agar semua layar ikut). */
export function KikoSays({ children, mood = 'wave', size = 84 }) {
  return (
    <div className="kiko-says">
      <Mascot mood={mood} size={size} />
      <div className="bubble">{children}</div>
    </div>
  );
}
