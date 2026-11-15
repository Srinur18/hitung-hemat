// Latar SEMUA halaman: dua bangunan kecil di tepi kiri & kanan, sedikit miring saling berhadapan, sehingga
// papan namanya muat di sela konten. Kiri = TOKO PAKAIAN, kanan = BAKERY PLUMIE'S (kue & roti) dengan
// Kucing Plum sebagai penjaga toko. Bangunan sama untuk kedua tema; warna dari token --gs-*:
//   Tema Gelap  = malam (langit ungu, lampu toko hangat, etalase bercahaya, bintang & bulan).
//   Tema Terang = siang (langit cerah, dinding krem, aksen peach/mint/mentega, matahari & awan).
// Selalu di belakang konten, tidak bisa diketuk, disembunyikan dari pembaca layar.
// Label harga memuat angka (P3: visual memuat relasi matematis). Animasi hanya kedip lampu/awan,
// dan mati pada "kurangi gerakan".
import { memo } from 'react';
import { formatRp } from '../domain/money.js';
import { t } from '../i18n/id.js';
import Mascot from './Mascot.jsx';

const f = (name) => ({ fill: `var(--gs-${name})` });
const s = (name) => ({ stroke: `var(--gs-${name})` });

// warna barang dagangan: sama di kedua tema (barangnya sama, hanya cahayanya yang berbeda)
const GOODS = { apple: '#ef4444', orange: '#fb923c', banana: '#facc15', grape: '#8b5cf6', leaf: '#22c55e', milk: '#f8fafc', bottle: '#38bdf8', soda: '#f472b6', snack: '#fbbf24', snack2: '#34d399' };
const CLOTHES = ['#f472b6', '#38bdf8', '#facc15', '#a78bfa', '#34d399', '#fb923c'];

function PriceTag({ x, y, text, rot = 0 }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <path d="M0 0 h42 v16 h-42 l-6 -8 z" fill="#fff7d6" stroke="#b45309" strokeWidth="1.2" />
      <circle cx="-1" cy="8" r="1.8" fill="#b45309" />
      <text x="21" y="11.8" textAnchor="middle" fontSize="9" fontWeight="800" fill="#b45309" fontFamily="Fredoka, sans-serif">{text}</text>
    </g>
  );
}

// warna kue & roti: sama di kedua tema (kuenya sama, hanya cahayanya yang berbeda)
const CAKE = { cream: '#fff1e6', choc: '#7c3f22', bread: '#e0a96d', crust: '#b7743a', berry: '#ef4444', icing: '#f9a8d4', donut: '#e8a35c', mint: '#a7f3d0', lemon: '#fde68a', plate: '#f1f5f9' };
const SPRINKLE = ['#f472b6', '#38bdf8', '#facc15', '#34d399'];

function Croissant({ x, y }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-12 2 Q-10 -10 0 -10 Q10 -10 12 2 Q6 -2 0 -2 Q-6 -2 -12 2 Z" fill={CAKE.bread} stroke={CAKE.crust} strokeWidth="1" />
      <path d="M-5 -9 l2 7 M0 -10 v8 M5 -9 l-2 7" stroke={CAKE.crust} strokeWidth="1" />
    </g>
  );
}

function Donut({ x, y, icing = CAKE.icing }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="0" cy="0" rx="11" ry="7" fill={CAKE.donut} />
      <ellipse cx="0" cy="-1" rx="9.5" ry="5.5" fill={icing} />
      <ellipse cx="0" cy="-1" rx="3" ry="1.8" fill={CAKE.donut} />
      {[[-5, -3], [4, -4], [6, 0], [-6, 1]].map(([sx, sy], i) => <rect key={i} x={sx} y={sy} width="2.4" height="1" rx="0.5" fill={SPRINKLE[i]} />)}
    </g>
  );
}

function Cupcake({ x, y, top = CAKE.icing }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-8 0 h16 l-2.5 12 h-11 z" fill={CAKE.mint} stroke="#10b981" strokeWidth="0.8" />
      <path d="M-9 0 Q-9 -8 0 -9 Q9 -8 9 0 Z" fill={top} />
      <circle cx="0" cy="-10" r="2.6" fill={CAKE.berry} />
    </g>
  );
}

