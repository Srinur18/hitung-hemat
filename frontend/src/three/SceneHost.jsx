// Tempat ilustrasi: memuat Three.js secara malas, dengan cadangan 2D otomatis bila
// WebGL tidak tersedia, perangkat lambat (< 24 fps), atau pengguna memilih "kurangi gerakan".
import { useEffect, useRef, useState } from 'react';
import Fallback2D from './Fallback2D.jsx';
import { captionFor, segmentsFor } from './segments.js';
import { logEvent } from '../data/events.js';

const LOADERS = {
  bars: () => import('./scenes/bars.js'),
  hundredCubes: () => import('./scenes/hundredCubes.js'),
};
const SCENE_OF = { priceTag: 'bars', stacked: 'bars', barModel: 'bars', hundredCubes: 'hundredCubes' };

function webglOk() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch {
    return false;
  }
}
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function sceneProps(kind, params) {
  return kind === 'hundredCubes' ? { pct: params.pct ?? 0 } : { segments: segmentsFor(kind, params) };
}

/**
 * @param {{kind:'priceTag'|'hundredCubes'|'stacked'|'barModel'|'compare', params:object, onTap?:()=>void, height?:number}} props
 */
export default function SceneHost({ kind, params, onTap, height = 190 }) {
  const ref = useRef(null);
  const api = useRef(null);
  const tapRef = useRef(onTap);
  tapRef.current = onTap;
  const [mode, setMode] = useState(() => (SCENE_OF[kind] && webglOk() && !reducedMotion() ? '3d' : '2d'));

  // buat scene sekali per jenis
  useEffect(() => {
    if (mode !== '3d') return undefined;
    let cancelled = false;
    LOADERS[SCENE_OF[kind]]()
      .then(({ create }) => {
        if (cancelled || !ref.current) return;
        api.current = create(ref.current, {
          ...sceneProps(kind, params),
          product: kind === 'priceTag',
          onTap: () => {
            logEvent('scene_interact', { payload: { scene: kind, action: 'tap', mode: '3d' } });
            tapRef.current?.();
          },
          onSlow: () => setMode('2d'),
        });
      })
      .catch(() => setMode('2d'));
    return () => {
      cancelled = true;
      api.current?.dispose();
      api.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, mode]);

  // perbarui saat angka/langkah berubah
  useEffect(() => {
    api.current?.update(sceneProps(kind, params));
  }, [kind, JSON.stringify(params)]); // eslint-disable-line react-hooks/exhaustive-deps

  const caption = captionFor(kind, params);
  return (
    <figure className="scene" aria-label="Ilustrasi">
      {mode === '3d' ? (
        <div ref={ref} className="scene-canvas" style={{ height }} />
      ) : (
        <div className="scene-svg" style={{ height }}>
          <Fallback2D kind={kind} params={params} onTap={onTap} />
        </div>
      )}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}
