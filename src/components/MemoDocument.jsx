import { formatRupiah, formatTanggalID } from '../utils/format.js'

const strip = (v) => (typeof v === 'string' && v.trim() ? v.trim() : '')

function InfoItem({ label, value, wide }) {
  return (
    <div className={`doc-info-item${wide ? ' wide' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

// Dokumen memo siap cetak / unduh PDF (format A4)
export default function MemoDocument({
  form,
  items,
  ppnMode,
  ppnPercent,
  showPpnBreakdown,
  dpPercent,
  signatures,
  city,
  subtotal,
  dpp,
  ppnAmount,
  grandTotal,
  dpNominal,
  sisa,
  terbilang,
}) {
  const isInclude = ppnMode === 'include'
  const adaDp = (Number(dpPercent) || 0) > 0

  // Tidak ada fitFont — teks tampil penuh, wrap natural jika panjang
  const now = new Date()
  const dicetak =
    now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' +
    now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })

  const rowTotal = (it) =>
    Math.round((Number(it.qty) || 0) * (Number(it.harga) || 0))

  return (
    <div className="doc-page">
      {/* Kop dokumen */}
      <header className="doc-head">
        <div className="doc-brand">
          <span className="doc-logo">
            <img src="/tribik-logo.png" alt="PT Balai Lelang Tribik" className="doc-logo-img" />
          </span>
          <div>
            <h1>Memo Pembayaran</h1>
            <p>PT Balai Lelang Tribik</p>
          </div>
        </div>
        <div className="doc-meta">
          <div className="doc-meta-item">
            <span>Nomor Memo</span>
            <strong className="doc-nomor">{strip(form.nomor) || '—'}</strong>
          </div>
          <div className="doc-meta-item">
            <span>Tanggal</span>
            <strong>{formatTanggalID(form.tanggal) || '—'}</strong>
          </div>
        </div>
      </header>
      <div className="doc-accent" />

      {/* Data utama */}
      <section className={`doc-info${isInclude && !showPpnBreakdown ? ' doc-info-no-ppn' : ''}`}>
        <InfoItem wide label="Dibayar Kepada" value={strip(form.dibayarKe) || '—'} />
        <InfoItem label="No. Rek / VA" value={strip(form.noRek) || '—'} />
        <InfoItem label="Nama Bank" value={strip(form.namaBank) || '—'} />
        <InfoItem label="Divisi" value={strip(form.divisi) || '—'} />
        {(!isInclude || showPpnBreakdown) && (
          <InfoItem
            label="PPN"
            value={`${ppnPercent}% — ${isInclude ? 'sudah termasuk' : 'ditambahkan'}`}
          />
        )}
      </section>

      {/* Tabel rincian */}
      <table className="doc-table">
        <thead>
          <tr>
            <th className="col-no c">No</th>
            <th>Keterangan Pengeluaran</th>
            <th className="col-qty c">QTY</th>
            <th className="col-harga num">Harga Satuan</th>
            <th className="col-total num">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={it.id || i}>
              <td className="c">{i + 1}</td>
              <td>{strip(it.keterangan) || '—'}</td>
              <td className="c">{Number(it.qty) || 0}</td>
              <td className="num">{formatRupiah(it.harga)}</td>
              <td className="num strong">{formatRupiah(rowTotal(it))}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4} className="lbl">Subtotal</td>
            <td className="num">{formatRupiah(subtotal)}</td>
          </tr>
          <tr className="grand-total-row">
            <td colSpan={4} className="lbl">GRAND TOTAL</td>
            <td className="num grand-total-num">{formatRupiah(grandTotal)}</td>
          </tr>
        </tfoot>
      </table>

      {/* Ringkasan pembayaran */}
      <section className="doc-sum">
        {!isInclude && (
          <div className="doc-sum-row">
            <span>Subtotal</span>
            <b>{formatRupiah(subtotal)}</b>
          </div>
        )}
        {isInclude && showPpnBreakdown && (
          <>
            <div className="doc-sum-row">
              <span>Total (termasuk PPN)</span>
              <b>{formatRupiah(subtotal)}</b>
            </div>
            <div className="doc-sum-row muted">
              <span>• DPP (dasar pengenaan pajak)</span>
              <b>{formatRupiah(dpp)}</b>
            </div>
            <div className="doc-sum-row">
              <span>PPN {ppnPercent}% (sudah termasuk)</span>
              <b>{formatRupiah(ppnAmount)}</b>
            </div>
          </>
        )}
        {!isInclude && (
          <div className="doc-sum-row">
            <span>PPN {ppnPercent}%</span>
            <b>{formatRupiah(ppnAmount)}</b>
          </div>
        )}
        {adaDp && (
          <div className="doc-sum-row">
            <span>DP {dpPercent}%</span>
            <b>{formatRupiah(dpNominal)}</b>
          </div>
        )}
        {adaDp && (
          <div className="doc-sum-row sisa">
            <span>Sisa Pembayaran</span>
            <b>{formatRupiah(sisa)}</b>
          </div>
        )}
      </section>

      {/* Terbilang */}
      <div className="doc-terbilang">
        <span>Terbilang</span>
        <em>#{terbilang}#</em>
      </div>

      {/* Tanda tangan — grup/member yang kosong otomatis disembunyikan */}
      {(() => {
        const isFilled = (m) => strip(m.nama) !== '' || strip(m.jabatan) !== ''
        const groups = [
          { label: 'Pemohon', key: 'pemohon' },
          { label: 'Mengetahui', key: 'mengetahui' },
          { label: 'Menyetujui', key: 'menyetujui' },
        ]
          .map((g) => ({ ...g, members: signatures[g.key].filter(isFilled) }))
          .filter((g) => g.members.length > 0)
        if (groups.length === 0) return null
        let gridCols = '1fr'
        if (groups.length === 3) gridCols = '0.78fr 1.11fr 1.11fr'
        else if (groups.length === 2) {
          gridCols = groups.some((g) => g.key === 'pemohon')
            ? '0.78fr 1.22fr'
            : '1fr 1fr'
        }
        return (
          <section className="doc-sign">
            <div className="doc-sign-date">
              {strip(city) || 'Bekasi'}, {formatTanggalID(form.tanggal) || '—'}
            </div>
            <div className="doc-sign-grid" style={{ gridTemplateColumns: gridCols }}>
              {groups.map((g) => (
                <div className="doc-sign-group" key={g.key}>
                  <span className={`doc-sign-label doc-sign-${g.key}`}>{g.label}</span>
                  <div className={`doc-sign-members${g.members.length > 1 ? ' two' : ''}`}>
                    {g.members.map((m, i) => (
                      <div className="doc-sign-member" key={i}>
                        <div className="doc-sig-space" />
                        <div className="doc-sig-name">
                          {strip(m.nama) || '\u00A0'}
                        </div>
                        <div className="doc-sig-jabatan">
                          {strip(m.jabatan) || '\u00A0'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )
      })()}

      {/* Kaki dokumen */}
      <footer className="doc-foot">
        <span>Dicetak {dicetak} melalui aplikasi Memo Pembayaran</span>
        <span>{strip(form.nomor) || '—'}</span>
        <span className="doc-foot-copy">2026 © E. Nugraha Wicaksono. All Rights Reserved.</span>
      </footer>
    </div>
  )
}
