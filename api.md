# API — HitungHemat

Fase 1 berjalan **offline penuh**, jadi "API" di sini terutama berarti **kontrak modul internal** (`src/domain/`) yang dipanggil UI, ditambah skema konten dan event. Bagian §6 berisi rancangan REST untuk fase 2 (sinkronisasi & dashboard guru), dengan status TBD.

## 1. Konvensi

- Uang: `Rupiah = number` (bilangan bulat, ≥ 0).
- Persen: `Bp = number` (basis point; `25% = 2500`, `12,5% = 1250`).
- Fungsi bersifat **eksak**: mengembalikan bilangan bulat, atau `null`/`None` bila hasil tidak bulat atau tidak sah. Generator menolak undian semacam itu, sehingga soal tidak pernah butuh pembulatan.
- Semua fungsi `domain/` murni dan sinkron. Ada dua implementasi yang identik: `backend/app/domain/*.py` (snake_case) dan `frontend/src/domain/*.js` (camelCase). Nama di registri `FN` sama di keduanya.

## 2. `domain/money.ts`

```ts
export type Rupiah = number;
export type Bp = number;

export function pctToBp(pct: number): Bp;            // 12.5 → 1250
export function bpToLabel(bp: Bp): string;            // 1250 → "12,5%"
export function formatRp(v: Rupiah): string;          // 120000 → "Rp120.000"
export function parseRp(input: string): Rupiah | null; // "120.000" → 120000
export function bpToDecimalLabel(bp: Bp): string;     // 1250 → "0,125"
```

## 3. `domain/discount.ts`

```ts
export function discountAmount(price: Rupiah, pct: Bp): Rupiah;
// = round(price * pct / 10000)

export function finalPrice(price: Rupiah, pct: Bp): Rupiah;
// = price - discountAmount(price, pct)

export function stackedFinalPrice(price: Rupiah, pcts: Bp[]): Rupiah;
// diskon diterapkan berurutan pada sisa harga

export function effectiveBp(pcts: Bp[]): Bp;
// 1 - Π(1 - p_i); [5000, 2000] → 6000 (bukan 7000)

export function originalFromFinal(final: Rupiah, pct: Bp): Rupiah;
// = final * 10000 / (10000 - pct)

export function percentFromPrices(original: Rupiah, final: Rupiah): Bp;
// = (original - final) * 10000 / original   ← pembanding SELALU harga awal (MC6)

export function withExtras(final: Rupiah, opts: { taxBp?: Bp; shipping?: Rupiah }): Rupiah;
// pajak dihitung dari harga setelah diskon, lalu ongkir ditambahkan (langkah terpisah di wizard)

export interface Offer { label: string; price: Rupiah; pcts: Bp[]; flatCut?: Rupiah; minSpend?: Rupiah; taxBp?: Bp; shipping?: Rupiah }
export function compareOffers(offers: Offer[]): { best: number; finals: Rupiah[] };
```

Contoh uji wajib:

| Fungsi | Masukan | Keluaran |
|---|---|---|
| `discountAmount` | 120000, 2500 | 30000 |
| `finalPrice` | 120000, 2500 | 90000 |
| `discountAmount` | 80000, 1250 | 10000 |
| `effectiveBp` | [5000, 2000] | 6000 |
| `stackedFinalPrice` | 200000, [5000, 2000] | 80000 |
| `originalFromFinal` | 90000, 2500 | 120000 |
| `percentFromPrices` | 100000, 80000 | 2000 |
| `withExtras` | 80000, {taxBp: 1100, shipping: 10000} | 98800 |

## 4. Skema Konten

### 4.1 Modul (`content/modules/m3.json`)

