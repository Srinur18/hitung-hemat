// @vitest-environment jsdom
// Teman Mikir: paritas mesin langkah dengan Python, klien server/offline, dan alur di layar soal.
import 'fake-indexeddb/auto';
import { cleanup, configure, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import curriculum from '../../shared/content/curriculum.json';
import tutor from '../../shared/content/tutor.json';
import vectors from '../../shared/test-vectors.json';
import { askTutor } from '../src/data/tutor.js';
import { buildProblem } from '../src/domain/problems.js';
import { planTurn, roleChips, TurnError } from '../src/domain/tutor.js';
import ProblemSolver from '../src/features/ProblemSolver.jsx';

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = () => null;
  window.scrollTo = () => {};
});
afterEach(cleanup);
configure({ asyncUtilTimeout: 5000 });

const click = (el) => fireEvent.click(el);
const btn = (name) => screen.getByRole('button', { name });
const bubble = () => document.querySelector('.tutor-bubble');
const chipLabels = () => [...document.querySelectorAll('.tutor-chips .chip')].map((b) => b.textContent);

function typeNumber(container, n) {
  const keys = [...container.querySelector('.numpad').querySelectorAll('button')];
  for (let i = 0; i < 12; i++) click(keys.find((b) => b.textContent === '⌫'));
  for (const d of String(n)) click(keys.find((b) => b.textContent === d));
}

describe('mesin langkah: paritas dengan Python (shared/test-vectors.json)', () => {
  it('vektor tutor tersedia', () => expect(vectors.tutor.length).toBeGreaterThan(100));
  it.each(vectors.tutor.map((v, i) => [i, v]))('kasus %i identik', (_i, { input, out }) => {
    expect(planTurn(tutor, input)).toEqual(out);
  });
  it('menolak masukan tidak sah', () => {
    expect(() => planTurn(tutor, { role: 'result', event: 'hapus' })).toThrow(TurnError);
    expect(() => planTurn(tutor, { role: 'result', event: 'chip', move: 'orientation', chip_id: 'x' })).toThrow(TurnError);
  });
  it('setiap balasan memuat paling banyak 3 pilihan (P2)', () => {
    for (const v of vectors.tutor) expect(v.out.chips.length).toBeLessThanOrEqual(3);
    for (const r of Object.keys(tutor.roleLabels)) expect(roleChips(tutor, r).length).toBeLessThanOrEqual(3);
  });
});

const REQ = { templateId: 'm1-t1', seed: 1, stepId: 's1', role: 'discount', stepIndex: 0, phase: 'solve', event: 'open' };
const okJson = (body) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });

