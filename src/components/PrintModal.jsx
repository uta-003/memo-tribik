import { useEffect } from 'react'
import Icon from './icons.jsx'

// Modal pratinjau: hanya merender backdrop + toolbar.
// Dokumennya sendiri dirender App di dalam .print-root (sumber cetak tunggal).
export default function PrintModal({
  onClose,
  onDownload,
  onPrint,
  pdfBusy,
  isInclude,
  showPpnBreakdown,
  onTogglePpnBreakdown,
}) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.classList.add('modal-open')
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.classList.remove('modal-open')
    }
  }, [onClose])

  return (
    <>
      <div className="print-backdrop no-print" onClick={onClose} />
      <div className="print-toolbar no-print">
        <div className="print-toolbar-info">
          <span className="print-toolbar-icon">
            <Icon name="download" size={20} />
          </span>
          <div className="print-toolbar-text">
            <strong>Pratinjau Unduh PDF</strong>
            <span>
              Klik <b>Unduh PDF</b> lalu pilih tujuan <b>Save as PDF</b>, atau{" "}
              <b>Cetak</b> untuk print langsung ke printer
            </span>
          </div>
        </div>
        <div className="print-toolbar-actions">
          {isInclude && (
            <button
              type="button"
              className={`btn btn-ghost${showPpnBreakdown ? '' : ' active'}`}
              onClick={() => onTogglePpnBreakdown(!showPpnBreakdown)}
              title={
                showPpnBreakdown
                  ? 'Sembunyikan baris DPP & PPN dari pratinjau/PDF'
                  : 'Tampilkan baris DPP & PPN di pratinjau/PDF'
              }
            >
              <Icon name={showPpnBreakdown ? 'eyeOff' : 'eye'} size={15} />
              {showPpnBreakdown ? 'Sembunyikan Rincian' : 'Tampilkan Rincian'}
            </button>
          )}
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            <Icon name="x" size={15} /> Tutup
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onPrint}
            disabled={pdfBusy}
            title="Cetak langsung — pilih printer pada dialog cetak"
          >
            <Icon name="printer" size={15} /> Cetak
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onDownload}
            disabled={pdfBusy}
            title="Mengunduh hasil memo sebagai berkas PDF"
          >
            <Icon name="download" size={15} /> {pdfBusy ? 'Membuat PDF...' : 'Unduh PDF'}
          </button>
        </div>
      </div>
    </>
  )
}
