// Panggung Three.js hemat daya: render hanya saat ada animasi/interaksi (render on demand).
import * as THREE from 'three';

export function cssColor(name) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(`--c-${name}`).trim();
  return new THREE.Color(v || '#888888');
}

const ease = (k) => 1 - Math.pow(1 - k, 3);

export function makeStage(container, { cameraPos = [0, 2.4, 6.5], target = [0, 0.5, 0], maxTilt = 0.44 } = {}) {
  const w = container.clientWidth || 300;
  const h = container.clientHeight || 200;
  const renderer = new THREE.WebGLRenderer({ antialias: window.devicePixelRatio <= 2, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(w, h);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 100);
  camera.position.set(...cameraPos);
  camera.lookAt(...target);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.8));
  const dir = new THREE.DirectionalLight(0xffffff, 1.4);
  dir.position.set(3, 6, 5);
  scene.add(dir);

  const root = new THREE.Group();
  scene.add(root);

  const render = () => renderer.render(scene, camera);

  // ---- tween sederhana ----
  const tweens = new Set();
  let raf = 0;
  const tick = (now) => {
    for (const tw of [...tweens]) {
      const k = Math.min(1, (now - tw.start) / tw.dur);
      tw.fn(ease(k));
      if (k >= 1) {
        tweens.delete(tw);
        tw.done();
      }
    }
    render();
    raf = tweens.size ? requestAnimationFrame(tick) : 0;
  };
  const tween = (fn, dur = 600) =>
    new Promise((done) => {
      tweens.add({ fn, dur, start: performance.now(), done });
      if (!raf) raf = requestAnimationFrame(tick);
    });

  // ---- putar terbatas (±25°) + ketuk ----
  const ray = new THREE.Raycaster();
  let drag = null;
  let tapHandler = null;
  const el = renderer.domElement;
  el.style.touchAction = 'pan-y';
  const onDown = (e) => (drag = { x: e.clientX, y: e.clientY, rot: root.rotation.y, moved: false });
  const onMove = (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (Math.abs(dx) > 6) drag.moved = true;
    root.rotation.y = Math.max(-maxTilt, Math.min(maxTilt, drag.rot + dx * 0.01));
    render();
  };
  const onUp = (e) => {
    if (drag && !drag.moved && tapHandler) {
      const r = el.getBoundingClientRect();
      const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(root.children, true)[0];
      tapHandler(hit?.object ?? null);
    }
    drag = null;
  };
  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointerleave', () => (drag = null));

  const ro = new ResizeObserver(() => {
    const nw = container.clientWidth;
    const nh = container.clientHeight;
    if (!nw || !nh) return;
    renderer.setSize(nw, nh);
    camera.aspect = nw / nh;
    camera.updateProjectionMatrix();
    render();
  });
  ro.observe(container);

  // ---- pemantau fps: bila animasi < 24 fps, minta beralih ke 2D ----
  function measureFps(onSlow) {
    let frames = 0;
    const t0 = performance.now();
    const loop = (now) => {
      frames++;
      render();
      if (now - t0 < 1500) requestAnimationFrame(loop);
      else if ((frames * 1000) / (now - t0) < 24) onSlow();
    };
    requestAnimationFrame(loop);
  }

  function dispose() {
    ro.disconnect();
    if (raf) cancelAnimationFrame(raf);
    tweens.clear();
    scene.traverse((o) => {
      o.geometry?.dispose();
      const m = o.material;
      if (Array.isArray(m)) m.forEach((x) => x.dispose());
      else m?.dispose();
    });
    renderer.dispose();
    el.remove();
  }

  return {
    THREE,
    scene,
    camera,
    root,
    render,
    tween,
    measureFps,
    dispose,
    onTap: (fn) => (tapHandler = fn),
  };
}