function Loaf({ x, y }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-14 4 Q-14 -10 0 -10 Q14 -10 14 4 Z" fill={CAKE.bread} stroke={CAKE.crust} strokeWidth="1" />
      <path d="M-7 -6 l3 6 M0 -8 l3 7 M7 -6 l3 6" stroke={CAKE.crust} strokeWidth="1.2" strokeLinecap="round" />
    </g>
  );
}

/** Kue tart bertingkat dengan stroberi. */
function LayerCake({ x, y, scale = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cx="0" cy="2" rx="24" ry="4" fill={CAKE.plate} />
      <rect x="-20" y="-16" width="40" height="18" rx="4" fill={CAKE.choc} />
      <rect x="-20" y="-10" width="40" height="4" fill={CAKE.cream} />
      <rect x="-13" y="-30" width="26" height="15" rx="4" fill={CAKE.icing} />
      <path d="M-13 -26 q3 4 6 0 q3 4 6 0 q3 4 7 0 q3 4 7 0" stroke={CAKE.cream} strokeWidth="2" fill="none" />
      <circle cx="0" cy="-33" r="4" fill={CAKE.berry} />
      <path d="M0 -37 l2 -3" stroke="#22c55e" strokeWidth="1.5" />
    </g>
  );
}

/** Rak etalase bakery: croissant & donat, cupcake, roti. */
function Shelves({ x, y, w }) {
  const rows = [y + 40, y + 82, y + 124];
  return (
    <g>
      {rows.map((ry) => <rect key={ry} x={x + 4} y={ry} width={w - 8} height="5" rx="2" style={f('shelf')} />)}
      <Croissant x={x + 20} y={rows[0] - 4} />
      <Donut x={x + 46} y={rows[0] - 6} />
      <Donut x={x + 72} y={rows[0] - 6} icing={CAKE.lemon} />
      {[0, 1, 2, 3].map((i) => (
        <Cupcake key={i} x={x + 15 + i * ((w - 30) / 3)} y={rows[1] - 12} top={[CAKE.icing, CAKE.cream, CAKE.lemon, CAKE.mint][i]} />
      ))}
      <Loaf x={x + 24} y={rows[2] - 4} />
      <Loaf x={x + 66} y={rows[2] - 4} />
    </g>
  );
}

/** Meja pajang kue di trotoar: nampan roti/donat + label harga. */
function Tray({ x, y, kind, tag }) {
  return (
    <g>
      <rect x={x} y={y} width="96" height="40" rx="4" style={f('crate')} />
      <path d={`M${x} ${y + 13} h96 M${x} ${y + 26} h96`} style={s('crate-line')} strokeWidth="2" />
      <rect x={x - 3} y={y - 4} width="102" height="6" rx="3" fill={CAKE.plate} />
      {kind === 'bread'
        ? [0, 1, 2].map((i) => <Loaf key={i} x={x + 18 + i * 30} y={y - 8} />)
        : [0, 1, 2, 3].map((i) => <Donut key={i} x={x + 14 + i * 23} y={y - 9} icing={[CAKE.icing, CAKE.lemon, CAKE.choc, CAKE.mint][i]} />)}
      <PriceTag x={x + 50} y={y + 18} text={tag} />
    </g>
  );
}