```json
{
  "id": "M3",
  "title": "Harga Akhir",
  "prerequisites": ["M2"],
  "glossary": ["harga-awal", "harga-akhir"],
  "stages": [
    { "kind": "worked",      "problems": ["m3-w1"] },
    { "kind": "completion",  "problems": ["m3-c1", "m3-c2"] },
    { "kind": "independent", "templates": ["m3-t1"], "count": 4 },
    { "kind": "transfer",    "templates": ["m3-x1"], "count": 1 },
    { "kind": "explain",     "cards": ["m3-e1"] }
  ]
}
```

### 4.2 Template Soal

```json
{
  "id": "m3-t1",
  "process": "employ",
  "contextPool": ["baju", "sepatu", "tas", "HP"],
  "vars": {
    "price": { "from": 50000, "to": 300000, "step": 10000 },
    "pct":   { "choices": [1000, 2000, 2500, 3000, 5000] }
  },
  "text": "{{item}} seharga {{price:price}} diskon {{pct:percent}}. Berapa harga yang dibayar?",
  "steps": [
    { "id": "s1", "label": "Cari besar diskon", "role": "discount",
      "answer": "discountAmount(price,pct)",
      "hints": ["m3-h1", "m3-h2", "m3-h3"] },
    { "id": "s2", "label": "Hitung harga akhir", "role": "result",
      "answer": "finalPrice(price,pct)",
      "hints": ["m3-h4", "m3-h5", "m3-h6"] }
  ],
  "sanityCheck": "result < price",
  "distractors": []
}
```

- `{{price:price}}` = nilai + peran warna (`price` | `percent` | `discount` | `result`).
- `process` ∈ `formulate` | `employ` | `interpret` | `reason` (tag literasi PISA).
- `answer` hanya boleh merujuk fungsi yang terdaftar di `domain/discount.ts` (tanpa `eval` bebas; diparse oleh whitelist).

### 4.3 `domain/problems`

```ts
export interface Problem {
  id: string; templateId: string; process: LiteracyProcess;
  text: Segment[];                 // teks + angka bertag peran
  vars: Record<string, number>;
  steps: Step[];
}
export function instantiate(t: Template, seed: number): Problem; // deterministik
export function validate(t: Template): string[];                // daftar error (hasil tidak bulat, dll.)
```

## 5. Mesin Petunjuk, Miskonsepsi, Penguasaan

```ts
// hints.ts
export const AUTO_HINT_AFTER = 2;
export interface HintState { attempts: number; level: 0|1|2|3|4; autoOffered: boolean }
export function onWrong(s: HintState, mastery: MasteryLevel): { state: HintState; offerHint: boolean };
export function nextHint(s: HintState, step: Step): { state: HintState; hintId: string | null };

// misconceptions.ts
export type MC = 'MC1'|'MC2'|'MC3'|'MC4'|'MC5'|'MC6'|null;
export function classify(problem: Problem, step: Step, answer: Rupiah): MC;
// MC1: answer == discountAmount saat diminta harga akhir
// MC2: answer == finalPrice(price, sum(pcts))
// MC3: answer == discountAmount dengan bp ×10 atau ÷10
// MC4: answer == final * (10000 - pct) / 10000 pada soal terbalik
// MC5: answer > price pada soal diskon
// MC6: answer == (original - final) * 10000 / final pada soal cari persen diskon

// mastery.ts
export type MasteryLevel = 0|1|2|3;
export function updateMastery(history: AttemptSummary[]): MasteryLevel;
export function isModuleMastered(history: AttemptSummary[]): boolean;
```

## 6. Event Penelitian (log lokal)

Semua event disimpan di tabel `events` dan bisa diekspor ke CSV.

```ts
interface ResearchEvent {
  id?: number;
  studentCode: string;       // "S01" — tanpa nama
  sessionId: string;         // uuid per pembukaan aplikasi
  ts: string;                // ISO 8601
  type: EventType;
  moduleId?: string; problemId?: string; stepId?: string;
  payload: Record<string, unknown>;
  synced: 0 | 1;
}
```

