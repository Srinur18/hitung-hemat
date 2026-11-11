// Balok harga yang terbagi segmen: dipakai untuk label harga (priceTag), diskon bertingkat
// (stacked), dan model batang soal terbalik (barModel). Tanpa dekorasi: hanya besaran.
import { cssColor, makeStage } from './base.js';

const W = 4.6; // panjang balok = 100% harga awal
const H = 0.7;
const D = 0.7;

export function create(container, { segments, product = false, onTap, onSlow }) {
  const st = makeStage(container);
  const { THREE, root } = st;
  let meshes = [];
  let sig = '';

  if (product) {
    // Kotak barang sederhana (bukan gambar dekoratif): penanda "barang yang diberi label harga".
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 1.6, 1.2),
      new THREE.MeshStandardMaterial({ color: cssColor('surface-3d'), roughness: 0.9 }),
    );
    box.position.set(0, 1.55, -0.6);
    root.add(box);
    const string = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.8),
      new THREE.MeshStandardMaterial({ color: cssColor('muted') }),
    );
    string.position.set(0, 0.85, -0.2);
    string.rotation.x = 0.5;
    root.add(string);
  }

  function build(segs) {
    meshes.forEach((m) => {
      root.remove(m);
      m.geometry.dispose();
      m.material.dispose();
    });
    let x = -W / 2;
    meshes = segs.map((s) => {
      const w = Math.max(0.001, s.frac * W);
      const mat = new THREE.MeshStandardMaterial({ color: cssColor(s.color), roughness: 0.6, transparent: true });
      const m = new THREE.Mesh(new THREE.BoxGeometry(w - 0.03, H, D), mat);
      m.position.set(x + w / 2, 0.2, 0);
      m.userData = { key: s.key, baseY: 0.2 };
      x += w;
      root.add(m);
      return m;
    });
    sig = segs.map((s) => s.key + s.frac.toFixed(4)).join('|');
  }

  function apply(segs, animate = true) {
    const newSig = segs.map((s) => s.key + s.frac.toFixed(4)).join('|');
    if (newSig !== sig) build(segs);
    const from = meshes.map((m) => ({ y: m.position.y, o: m.material.opacity, c: m.material.color.clone() }));
    const to = segs.map((s, i) => ({
      y: meshes[i].userData.baseY + (s.out ? 1.1 : 0),
      o: s.out ? 0.18 : s.ghost ? 0.35 : 1,
      c: cssColor(s.color),
    }));
    const step = (k) =>
      meshes.forEach((m, i) => {
        m.position.y = from[i].y + (to[i].y - from[i].y) * k;
        m.material.opacity = from[i].o + (to[i].o - from[i].o) * k;
        m.material.color.copy(from[i].c).lerp(to[i].c, k);
      });
    if (animate) return st.tween(step, 650);
    step(1);
    st.render();
    return Promise.resolve();
  }

  build(segments);
  apply(segments, false);
  st.onTap(() => onTap?.());
  if (onSlow) st.measureFps(onSlow);

  return {
    update: ({ segments: s }) => apply(s, true),
    dispose: st.dispose,
  };
}
