// Teman Mikir: satu balasan Plum (≤ 40 kata) + maksimal 3 pilihan (chip). Tanpa kolom ketik bebas,
// tanpa auto-advance (P7): siswa yang menentukan kapan lanjut. Isi tambahan (Diagram Kotak, kartu rumus,
// petunjuk) ditampilkan di sheet yang sama agar tidak berpindah halaman (P5).
import { t } from '../i18n/id.js';
import { Sheet } from '../ui/components.jsx';
import Mascot from '../ui/Mascot.jsx';

/**
 * @param {{turn:{loading?:boolean, text?:string, chips?:Array<{id:string,label:string}>, source?:string}|null,
 *          onChip:(chip:{id:string,label:string})=>void, onClose:()=>void, children?:any}} props
 */
export default function TutorSheet({ turn, onChip, onClose, children }) {
  const loading = !turn || turn.loading;
  return (
    <Sheet onClose={onClose}>
      <div className="row">
        <Mascot mood={loading ? 'think' : 'cheer'} size={56} />
        <h2 className="grow">{t.tutor.title}</h2>
      </div>
      <div className="card hint tutor-bubble" role="status" aria-live="polite" aria-busy={loading}>
        {loading ? <span className="muted">{t.tutor.thinking}</span> : turn.text}
      </div>
      {!loading && children}
      {!loading && turn.chips?.length > 0 && (
        <div className="tutor-chips" role="group" aria-label={t.tutor.choices}>
          {turn.chips.slice(0, 3).map((c) => (
            <button key={c.id} className="chip" onClick={() => onChip(c)}>
              {c.label}
            </button>
          ))}
        </div>
      )}
      <button className="btn btn-block tutor-close" onClick={onClose}>{t.close}</button>
    </Sheet>
  );
}