function Plant({ x, y, flip = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip} 1)`}>
      <path d="M-16 0 h32 l-4 30 h-24 z" style={f('pot')} />
      <rect x="-18" y="-4" width="36" height="7" rx="3" style={f('pot')} />
      {[[-12, -30, -30], [0, -40, 0], [12, -30, 30], [-6, -22, -50], [8, -24, 45]].map(([lx, ly, r], i) => (
        <ellipse key={i} cx={lx} cy={ly} rx="7" ry="17" transform={`rotate(${r} ${lx} ${ly + 14})`} style={f('leaf')} />
      ))}
    </g>
  );
}

function Basket({ x, y }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-20 -14 Q0 -40 20 -14" strokeWidth="4" fill="none" strokeLinecap="round" style={s('basket-dark')} />
      <circle cx="-8" cy="-16" r="7" fill={GOODS.apple} />
      <rect x="0" y="-26" width="10" height="16" rx="3" fill={GOODS.bottle} />
      <path d="M-24 -14 H24 L19 12 H-19 Z" style={{ ...f('basket'), ...s('basket-dark') }} strokeWidth="1.5" />
      <path d="M-12 -14 L-10 12 M0 -14 V12 M12 -14 L10 12 M-22 -1 H22" strokeWidth="1.2" opacity="0.7" style={s('basket-dark')} />
    </g>
  );
}

/** Kerangka bangunan bersama: fasad atas berpapan nama, dinding, lampu/bendera, tenda bergaris. */
function Building({ sign, wall, awningA, awningB, children }) {
  const stripes = 8;
  const sw = 260 / stripes;
  return (
    <g>
      {/* fasad atas (papan nama di puncak → tampil di atas kartu Beranda) */}
      <path d="M14 70 Q150 0 286 70 Z" style={f('roof')} />
      <rect x="14" y="60" width="272" height="74" rx="10" style={f(wall)} />
      <rect x="26" y="70" width="248" height="54" rx="14" style={{ ...f('sign'), ...s('sign-border') }} strokeWidth="4" />
      <text x="150" y="106" textAnchor="middle" fontSize={sign.length > 12 ? 22 : 26} fontWeight="700" fontFamily="Fredoka, sans-serif" letterSpacing="1.5" className="gs-sign-text" style={f('sign-text')}>
        {sign}
      </text>
      <rect x="20" y="134" width="260" height="466" style={f(wall)} />
      <rect x="20" y="134" width="260" height="12" style={f('wall-shade')} />
      <rect x="20" y="560" width="260" height="40" style={f('wall-shade')} />
      {/* untaian lampu (malam) / bendera segitiga (siang) */}
      <path d="M20 150 Q85 170 150 152 T280 150" fill="none" strokeWidth="1.5" style={s('string')} />
      {Array.from({ length: 9 }, (_, i) => {
        const lx = 30 + i * 30;
        const ly = 155 + 7 * Math.sin((i / 8) * Math.PI * 2) ** 2;
        return (
          <g key={i}>
            <circle className="gs-night lamp" cx={lx} cy={ly + 4} r="4.2" style={{ ...f('bulb'), animationDelay: `${(i % 3) * 0.6}s` }} />
            <path className="gs-day" d={`M${lx - 7} ${ly} h14 l-7 13 z`} style={f(['flag-a', 'flag-b', 'flag-c'][i % 3])} />
          </g>
        );
      })}
      {/* tenda bergaris + gerigi */}
      {Array.from({ length: stripes }, (_, i) => (
        <g key={i}>
          <rect x={20 + i * sw} y="176" width={sw} height="30" style={f(i % 2 ? awningB : awningA)} />
          <circle cx={20 + i * sw + sw / 2} cy="206" r={sw / 2} style={f(i % 2 ? awningB : awningA)} />
        </g>
      ))}
      {children}
    </g>
  );
}

/** Kanan: BAKERY PLUMIE'S berisi kue; Plum menjaga kasir di sisi luar (paling terlihat). */
function BakeryStore() {
  return (
    <svg className="gs-store gs-right" viewBox="0 0 300 600" preserveAspectRatio="xMidYMax meet">
      <ellipse className="gs-night" cx="150" cy="600" rx="150" ry="18" style={f('glow')} opacity="0.35" />
      <Building sign={t.bakeryName} wall="wall" awningA="awning-a" awningB="awning-b">
        {/* etalase rak kue (sisi dalam) */}
        <rect x="30" y="232" width="104" height="176" rx="10" style={f('frame')} />
        <rect x="36" y="238" width="92" height="164" rx="6" style={f('window')} />
        <rect className="gs-night" x="36" y="238" width="92" height="164" rx="6" style={f('glow')} opacity="0.25" />
        <Shelves x={36} y={238} w={92} />
        <PriceTag x={56} y={412} text={formatRp(3000)} rot={-4} />
        {/* jendela kasir (sisi luar): Kucing Plum + kue tart */}
        <rect x="148" y="226" width="124" height="208" rx="12" style={f('frame')} />
        <rect x="154" y="232" width="112" height="196" rx="8" style={f('inside')} />
        <rect className="gs-night" x="154" y="232" width="112" height="196" rx="8" style={f('glow')} opacity="0.3" />
        <line x1="210" y1="232" x2="210" y2="248" strokeWidth="2" style={s('string')} />
        <path d="M198 258 q12 -18 24 0 z" style={f('lamp-shade')} />
        <circle cx="210" cy="260" r="5" style={f('bulb')} />
        <g transform="translate(168 282)">
          <Mascot mood="wave" size={86} className="gs-plum" />
        </g>
        <rect x="148" y="380" width="124" height="14" rx="5" style={f('counter-top')} />
        <rect x="154" y="394" width="112" height="60" style={f('counter')} />
        <LayerCake x={246} y={380} scale={0.8} />
        <PriceTag x={168} y={410} text="−10%" />
        {/* meja pajang kue di trotoar */}
        <Tray x={30} y={548} kind="donut" tag={formatRp(5000)} />
        <Tray x={150} y={548} kind="bread" tag={formatRp(8000)} />
        <Basket x={128} y={590} />
        <Plant x={268} y={568} flip={-1} />
      </Building>
    </svg>
  );
}


/** Kaos/kemeja tergantung di rel. */
function Shirt({ x, y, color }) {
  return (
    <g>
      <path d={`M${x} ${y - 10} q0 -6 5 -6`} stroke="#94a3b8" strokeWidth="1.5" fill="none" />
      <path d={`M${x - 14} ${y} l8 -6 h12 l8 6 l-5 8 l-3 -2 v26 h-12 v-26 l-3 2 z`} fill={color} stroke="#00000022" strokeWidth="0.8" />
    </g>
  );
}

/** Kiri: toko pakaian. Etalase besar (sisi luar) dengan rel baju + manekin, pintu di sisi dalam. */
function ClothesStore() {
  return (
    <svg className="gs-store gs-left" viewBox="0 0 300 600" preserveAspectRatio="xMidYMax meet">
      <ellipse className="gs-night" cx="150" cy="600" rx="150" ry="18" style={f('glow')} opacity="0.35" />
      <Building sign={t.clothesName} wall="wall-2" awningA="awning-c" awningB="awning-d">
        {/* etalase besar */}
        <rect x="28" y="226" width="150" height="222" rx="12" style={f('frame')} />
        <rect x="34" y="232" width="138" height="210" rx="8" style={f('window')} />
        <rect className="gs-night" x="34" y="232" width="138" height="210" rx="8" style={f('glow')} opacity="0.25" />
        {/* rel baju */}
        <line x1="42" y1="262" x2="164" y2="262" strokeWidth="3" strokeLinecap="round" style={s('frame')} />
        {[0, 1, 2, 3, 4].map((i) => <Shirt key={i} x={56 + i * 24} y={276} color={CLOTHES[i]} />)}
        {/* manekin bergaun */}
        <circle cx="76" cy="340" r="9" style={f('shelf')} />
        <path d="M76 350 l-16 10 l6 6 l-10 50 h40 l-10 -50 l6 -6 z" fill={CLOTHES[0]} />
        <line x1="76" y1="416" x2="76" y2="434" strokeWidth="3" style={s('frame')} />
        {/* tumpukan baju terlipat */}
        {[0, 1, 2].map((i) => (
          <rect key={i} x="112" y={418 - i * 10} width="48" height="10" rx="3" fill={CLOTHES[(i + 3) % CLOTHES.length]} stroke="#00000022" strokeWidth="0.8" />
        ))}
        <PriceTag x={112} y={344} text="−25%" rot={-6} />
        {/* pintu */}
        <rect x="190" y="236" width="84" height="324" rx="8" style={f('frame')} />
        <rect x="196" y="242" width="72" height="318" rx="5" style={f('door')} />
        <rect x="204" y="252" width="56" height="70" rx="5" style={f('window')} />
        <rect className="gs-night" x="204" y="252" width="56" height="70" rx="5" style={f('glow')} opacity="0.3" />
        <circle cx="258" cy="410" r="4" style={f('sign-text')} />
        {/* papan diskon berdiri di trotoar */}
        <path d="M60 600 l18 -78 h52 l18 78" fill="none" strokeWidth="4" style={s('frame')} />
        <rect x="70" y="520" width="68" height="46" rx="6" style={{ ...f('sign'), ...s('sign-border') }} strokeWidth="3" />
        <text x="104" y="540" textAnchor="middle" fontSize="11" fontWeight="800" fontFamily="Fredoka, sans-serif" style={f('sign-text')}>DISKON</text>
        <text x="104" y="558" textAnchor="middle" fontSize="15" fontWeight="800" fontFamily="Fredoka, sans-serif" style={f('sign-text')}>25%</text>
        <PriceTag x={204} y={340} text={formatRp(60000)} />
        <Plant x={32} y={568} />
      </Building>
    </svg>
  );
}

/** Langit selebar layar: malam (bintang, bulan) / siang (matahari, awan). */
function Sky() {
  return (
    <svg className="gs-sky" viewBox="0 0 600 300" preserveAspectRatio="xMidYMin slice">
      <g className="gs-night">
        {[[40, 30], [90, 90], [150, 24], [210, 70], [260, 40], [330, 20], [390, 80], [450, 34], [520, 70], [570, 26], [120, 140], [480, 130], [20, 120], [300, 110]].map(([sx, sy], i) => (
          <circle key={i} cx={sx} cy={sy} r={i % 3 ? 1.4 : 2.2} className="lamp" style={{ ...f('star'), animationDelay: `${(i % 4) * 0.5}s` }} />
        ))}
        {/* bulan: kanan di laptop, kiri atas di HP (kanan atas HP ada tombol suara) */}
        {[[440, 62, 'gs-wide'], [168, 40, 'gs-narrow']].map(([mx, my, c]) => (
          <g key={c} className={c}>
            <circle cx={mx} cy={my} r="22" style={f('moon')} />
            <circle cx={mx + 10} cy={my - 6} r="18" style={f('sky-top')} />
          </g>
        ))}
      </g>
      <g className="gs-day">
        {[[440, 62, 'gs-wide'], [168, 40, 'gs-narrow']].map(([mx, my, c]) => (
          <g key={c} className={c}>
            <circle cx={mx} cy={my} r="30" style={f('sun-glow')} />
            <circle cx={mx} cy={my} r="19" style={f('sun')} />
          </g>
        ))}
        {[[110, 50, 0.8], [250, 30, 0.6], [360, 90, 0.7], [540, 40, 0.8], [40, 100, 0.6]].map(([cx, cy, k], i) => (
          <g key={i} transform={`translate(${cx} ${cy}) scale(${k})`}>
            <g className="gs-cloud" style={{ animationDelay: `${-i * 2}s` }}>
              <ellipse cx="0" cy="0" rx="34" ry="13" style={f('cloud')} />
              <ellipse cx="-14" cy="-8" rx="16" ry="13" style={f('cloud')} />
              <ellipse cx="12" cy="-11" rx="18" ry="15" style={f('cloud')} />
            </g>
          </g>
        ))}
      </g>
    </svg>
  );
}

/**
 * Latar semua halaman. home = tata letak Beranda (papan nama di sela konten Beranda);
 * calm = sedang mengerjakan soal → bangunan disembunyikan, langit diredupkan (aturan lama Decor, EL03/DS03).
 */
// Isi gambar statis → digambar SEKALI saja; pindah halaman hanya mengganti kelas pembungkus
// (hemat daya di HP kelas bawah).
const SkyGround = memo(function SkyGround() {
  return (
    <>
      <Sky />
      <div className="gs-ground" />
    </>
  );
});
const Stores = memo(function Stores() {
  return (
    <>
      <ClothesStore />
      <BakeryStore />
    </>
  );
});

export default function GroceryBackdrop({ home = false, calm = false }) {
  return (
    <div className={`decor grocery ${home ? 'is-home' : ''} ${calm ? 'calm' : ''}`} aria-hidden="true">
      <SkyGround />
      {/* sedang mengerjakan soal: bangunan tidak dimuat sama sekali (lebih ringan dari sekadar disembunyikan) */}
      {!calm && <Stores />}
      {/* lapisan tipis warna langit di HP: toko jadi suasana, tidak bersaing dengan tombol & teks */}
      <div className="gs-veil" />
    </div>
  );
}