| `type` | `payload` |
|---|---|
| `session_start` / `session_end` | `{ appVersion, device }` |
| `assessment_answer` | `{ kind: 'pre'\|'post'\|'literacy', itemId, process, correct }`; untuk `literacy` juga `stepId, answer, via ('key'\|'ecf'\|null), points` |
| `problem_start` | `{ stage, process, seed }` |
| `answer_submit` | `{ answer, correct, mc, attempt, ms }` — `mc` bisa `'CALC'` (salah hitung persen, R2); di ringkasan peneliti dihitung terpisah sebagai `calc_errors`, bukan miskonsepsi |
| `hint_open` | `{ level, auto: boolean, via?: 'tutor' }` |
| `mark_numbers` | `{ marked: [{value, role}], correct }` (Mode Tandai) |
| `sanity_check` | `{ kind: 'direction', choice, correct }` lalu (R1) `{ kind: 'magnitude', answer, correct, attempt }` untuk cek besar hasil lewat jalan lain |
| `explain_submit` | `{ order: string[], correct, reasonId }` |
| `scene_interact` | `{ scene, action, mode: '3d'\|'2d' }` |
| `effort_rating` | `{ value: 1..9, afterStage }` |
| `mastery_change` | `{ from, to }` |
| `literacy_result` | `{ kind: 'test'\|'practice', total, max (24 untuk tes), byProcess: { reason\|formulate\|employ\|interpret: { earned, max } }, texts }` |
| `material_view` | `{ topic: 'T1'..'T7' }` |
| `tutor_turn` | `{ event, fromMove, chip, move, level (1–4), mc, difficulty, reflect, action, source ('gemini'\|'fallback'\|'offline'), reason }` (Teman Mikir, §9) |

Ekspor CSV: `research/export.ts → exportCsv(table: 'events'|'attempts'|'assessments'): Promise<Blob>`, lalu dibagikan lewat plugin Capacitor Share.

## 7. Komponen 3D (props)

```ts
<PriceTagScene price={120000} pct={2500} step={0|1|2} onTagTap={() => void} />
<HundredCubesScene pct={1250} interactive onChange={(bp) => void} />
<StackedDiscountScene price={200000} pcts={[5000, 2000]} step={0|1|2} />
<BarModelScene final={90000} pct={2500} reveal={boolean} />
<CompareStoresScene offers={Offer[]} highlightBest={boolean} />
// Semua scene: prop opsional `forceFallback2d`, event `onFallback(reason)`.
```

## 8. REST API — Backend Python (FastAPI) ✅ diimplementasikan

Base URL: `http://<host>:8000`. Dokumentasi interaktif tersedia di `/docs`. Implementasinya ada di `backend/app/main.py`.

| Metode | Path | Akses | Isi / Respons |
|---|---|---|---|
| GET | `/api/v1/health` | publik | `{ status: "ok" }` |
| GET | `/api/v1/content/version` | publik | `{ version }` (hash 12 karakter dari konten) |
| GET | `/api/v1/content/{curriculum\|glossary\|diagnostic\|assessment}` | publik | isi JSON |
| GET | `/api/v1/problems/{templateId}?seed=N` | publik | `{ vars, answers }`: pratinjau soal, identik dengan yang muncul di aplikasi |
| GET | `/api/v1/tutor/status` | publik | `{ enabled }` — hanya status; nama model & API key tidak pernah dikirim |
| POST | `/api/v1/tutor/turn` | publik | `TutorTurnIn` → `TutorTurnOut` (Teman Mikir, §9) |
| POST | `/api/v1/sync/events` | publik | `{ events: EventIn[] }` (maks 500) → `{ accepted, duplicates }` |
| GET | `/api/v1/research/summary` | `X-Research-Token` | N-gain per siswa & kelas, akurasi, petunjuk/soal, miskonsepsi, usaha mental, skor per proses PISA |
| GET | `/api/v1/research/export.csv` | `X-Research-Token` | seluruh event dalam CSV |