describe('klien Teman Mikir', () => {
  it('tanpa server → teks cadangan offline', async () => {
    const fetchImpl = vi.fn();
    const r = await askTutor(REQ, { apiUrl: '', fetchImpl });
    expect(r.source).toBe('offline');
    expect(r.text).toBe(tutor.moves.orientation.fallback);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('memakai kalimat server dan tidak mengirim identitas siswa', async () => {
    const fetchImpl = vi.fn(() => okJson({ move: 'orientation', level: 1, text: 'Lihat soalnya dulu, ya.', source: 'gemini', reason: null }));
    const r = await askTutor(REQ, { apiUrl: 'http://srv', fetchImpl });
    expect(r).toMatchObject({ move: 'orientation', text: 'Lihat soalnya dulu, ya.', source: 'gemini' });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('http://srv/api/v1/tutor/turn');
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ template_id: 'm1-t1', seed: 1, step_id: 's1', event: 'open', level: 1 });
    expect(Object.keys(body)).not.toContain('student_code');
  });

  it('galat, versi berbeda, atau lambat → teks cadangan', async () => {
    const bad = await askTutor(REQ, { apiUrl: 'http://srv', fetchImpl: () => Promise.resolve({ ok: false, status: 500 }) });
    expect(bad).toMatchObject({ source: 'offline', reason: 'http_500' });
    const net = await askTutor(REQ, { apiUrl: 'http://srv', fetchImpl: () => Promise.reject(new TypeError('x')) });
    expect(net.reason).toBe('network');
    const skew = await askTutor(REQ, { apiUrl: 'http://srv', fetchImpl: () => okJson({ move: 'planning', level: 1, text: 'x' }) });
    expect(skew.reason).toBe('mismatch');
    const slow = (_u, init) =>
      new Promise((_res, rej) => init.signal.addEventListener('abort', () => rej(Object.assign(new Error('a'), { name: 'AbortError' }))));
    const late = await askTutor(REQ, { apiUrl: 'http://srv', fetchImpl: slow, timeoutMs: 20 });
    expect(late).toMatchObject({ source: 'offline', reason: 'timeout', text: tutor.moves.orientation.fallback });
  });

  it('chip penutup tidak memanggil server', async () => {
    const fetchImpl = vi.fn();
    const r = await askTutor({ ...REQ, event: 'chip', move: 'execute', chipId: 'ex_go' }, { apiUrl: 'http://srv', fetchImpl });
    expect(r.close).toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('Teman Mikir di layar soal (offline)', () => {
  const problem = () => buildProblem(curriculum, 'm1-t1', 1);

  it('mediasi bertahap: orientasi → peran → alat bantu, tanpa menyebut jawaban', async () => {
    const p = problem();
    const { container } = render(
      <ProblemSolver problem={p} moduleId="M1" sceneKind={null} mode="independent" level={0} onDone={() => {}} />,
    );
    // maksimal 3 tombol aksi utama (P2)
    expect(container.querySelectorAll('.actions .btn').length).toBeLessThanOrEqual(3);
    click(btn(/Teman Mikir/));
    await waitFor(() => expect(bubble().textContent).toBe(tutor.moves.orientation.fallback));
    expect(chipLabels()).toEqual(['Aku sudah tahu', 'Bingung pilih angka', 'Aku bingung']);

    click(btn('Aku sudah tahu'));
    await waitFor(() => expect(bubble().textContent).toBe(tutor.moves.transformation.fallback));
    expect(chipLabels()).toEqual(['Besar diskon (Rp)', 'Harga akhir', 'Aku bingung']);

    click(btn('Harga akhir')); // salah: langkah 1 mencari besar diskon
    await waitFor(() => expect(bubble().textContent).toBe(tutor.moves.transformation_retry.fallback));
    click(btn('Besar diskon (Rp)'));
    await waitFor(() => expect(bubble().textContent).toBe(`Tepat! ${tutor.moves.planning.fallback}`));

    click(btn('Kartu rumus'));
    await waitFor(() => expect(bubble().textContent).toBe(tutor.moves.execute.fallback));
    expect(document.querySelector('.sheet details.formula[open]')).toBeTruthy();
    // tidak ada angka jawaban di sheet
    expect(document.querySelector('.sheet').textContent).not.toMatch(/2\.000(?!\d)/);
    click(btn('Oke, aku coba'));
    await waitFor(() => expect(bubble()).toBeNull());
  });

  it('setelah jawaban salah: umpan balik miskonsepsi, eskalasi ke petunjuk, lalu refleksi di akhir soal', async () => {
    const p = problem();
    const onDone = vi.fn();
    const { container } = render(
      <ProblemSolver problem={p} moduleId="M1" sceneKind={null} mode="independent" level={0} onDone={onDone} />,
    );
    typeNumber(container, 1);
    click(btn('Periksa'));
    click(btn(/Teman Mikir/));
    await waitFor(() => expect(bubble().textContent).toBe(tutor.mc.NONE.fallback));
    click(btn('Kenapa begitu?'));
    await waitFor(() => expect(bubble().textContent).toBe(tutor.mc.NONE.why));
    click(btn('Butuh bantuan')); // T1 → T2 alat bantu
    await waitFor(() => expect(bubble().textContent).toBe(tutor.moves.tool.fallback));
    expect(document.querySelector('.sheet .boxes')).toBeTruthy();
    click(btn('Masih bingung')); // T2 → T3 petunjuk
    await waitFor(() => expect(bubble().textContent).toBe(tutor.moves.hint.fallback));
    expect(screen.getByText('Petunjuk 1')).toBeTruthy();
    click(btn('Aku coba lagi'));
    await waitFor(() => expect(bubble()).toBeNull());

    typeNumber(container, p.vars.disc);
    click(btn('Periksa'));
    expect(await screen.findByText('Langkah 2 dari 2')).toBeTruthy();
    typeNumber(container, p.vars.final);
    click(btn('Periksa'));
    expect(await screen.findByText('Cek kewajaran')).toBeTruthy();
    click(btn('Ya'));
    // R1: cek besar hasil lewat jalan lain sebelum soal selesai
    expect(await screen.findByText('Cek besar hasil')).toBeTruthy();
    typeNumber(container, p.vars.final);
    click(btn('Periksa'));
    click(await screen.findByRole('button', { name: 'Lanjut' }));
    // refleksi muncul karena Teman Mikir dipakai; soal baru selesai setelah sheet ditutup
    await waitFor(() => expect(bubble().textContent).toBe(`Tepat! ${tutor.moves.reflection.fallback}`));
    expect(onDone).not.toHaveBeenCalled();
    click(btn('Diagram Kotak'));
    await waitFor(() => expect(bubble().textContent).toBe(tutor.moves.transcendence.fallback));
    click(btn('Lewati'));
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
  });

  it('tanpa Teman Mikir, alur lama tidak berubah (tanpa refleksi tambahan)', async () => {
    const p = problem();
    const onDone = vi.fn();
    const { container } = render(
      <ProblemSolver problem={p} moduleId="M1" sceneKind={null} mode="independent" level={0} onDone={onDone} />,
    );
    typeNumber(container, p.vars.disc);
    click(btn('Periksa'));
    typeNumber(container, p.vars.final);
    click(btn('Periksa'));
    click(await screen.findByRole('button', { name: 'Ya' }));
    // R1: cek besar hasil lewat jalan lain sebelum soal selesai
    typeNumber(container, p.vars.final);
    click(btn('Periksa'));
    click(await screen.findByRole('button', { name: 'Lanjut' }));
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(bubble()).toBeNull();
  });
});
