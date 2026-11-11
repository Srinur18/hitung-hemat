// Versi 2D (SVG) setiap ilustrasi, dengan informasi yang sama dengan versi 3D.
import { segmentsFor } from './segments.js';
import { formatRp } from '../domain/money.js';

const C = (name) => `var(--c-${name})`;

function Bars({ segments, onTap }) {
  let x = 0;
  return (
    <svg viewBox="0 0 300 90" role="img" aria-label="Balok harga" onClick={onTap}>
      <rect x="0" y="40" width="300" height="36" fill="none" stroke={C('muted')} strokeDasharray="4 3" rx="4" />
      {segments.map((s) => {
        const w = s.frac * 300;
        const el = (
          <rect
            key={s.key}
            x={x + 1}
            y={s.out ? 6 : 40}
            width={Math.max(0, w - 2)}
            height="36"
            rx="4"
            fill={C(s.color)}
            opacity={s.out ? 0.25 : s.ghost ? 0.35 : 1}
            style={{ transition: 'all .5s' }}
          />
        );
        x += w;
        return el;
      })}
    </svg>
  );
}

function Cubes({ pct }) {
  const units = pct / 100;
  return (
    <svg viewBox="0 0 200 200" role="img" aria-label={`${units} dari 100 kotak`}>
      {Array.from({ length: 100 }, (_, i) => {
        const on = i < Math.floor(units);
        const partial = i === Math.floor(units) && units % 1 > 0;
        return (
          <g key={i}>
            <rect x={(i % 10) * 20 + 1} y={Math.floor(i / 10) * 20 + 1} width="18" height="18" rx="2" fill={C('price')} opacity={0.35} />
            {(on || partial) && (
              <rect
                x={(i % 10) * 20 + 1}
                y={Math.floor(i / 10) * 20 + 1}
                width={partial ? 18 * (units % 1) : 18}
                height="18"
                rx="2"
                fill={C('discount')}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

function Compare({ a, b, labelA = 'Toko A', labelB = 'Toko B' }) {
  const max = Math.max(a ?? 0, b ?? 0) || 1;
  const col = (v, x, label) => {
    const h = v ? (v / max) * 120 : 0;
    return (
      <g>
        <rect x={x} y={140 - h} width="70" height={h} rx="4" fill={C('result')} opacity={v ? 1 : 0.2} />
        <text x={x + 35} y="158" textAnchor="middle" fontSize="13" fill={C('text')}>{label}</text>
        {v ? <text x={x + 35} y={134 - h} textAnchor="middle" fontSize="12" fill={C('text')}>{formatRp(v)}</text> : null}
      </g>
    );
  };
  return (
    <svg viewBox="0 0 240 165" role="img" aria-label="Perbandingan total bayar">
      {col(a, 35, labelA)}
      {col(b, 135, labelB)}
    </svg>
  );
}

export default function Fallback2D({ kind, params, onTap }) {
  if (kind === 'hundredCubes') return <Cubes pct={params.pct ?? 0} />;
  if (kind === 'compare') return <Compare a={params.totalA} b={params.finalB} />;
  return <Bars segments={segmentsFor(kind, params)} onTap={onTap} />;
}