`EventIn` memakai *snake_case*: `client_id, student_code, session_id, ts, type, module_id, problem_id, step_id, payload`. Nilai `type` dibatasi pada daftar di §6.

Kode galat: `401` token peneliti salah, `404` konten/template tidak ada, `413` lebih dari 500 event, `422` data tidak sah (mis. kode siswa berisi spasi atau tipe event tak dikenal). Event duplikat tidak dianggap galat; jumlahnya dilaporkan di `duplicates`.

Fase 2 (TBD): kode kelas & dashboard guru.

## 9. Teman Mikir (tutor mediasi) ✅ diimplementasikan (v0.5, belum dirilis)

Pemetaan teori RMT (Kinard & Kozulin, 2008) ke perilaku tutor adalah **interpretasi desain (hipotesis)**; lihat `shared/content/tutor.json` (`status`, `note`). Teks wajib divalidasi ahli dan diuji coba.

**Pembagian peran**
- Benar/salah tetap ditentukan `domain/` eksak. Gemini tidak pernah menilai.
- Mesin langkah deterministik `backend/app/tutor/engine.py` ≡ `frontend/src/domain/tutor.js` memilih tahap (paritas: `test-vectors.json → tutor`).
- Gemini (opsional, lewat server) hanya menyusun **satu kalimat balasan** di dalam tujuan tahap. `guard.py` menolak balasan yang membocorkan angka kunci, memakai istilah tak baku, > 1 pertanyaan, kalimat > 15 kata, atau tautan; > 40 kata dipangkas per kalimat. Bila ditolak / galat / kuota habis / offline → **teks cadangan** dari `tutor.json`.
- Angka terlarang = semua nilai yang belum tampil di teks soal dan belum dihasilkan langkah sebelumnya (`service.shown_names`), tanpa pengecualian nilai kembar.

**Peristiwa & tahap**

| event | tahap awal |
|---|---|
| `open` (langkah 1) / `open` (langkah ≥ 2) / `open` (fase sanity) | `orientation` / `transformation` / `sanity` |
| `wrong` (dibuka setelah jawaban salah) | `error` dengan teks MC1–MC6 atau `NONE` |
| `chip` | sesuai `next` chip; chip `escalate` menaikkan tingkat T1→T4 (`tool` → `hint` → `example`) |
| `done` (soal selesai & Teman Mikir dipakai) | `reflection` → `transcendence` |

`action` pada balasan: `hint` (buka H1–H3 berikutnya), `example` (H4), `box` (Diagram Kotak), `formula` (kartu rumus). Semua ditampilkan di sheet yang sama (P5); maksimal 3 chip (P2); tanpa auto-advance (P7).

```jsonc
// POST /api/v1/tutor/turn — TutorTurnIn (tanpa student_code)
{ "template_id": "m1-t1", "seed": 1, "step_id": "s1", "event": "chip", "phase": "solve",
  "move": "orientation", "chip_id": "or_ok", "mc": null, "level": 1, "session_id": "<uuid sesi>",
  "answer": null }   // R2: jawaban salah siswa (opsional; hanya dipakai di prompt tahap error/error_why)
// TutorTurnOut
{ "move": "transformation", "stage": "Transformation into a problem", "level": 1, "text": "…",
  "source": "gemini|fallback", "reason": null, "chips": [{ "id": "role_discount", "label": "Besar diskon (Rp)" }],
  "action": null, "difficulty": null, "reflect": null, "mc": null, "close": false }
```

Galat: `404` template/langkah tidak ada, `422` event/tahap/chip tidak dikenal atau format salah. Label chip yang diteruskan ke Gemini diambil dari konten server, bukan dari klien.

Konfigurasi (`backend/.env`, lihat `.env.example`): `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_TIMEOUT`, `TUTOR_DAILY_LIMIT`, `TUTOR_SESSION_LIMIT`. Periksa dengan `python -m app.tools.gemini_check [--try]`. Frontend memakai batas waktu 10 detik lalu jatuh ke teks cadangan.
