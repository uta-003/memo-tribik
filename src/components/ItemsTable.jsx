import Icon from './icons.jsx'
import { formatNumber, formatRupiah, parseDigits, uid } from '../utils/format.js'

export default function ItemsTable({ items, onChange, subtotal }) {
  const update = (id, patch) =>
    onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)))

  const remove = (id) => onChange(items.filter((it) => it.id !== id))

  const add = () =>
    onChange([...items, { id: uid(), keterangan: '', qty: 1, harga: 0 }])

  const rowTotal = (it) =>
    Math.round((Number(it.qty) || 0) * (Number(it.harga) || 0))

  return (
    <div className="table-wrap">
      <table className="items-table">
        <thead>
          <tr>
            <th className="th-no">No</th>
            <th>Keterangan Pengeluaran</th>
            <th className="th-qty">QTY</th>
            <th className="th-harga">Harga Satuan</th>
            <th className="th-total">Total</th>
            <th className="th-aksi no-print" aria-label="Aksi"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={it.id}>
              <td className="td-no">{i + 1}</td>
              <td>
                <input
                  className="cell-input"
                  value={it.keterangan}
                  onChange={(e) => update(it.id, { keterangan: e.target.value })}
                  placeholder="Contoh: Pembelian oli mesin"
                />
              </td>
              <td className="td-qty">
                <input
                  className="cell-input cell-num"
                  inputMode="numeric"
                  value={it.qty || ''}
                  onChange={(e) => update(it.id, { qty: parseDigits(e.target.value) })}
                  placeholder="0"
                />
              </td>
              <td className="td-harga">
                <div className="currency-cell">
                  <span>Rp</span>
                  <input
                    className="cell-input cell-num"
                    inputMode="numeric"
                    value={it.harga ? formatNumber(it.harga) : ''}
                    onChange={(e) => update(it.id, { harga: parseDigits(e.target.value) })}
                    placeholder="0"
                  />
                </div>
              </td>
              <td className="td-total">{formatRupiah(rowTotal(it))}</td>
              <td className="td-aksi no-print">
                <button
                  type="button"
                  className="icon-btn danger"
                  onClick={() => remove(it.id)}
                  disabled={items.length <= 1}
                  title={items.length <= 1 ? 'Minimal satu baris' : 'Hapus baris'}
                >
                  <Icon name="trash" size={15} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4} className="tfoot-label">Subtotal</td>
            <td className="tfoot-value">{formatRupiah(subtotal)}</td>
            <td className="no-print"></td>
          </tr>
        </tfoot>
      </table>

      <div className="table-actions no-print">
        <button type="button" className="btn btn-soft" onClick={add}>
          <Icon name="plus" size={16} /> Tambah Baris
        </button>
        <span className="table-hint">{items.length} baris • total dihitung otomatis</span>
      </div>
    </div>
  )
}
