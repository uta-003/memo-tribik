import { useEffect, useState } from 'react'
import Icon from './icons.jsx'
import { APPS_SCRIPT_CODE } from '../utils/appsScriptCode.js'
import { SHEET_LINK, ujiKoneksi } from '../utils/gsheet.js'

// Modal pengaturan koneksi Google Sheet (URL Web App + panduan setup)
export default function SheetSettings({ open, url, onSave, onClose, lastError }) {
  const [draft, setDraft] = useState(url)
  const [copied, setCopied] = useState(false)
  const [testState, setTestState] = useState({ status: 'idle', message: '' })

  useEffect(() => {
    if (open) {
      setDraft(url)
      setCopied(false)
      setTestState({ status: 'idle', message: '' })
    }
  }, [open, url])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.classList.add('modal-open')
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.classList.remove('modal-open')
    }
  }, [open, onClose])

  if (!open) return null

  const salinKode = async () => {
    try {
      await navigator.clipboard.writeText(APPS_SCRIPT_CODE)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('Salin manual kode berikut:', APPS_SCRIPT_CODE)
    }
  }

  const tesKoneksi = async () => {
    const target = String(draft || '').trim()
    if (!target) {
      setTestState({ status: 'error', message: 'Isi dulu URL Web App di kolom atas.' })
      return
    }
    setTestState({ status: 'sending', message: 'Menguji koneksi…' })
    try {
      const res = await ujiKoneksi(target)
      setTestState({ status: 'ok', message: res.message || 'Koneksi berhasil — siap kirim data.' })
    } catch (e) {
      setTestState({ status: 'error', message: String((e && e.message) || e) })
    }
  }

  return (
    <div className="sheet-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="sheet-modal" onClick={(e) => e.stopPropagation()}>
        <header className="sheet-modal-head">
          <div className="sheet-modal-title">
            <span className="sheet-modal-icon"><Icon name="table" size={18} /></span>
            <div>
              <strong>Kirim ke Google Sheet</strong>
              <span>Data memo masuk ke sheet <b>Memo</b> (ringkasan) &amp; <b>Rincian</b> (per item)</span>
            </div>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} title="Tutup">
            <Icon name="x" size={16} />
          </button>
        </header>

        <div className="sheet-modal-body">
          <div className="field">
            <label htmlFor="sheet-url">URL Web App Apps Script</label>
            <input
              id="sheet-url"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="https://script.google.com/macros/s/…/exec"
            />
            <p className="sheet-hint">
              Tempel URL hasil deploy (berakhiran <b>/exec</b>). Tersimpan otomatis di browser ini.
            </p>
          </div>

          {lastError && (
            <div className="sheet-error">
              <b>Gagal mengirim:</b> {lastError}
            </div>
          )}

          <div className="sheet-actions">
            <a className="btn btn-ghost" href={SHEET_LINK} target="_blank" rel="noreferrer">
              <Icon name="table" size={15} /> Buka Spreadsheet
            </a>
            <button
              type="button"
              className="btn btn-soft"
              onClick={tesKoneksi}
              disabled={testState.status === 'sending'}
            >
              <Icon name="send" size={15} /> {testState.status === 'sending' ? 'Menguji…' : 'Tes Koneksi'}
            </button>
            <button type="button" className="btn btn-primary" onClick={() => onSave(draft)}>
              <Icon name="check" size={15} /> Simpan URL
            </button>
          </div>

          {testState.status !== 'idle' && (
            <div className={`sheet-test-result ${testState.status === 'ok' ? 'ok' : 'err'}`}>
              {testState.status === 'ok' ? '✓ ' : testState.status === 'sending' ? '… ' : '✕ '}
              {testState.message}
            </div>
          )}

          <div className="sheet-steps">
            <b>Setup sekali saja:</b>
            <ol>
              <li>Buka spreadsheet di atas → menu <b>Ekstensi → Apps Script</b>.</li>
              <li>Hapus isi editor, lalu tempel kode di bawah (atau pakai tombol <b>Salin Kode</b>).</li>
              <li>*(Opsional)* Klik <b>▶ Run</b> → pilih fungsi <b>setupSheet</b> → Review permissions → sheet <b>Memo</b> &amp; <b>Rincian</b> langsung dibuat dengan header.</li>
              <li><b>Deploy → New deployment → Web app</b> — Execute as: <b>Me</b>, dan <b>Who has access: Anyone</b> (wajib — penyebab utama error 403) → Deploy.</li>
              <li>Sudah pernah deploy? <b>Deploy → Manage deployments → ✏ Edit</b> → Who has access: <b>Anyone</b> → Version: <b>New version</b> → Deploy.</li>
              <li>Salin URL <b>/exec</b> yang muncul → tempel di kolom atas → <b>Tes Koneksi</b> → <b>Simpan URL</b>.</li>
            </ol>
          </div>

          <div className="sheet-script">
            <div className="sheet-script-head">
              <span>Kode Apps Script — Code.gs</span>
              <button type="button" className="btn btn-soft" onClick={salinKode}>
                <Icon name="copy" size={14} /> {copied ? 'Tersalin ✓' : 'Salin Kode'}
              </button>
            </div>
            <pre>{APPS_SCRIPT_CODE}</pre>
          </div>
        </div>
      </div>
    </div>
  )
}
