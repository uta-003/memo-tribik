import { useEffect } from 'react'
import Icon from './icons.jsx'

// Modal pratinjau: hanya merender backdrop + toolbar.
// Dokumennya sendiri dirender App di dalam .print-root (sumber cetak tunggal).
export default function PrintModal({ onClose, onDownload }) {
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
          <span className="print-toolbar-icon"><Icon name="download" size={17} /></span>
          <div>
            <strong>Pratinjau Unduh PDF</strong>
            <span>
              Klik “Unduh PDF”, lalu pilih tujuan <b>Save as PDF</b> pada dialog cetak
            </span>
          </div>
        </div>
        <div className="print-toolbar-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            <Icon name="x" size={15} /> Tutup
          </button>
          <button type="button" className="btn btn-primary" onClick={onDownload}>
            <Icon name="download" size={15} /> Unduh PDF
          </button>
        </div>
      </div>
    </>
  )
}
