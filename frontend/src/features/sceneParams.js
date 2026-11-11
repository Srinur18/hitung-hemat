// Angka untuk ilustrasi, hanya dari besaran yang SUDAH diketahui siswa (tidak membocorkan jawaban).
export function sceneParams(kind, problem, known, solved) {
  const v = problem.vars;
  const k = (name) => (known.has(name) ? v[name] : undefined);
  switch (kind) {
    case 'priceTag':
      return { pct: v.pct ?? v.p1, step: Math.min(2, solved) };
    case 'hundredCubes':
      return { pct: v.pct };
    case 'stacked':
      return { p1: v.p1, p2: v.p2, step: solved };
    case 'barModel':
      return { pct: v.pct, step: solved };
    case 'compare':
      return { totalA: k('totalA'), finalB: k('finalB') };
    default:
      return {};
  }
}
