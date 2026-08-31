import Icon from './icons.jsx'

export const DIVISI_OPTIONS = [
  'Keuangan', 'Operasional', 'Pemasaran', 'Marketing', 'HRD & GA',
  'IT', 'Purchasing', 'Gudang', 'Bengkel / Service', 'Sparepart', 'Umum',
]

export const BANK_OPTIONS = [
  'BCA', 'Bank Mandiri', 'BNI', 'BRI', 'CIMB Niaga', 'Danamon',
  'Permata Bank', 'BTN', 'Bank Syariah Indonesia', 'OCBC NISP',
  'Maybank', 'SeaBank', 'Bank Jago', 'Bank Neo Commerce',
]

export default function MemoInfoForm({ form, onChange, onGenerateNomor }) {
  const set = (key) => (e) => onChange({ ...form, [key]: e.target.value })

  return (
    <div className="info-grid">
      <div className="field">
        <label htmlFor="f-nomor">
          <Icon name="hash" size={13} /> Nomor Memo <span className="auto-badge">otomatis</span>
        </label>
        <div className="input-affix">
          <input
            id="f-nomor"
            value={form.nomor}
            onChange={set('nomor')}
            placeholder="TRB/2026/VIII/001"
          />
          <button
            type="button"
            className="icon-btn affix-btn"
            title="Buat nomor memo baru (no. urut berikutnya)"
            onClick={onGenerateNomor}
          >
            <Icon name="rotate" size={15} />
          </button>
        </div>
      </div>

      <div className="field">
        <label htmlFor="f-dibayar"><Icon name="users" size={13} /> Dibayar Kepada</label>
        <input
          id="f-dibayar"
          value={form.dibayarKe}
          onChange={set('dibayarKe')}
          placeholder="Nama penerima / supplier"
        />
      </div>

      <div className="field">
        <label htmlFor="f-rek"><Icon name="card" size={13} /> No. Rek / VA</label>
        <input
          id="f-rek"
          value={form.noRek}
          onChange={set('noRek')}
          inputMode="numeric"
          placeholder="1234567890"
        />
      </div>

      <div className="field">
        <label htmlFor="f-tanggal">
          <Icon name="calendar" size={13} /> Tanggal <span className="auto-badge">otomatis</span>
        </label>
        <input id="f-tanggal" type="date" value={form.tanggal} onChange={set('tanggal')} />
      </div>

      <div className="field">
        <label htmlFor="f-divisi"><Icon name="list" size={13} /> Divisi</label>
        <input
          id="f-divisi"
          list="divisi-options"
          value={form.divisi}
          onChange={set('divisi')}
          placeholder="Pilih / ketik divisi"
        />
        <datalist id="divisi-options">
          {DIVISI_OPTIONS.map((d) => <option key={d} value={d} />)}
        </datalist>
      </div>

      <div className="field">
        <label htmlFor="f-bank"><Icon name="bank" size={13} /> Nama Bank</label>
        <input
          id="f-bank"
          list="bank-options"
          value={form.namaBank}
          onChange={set('namaBank')}
          placeholder="Pilih / ketik nama bank"
        />
        <datalist id="bank-options">
          {BANK_OPTIONS.map((b) => <option key={b} value={b} />)}
        </datalist>
      </div>
    </div>
  )
}
