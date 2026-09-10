import Icon from './icons.jsx'
import { formatRupiah } from '../utils/format.js'

const DP_PRESETS = [0, 10, 20, 25, 30, 40, 50]

export default function SummaryCard({
  subtotal,
  dpp,
  ppnAmount,
  ppnPercent,
  ppnMode,
  onPpnModeChange,
  onPpnPercentChange,
  showPpnBreakdown,
  onTogglePpnBreakdown,
  grandTotal,
  dpPercent,
  dpCustom,
  onDpPercentChange,
  onDpCustomChange,
  dpNominal,
  sisa,
  terbilang,
}) {
  const clampPercent = (raw) => {
    const v = Math.round(Number(raw))
    if (!Number.isFinite(v)) return 0
    return Math.min(100, Math.max(0, v))
  }

  const isInclude = ppnMode === 'include'

  return (
    <aside className="card summary-card">
      <div className="summary-head">
        <span className="summary-icon"><Icon name="wallet" size={18} /></span>
        <div>
          <h3>Ringkasan Pembayaran</h3>
          <p>Semua angka dihitung otomatis</p>
        </div>
      </div>

      <div className="ppn-block">
        <div className="ppn-label-row">
          <span className="mini-label">PPN</span>
          <div className="ppn-rate">
            <input
              type="number"
              min="0"
              max="100"
              value={ppnPercent}
              onChange={(e) => onPpnPercentChange(clampPercent(e.target.value))}
              aria-label="Tarif PPN"
            />
            <span>%</span>
          </div>
        </div>
        <div className="segmented">
          <button
            type="button"
            className={!isInclude ? 'active' : ''}
            onClick={() => onPpnModeChange('exclude')}
          >
            Exclude PPN
          </button>
          <button
            type="button"
            className={isInclude ? 'active' : ''}
            onClick={() => onPpnModeChange('include')}
          >
            Include PPN
          </button>
        </div>
        {isInclude && (
          <label className="pdf-toggle" title="Tampilkan/sembunyikan baris DPP & PPN pada dokumen PDF">
            <input
              type="checkbox"
              checked={showPpnBreakdown}
              onChange={(e) => onTogglePpnBreakdown(e.target.checked)}
            />
            <span className="pdf-toggle-track" aria-hidden="true"><span className="pdf-toggle-thumb" /></span>
            <span className="pdf-toggle-text">Rincian DPP &amp; PPN di PDF</span>
          </label>
        )}
      </div>

      <div className="sum-rows">
        <div className="sum-row">
          <span className="label">{isInclude ? 'Total (termasuk PPN)' : 'Subtotal'}</span>
          <span className="value">{formatRupiah(subtotal)}</span>
        </div>
        {isInclude && (
          <div className="sum-row sub">
            <span className="label">• DPP (dasar pengenaan pajak)</span>
            <span className="value">{formatRupiah(dpp)}</span>
          </div>
        )}
        <div className="sum-row">
          <span className="label">
            PPN {ppnPercent}%{isInclude ? ' — sudah termasuk' : ''}
          </span>
          <span className="value">{formatRupiah(ppnAmount)}</span>
        </div>
      </div>

      <div className="grand">
        <span>GRAND TOTAL</span>
        <strong>{formatRupiah(grandTotal)}</strong>
      </div>

      <div className="dp-block">
        <div className="dp-head">
          <span className="mini-label">DP — Uang Muka</span>
        </div>
        <div className="dp-controls">
          <select
            value={dpCustom ? 'custom' : String(dpPercent)}
            onChange={(e) => {
              if (e.target.value === 'custom') {
                onDpCustomChange(true)
              } else {
                onDpCustomChange(false)
                onDpPercentChange(Number(e.target.value))
              }
            }}
            aria-label="Persentase DP"
          >
            {DP_PRESETS.map((p) => (
              <option key={p} value={p}>{p}%</option>
            ))}
            <option value="custom">Lainnya…</option>
          </select>
          {dpCustom && (
            <div className="dp-custom">
              <input
                type="number"
                min="0"
                max="100"
                value={dpPercent}
                onChange={(e) => onDpPercentChange(clampPercent(e.target.value))}
                aria-label="DP kustom"
              />
              <span>%</span>
            </div>
          )}
        </div>
        <div className="sum-row">
          <span className="label">DP {dpPercent}%</span>
          <span className="value">{formatRupiah(dpNominal)}</span>
        </div>
        <div className="sisa">
          <span>Sisa Pembayaran</span>
          <strong>{formatRupiah(sisa)}</strong>
        </div>
      </div>

      <div className="terbilang">
        <span className="terbilang-label"><Icon name="pen" size={12} /> Terbilang</span>
        <p>#{terbilang}#</p>
      </div>
    </aside>
  )
}
