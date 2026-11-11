// 100 kubus (10×10) = 100%. Kubus diskon berwarna dan terangkat. 1 draw call (InstancedMesh).
// Persen berkoma (12,5%) ditampilkan dengan satu kubus yang terpotong sebagian.
import { cssColor, makeStage } from './base.js';

const N = 10;
const GAP = 0.36;

export function create(container, { pct, onSlow }) {
  const st = makeStage(container, { cameraPos: [0, 4.6, 4.6], target: [0, 0, 0] });
  const { THREE, root } = st;
  const geo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.7 });
  const mesh = new THREE.InstancedMesh(geo, mat, N * N);
  root.add(mesh);
  const dummy = new THREE.Object3D();
  const cPrice = cssColor('price');
  const cDisc = cssColor('discount');
  let lift = new Array(N * N).fill(0);
  let scaleX = new Array(N * N).fill(1);

  function layout() {
    for (let i = 0; i < N * N; i++) {
      const r = Math.floor(i / N);
      const c = i % N;
      dummy.position.set((c - (N - 1) / 2) * GAP, lift[i], (r - (N - 1) / 2) * GAP);
      dummy.scale.set(scaleX[i], 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  function apply(bp, animate) {
    const units = bp / 100; // 12,5% → 12,5 kubus
    const full = Math.floor(units);
    const part = units - full;
    const fromLift = [...lift];
    const toLift = Array.from({ length: N * N }, (_, i) => (i < full || (i === full && part > 0) ? 0.35 : 0));
    scaleX = Array.from({ length: N * N }, (_, i) => (i === full && part > 0 ? part : 1));
    for (let i = 0; i < N * N; i++) {
      mesh.setColorAt(i, i < full || (i === full && part > 0) ? cDisc : cPrice);
    }
    mesh.instanceColor.needsUpdate = true;
    const step = (k) => {
      lift = fromLift.map((f, i) => f + (toLift[i] - f) * k);
      layout();
    };
    if (animate) return st.tween(step, 500);
    step(1);
    st.render();
    return Promise.resolve();
  }

  // setColorAt sekali agar instanceColor terbentuk sebelum apply
  mesh.setColorAt(0, cPrice);
  apply(pct, false);
  if (onSlow) st.measureFps(onSlow);

  return {
    update: ({ pct: p }) => apply(p, true),
    dispose: st.dispose,
  };
}
