import { useRef } from 'react'
import Icon from './icons.jsx'

const MAX_COUNT = 5
const MAX_BYTES = 8 * 1024 * 1024

const ACCEPT_ATTR = 'image/*,.pdf,.jpg,.jpeg,.png,.webp,.bmp'

function fmtSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Reduk gambar besar agar dimuat localStorage (max 1600px) + jaga qvalita PDF
function shirinkMe(dataUrl, maxSide = 1600) {
  return new Promise((resolve, reject) => {
    const im = new Image()
    im.onload = () => {
      let w = im.naturalWidth
      let h = im.naturalHeight
      if (Math.max(w, h) > maxSide) {
        const r = maxSide / Math.max(w, h)
        w = Math.round(w * r)
        h = Math.round(h * r)
      }
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      const ctx = c.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, w, h)
      ctx.drawImage(im, 0, 0, w, h)
      resolve(c.toDataURL('image/png'))
    }
    im.onerror = () => reject(new Error('Gambar tidak dapat dilai'))
    im.src = dataUrl
  })
}

export default function AttachmentsSection({ attachments = [], onChange }) {
  const inputRef = useRef(null)
  const room = Math.max(0, MAX_COUNT - attachments.length)

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || []).slice(0, room)
    if (!files.length) return
    for (const f of files) {
      if (f.size > MAX_BYTES) {
        window.alert(`Berkas "${f.name}" melebihi 8 MB — tidak dimuat.`)
        continue
      }
      const isPdf = String(f.type).toLowerCase().includes('pdf') || /\.pdf$/i.test(f.name)
      if (!isPdf && !String(f.type).toLowerCase().startsWith('image/')) {
        window.alert(`"${f.name}" bukan gambar/PDF — tidak dimuat.`)
        continue
      }
      try {
        const raw = await new Promise((res, rej) => {
          const r = new FileReader()
          r.onload = () => res(r.result)
          r.onerror = () => rej(new Error('Gagal baca berkas'))
          r.readAsDataURL(f)
        })
        const dataUrl = isPdf ? raw : await shirinkMe(raw)
        const item = {
          id: Math.random().toString(36).slice(2) + Date.now(),
          name: f.name,
          type: isPdf ? 'application/pdf' : 'image/png',
          size: f.size,
          dataUrl,
        }
        onChange([...attachments, item])
        attachments = [...attachments, item]
      } catch {
        window.alert(`Gagal memuat "${f.name}"`)
      }
    }
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="attach-wrap">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        multiple
        className="attach-input"
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className="attach-actions">
        <button
          type="button"
          className="btn btn-soft"
          disabled={room <= 0}
          onClick={() => inputRef.current && inputRef.current.click()}
        >
          <Icon name="upload" size={15} /> Tambah Lampiran
        </button>
        <span className="attach-count">
          <Icon name="paperclip" size={13} /> {attachments.length}/{MAX_COUNT} maksimal
        </span>
      </div>
      <p className="attach-hint">
        Maksimal {MAX_COUNT} berkas (gambar / PDF). Bila unduh PDF, lampiran otomatis
        digabung menjadi satu berkas PDF bersama memo.
      </p>
      {attachments.length > 0 && (
        <ul className="attach-list">
          {attachments.map((a) => (
            <li className="attach-item" key={a.id}>
              <span className="attach-thumb">
                {a.type === 'application/pdf' ? (
                  <Icon name="file" size={20} />
                ) : (
                  <img src={a.dataUrl} alt="" />
                )}
              </span>
              <span className="attach-name" title={a.name}>
                {a.name}
              </span>
              <span className="attach-size">{fmtSize(a.size)}</span>
              <button
                type="button"
                className="icon-btn danger"
                title="Hapus lampiran"
                onClick={() => onChange(attachments.filter((x) => x.id !== a.id))}
              >
                <Icon name="trash" size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {attachments.length === 0 && (
        <div className="attach-empty">
          <Icon name="paperclip" size={18} />
          <span>Belum ada lampiran. Klik "Tambah Lampiran" untuk memuat maksimal {MAX_COUNT} berkas.</span>
        </div>
      )}
    </div>
  )
}