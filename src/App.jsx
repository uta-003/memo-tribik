import { useEffect, useMemo, useRef, useState } from 'react'
import MemoInfoForm from './components/MemoInfoForm.jsx'
import ItemsTable from './components/ItemsTable.jsx'
import SummaryCard from './components/SummaryCard.jsx'
import SignatureSection from './components/SignatureSection.jsx'
import AttachmentsSection from './components/AttachmentsSection.jsx'
import MemoDocument from './components/MemoDocument.jsx'
import PrintModal from './components/PrintModal.jsx'
import SheetSettings from './components/SheetSettings.jsx'
import Icon from './components/icons.jsx'
import { formatTanggalID, todayISO, uid } from './utils/format.js'
import { terbilangRupiah } from './utils/terbilang.js'
import { nextNomorMemo, periodeNomor } from './utils/memoNumber.js'
import { kirimKeSheet } from './utils/gsheet.js'

const STORAGE_KEY = 'memo-pembayaran-draft-v1'
const SHEET_URL_KEY = 'memo-pembayaran-gsheet-url-v1'
const DEFAULT_SHEET_URL =
  'https://script.google.com/macros/s/AKfycbzR-xu-Xa6QrhyKmP7Wintjp2FLemk0rF66hUoPmRBl1jw6t-qZsS9UxOY3Z9frni1a0A/exec'

// Nomor memo pertama per sesi halaman  di-cache agar aman dari
// double-invoke useState initializer (React StrictMode).
let nomorAwalTercache = null
function nomorAwal() {
  if (!nomorAwalTercache) nomorAwalTercache = nextNomorMemo()
  return nomorAwalTercache
}

function buatBaris() {
  return { id: uid(), keterangan: '', qty: 1, harga: 0 }
}

function normMembers(arr, n) {
  return Array.from({ length: n }, (_, i) => ({
    nama: arr?.[i]?.nama || '',
    jabatan: arr?.[i]?.jabatan || '',
  }))
}


function stateDefault() {
  return {
    form: {
      nomor: '',
      dibayarKe: '',
      noRek: '',
      tanggal: todayISO(),
      divisi: '',
      namaBank: '',
      cabangBank: '',
    },
    items: [buatBaris()],
    attachments: [],
    ppnMode: 'exclude',
    ppnPercent: 11,
    showPpnBreakdown: true,
    dpPercent: 0,
    dpCustom: false,
    signatures: {
      pemohon: normMembers(null, 1),
      mengetahui: normMembers(null, 2),
      menyetujui: normMembers(null, 2),
    },
    city: 'Bekasi',
  }
}

function muatDraft() {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data || !Array.isArray(data.items) || data.items.length === 0) return null
    const base = stateDefault()
    return {
      ...base,
      ...data,
      form: { ...base.form, ...(data.form || {}) },
      items: data.items.map((it) => ({ ...buatBaris(), ...it })),
      attachments: Array.isArray(data.attachments)
        ? data.attachments.filter((a) => a && a.dataUrl)
        : [],
      signatures: {
        pemohon: normMembers(data.signatures?.pemohon, 1),
        mengetahui: normMembers(data.signatures?.mengetahui, 2),
        menyetujui: normMembers(data.signatures?.menyetujui, 2),
      },
    }
  } catch {
    return null
  }
}

export default function App() {
  const [state, setState] = useState(() => {
    const draft = muatDraft()
    if (draft) return draft
    const s = stateDefault()
    s.form.nomor = nomorAwal()
    return s
  })
  const [savedAt, setSavedAt] = useState(null)
  const [showPrint, setShowPrint] = useState(false)
  const [sheetUrl, setSheetUrl] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_SHEET_URL
    try {
      return window.localStorage.getItem(SHEET_URL_KEY) || DEFAULT_SHEET_URL
    } catch {
      return DEFAULT_SHEET_URL
    }
  })
  const [showSheet, setShowSheet] = useState(false)
  const [pendingSend, setPendingSend] = useState(false)
  const [sheetState, setSheetState] = useState({ status: 'idle', message: '' })
  const {
    form, items, ppnMode, ppnPercent, dpPercent, dpCustom, signatures, city,
    showPpnBreakdown, attachments,
  } = state

  const patch = (partial) => setState((s) => ({ ...s, ...partial }))

  // Autosave draft ke localStorage (debounce 400ms)
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        // Simpan metadata lampiran saja (nama/tipe) — data URL gambar bisa sangat
        // besar sehingga berisiko melampaui kuota localStorage dan menggagalkan
        // penyimpanan seluruh draft. Gambar tetap utuh untuk sesi ini di state.
        const toSave = {
          ...state,
          attachments: state.attachments.map((a) => ({
            id: a.id,
            name: a.name,
            type: a.type,
            size: a.size,
          })),
        }
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
        setSavedAt(new Date())
      } catch {
        /* penyimpanan tidak tersedia  abaikan */
      }
    }, 400)
    return () => clearTimeout(t)
  }, [state])

  // ----- Sinkronisasi otomatis tanggal & nomor memo -----
  // Jika aplikasi dibiarkan terbuka melewati pergantian hari/bulan/tahun,
   // tanggal form ikut diperbarui ke hari ini; nomor memo otomatis digenerate
   // ulang saat periode (tahun-bulan) berubah (no. urut reset ke 001).
  // Pemicu: interval 30 detik + saat tab kembali fokus/terlihat.
  const lastAutoDateRef = useRef(null)
  useEffect(() => {
    if (typeof window === 'undefined') return
    // Acuan sinkron: tanggal yang sedang tampil di form saat dimuat
    // (draft lama dengan tanggal kemarin/bulan lalu akan langsung tersinkron;
    //  backdate manual di hari yang sama tetap dihormati hinggu hari berganti).
    lastAutoDateRef.current = form.tanggal || todayISO()
    const sync = () => {
      const t = todayISO()
      if (lastAutoDateRef.current === t) return
      lastAutoDateRef.current = t
      setState((prev) => {
        const now = new Date()
        let nomor = prev.form.nomor
        const p = periodeNomor(nomor)
        if (!p || p.tahun !== now.getFullYear() || p.bulan !== now.getMonth() + 1) {
          nomor = nextNomorMemo()
        }
        return { ...prev, form: { ...prev.form, tanggal: t, nomor } }
      })
    }
    const id = setInterval(sync, 30000)
    const onFocus = () => sync()
    const onVis = () => { if (!document.hidden) sync() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(id)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVis)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ----- Kalkulasi otomatis -----
  const subtotal = useMemo(
    () =>
      items.reduce(
        (acc, it) => acc + Math.round((Number(it.qty) || 0) * (Number(it.harga) || 0)),
        0,
      ),
    [items],
  )

  const rate = (Number(ppnPercent) || 0) / 100
  let dpp
  let ppnAmount
  let grandTotal
  if (ppnMode === 'include') {
    grandTotal = subtotal
    dpp = Math.round(subtotal / (1 + rate))
    ppnAmount = grandTotal - dpp
  } else {
    dpp = subtotal
    ppnAmount = Math.round(subtotal * rate)
    grandTotal = dpp + ppnAmount
  }
  const dpNominal = Math.round(grandTotal * ((Number(dpPercent) || 0) / 100))
  const sisa = grandTotal - dpNominal
  const kataTerbilang = terbilangRupiah(grandTotal)

  const handleReset = () => {
    if (!window.confirm('Kosongkan isian dan buat memo baru dengan nomor berikutnya?')) return
    window.localStorage.removeItem(STORAGE_KEY)
    const s = stateDefault()
    s.form.nomor = nextNomorMemo()
    setState(s)
    setSavedAt(null)
    setShowPrint(false)
  }

  // ---------- Kirim ke Google Sheet ----------
  const simpanSheetUrl = (url) => {
    const clean = String(url || '').trim()
    setSheetUrl(clean)
    try {
      if (clean) window.localStorage.setItem(SHEET_URL_KEY, clean)
      else window.localStorage.removeItem(SHEET_URL_KEY)
    } catch {
      /* penyimpanan tidak tersedia  URL tetap dipakai sesi ini */
    }
  }

  const kirimKeSheetSekarang = async (url) => {
    setSheetState({ status: 'sending', message: 'Mengirim' })
    try {
      const payload = {
        memo: {
          nomor: form.nomor,
          tanggal: form.tanggal,
          dibayarKe: form.dibayarKe,
          noRek: form.noRek,
          namaBank: form.namaBank,
          cabangBank: form.cabangBank,
          divisi: form.divisi,
          subtotal,
          ppnMode,
          ppnPercent,
          ppnAmount,
          grandTotal,
          dpPercent,
          dpNominal,
          sisa,
          terbilang: kataTerbilang,
          signatures,
          lampiran: attachments.map((a) => a.name).join('; '),
        },
        items: items.map((it) => ({
          keterangan: it.keterangan,
          qty: Number(it.qty) || 0,
          harga: Number(it.harga) || 0,
          total: Math.round((Number(it.qty) || 0) * (Number(it.harga) || 0)),
        })),
      }
      const res = await kirimKeSheet(url, payload)
      if (!res || !res.ok) throw new Error((res && res.error) || 'Apps Script menolak data')
      setSheetState({
        status: 'ok',
        message:
          'Terkirim ' +
          new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      })
    } catch (err) {
      setSheetState({ status: 'error', message: String((err && err.message) || err) })
    }
  }

  const handleKirimSheet = () => {
    if (!sheetUrl) {
      setPendingSend(true)
      setShowSheet(true)
      return
    }
    kirimKeSheetSekarang(sheetUrl)
  }

  // ---------- Unduh PDF (menghasilkan berkas .pdf) ----------
  const [pdfBusy, setPdfBusy] = useState(false)

  const handleUnduhPdfFile = async () => {
    const src = document.querySelector(".print-root.open .doc-page") || document.querySelector(".doc-page")
    if (!src) return
    setPdfBusy(true)
    let host = null
    try {
      if (document.fonts && document.fonts.ready) await document.fonts.ready
      const [{ default: html2canvas }, jspdfMod] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ])
      const jsPDF = jspdfMod.jsPDF || jspdfMod.default

      // Clone dokumen ke host normal-flow (top-left 0,0) agar posisi terhitung benar
      host = document.createElement("div")
      host.className = "pdf-export-host"
      const clone = src.cloneNode(true)
      clone.classList.add("pdf-export")
      host.appendChild(clone)
      document.body.appendChild(host)

      // Render seluruh dokumen jadi satu gambar tajam
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        scrollX: 0,
        scrollY: 0,
      })

      // Pas ke A4: lebar dokumen dipetakan ke lebar konten A4,
      // tinggi tiap halaman dihitung presisi dari skala tersebut
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true })
      const pageW = 210
      const pageH = 297
      const marginX = 10
      const marginTop = 10
      const marginBottom = 10
      const contentW = pageW - marginX * 2
      const contentH = pageH - marginTop - marginBottom
      const pxPerMm = canvas.width / contentW
      const pageContentPx = contentH * pxPerMm

      // Kandidat posisi gunting: batas bawah blok utama & baris tabel
      const cloneRect = clone.getBoundingClientRect()
      const ratio = canvas.height / cloneRect.height
      const selectors = [
        "tr",
        ".doc-head",
        ".doc-accent",
        ".doc-info",
        ".doc-sum-row",
        ".doc-terbilang",
        ".doc-sign-group",
        ".doc-foot",
      ]
      const cand = new Set([canvas.height])
      selectors.forEach((s) => {
        clone.querySelectorAll(s).forEach((b) => {
          const r = b.getBoundingClientRect()
          cand.add(Math.round((r.bottom - cloneRect.top) * ratio))
        })
      })
      const sortedCuts = Array.from(cand).sort((a, b) => a - b)

      // Pilih posisi gunting: kandidat terbesar yang masih muat di halaman aktif
      const pageStarts = []
      let y = 0
      while (y < canvas.height - 2) {
        const limit = y + pageContentPx
        if (limit >= canvas.height - 2) {
          pageStarts.push(y)
          y = canvas.height
          break
        }
        let best = limit
        for (const c of sortedCuts) {
          if (c > y + 20 && c <= limit) best = c
        }
        if (best <= y) best = limit
        pageStarts.push(y)
        y = best
      }
      if (pageStarts.length === 0) pageStarts.push(0)
      if (pageStarts.length > 1 && canvas.height - pageStarts[pageStarts.length - 1] < 40) {
        pageStarts.pop()
      }

      // Gambar tiap potongan ke halaman A4
      for (let i = 0; i < pageStarts.length; i++) {
        const startY = pageStarts[i]
        const endY = i + 1 < pageStarts.length ? pageStarts[i + 1] : canvas.height
        const sliceH = endY - startY
        const slice = document.createElement("canvas")
        slice.width = canvas.width
        slice.height = sliceH
        const ctx = slice.getContext("2d")
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(0, 0, slice.width, slice.height)
        ctx.drawImage(canvas, 0, startY, canvas.width, sliceH, 0, 0, canvas.width, sliceH)
        const img = slice.toDataURL("image/jpeg", 0.95)
        if (i > 0) pdf.addPage()
        pdf.addImage(img, "JPEG", marginX, marginTop, contentW, sliceH / pxPerMm, undefined, "FAST")
      }

      const safeNomor = String(form.nomor || "memo").replace(/[^A-Za-z0-9-]/g, "-") || "memo"
      const namaFile = `Memo-${safeNomor}.pdf`

      const lampiranAktif = (attachments || []).filter((a) => a && a.dataUrl)
      if (lampiranAktif.length === 0) {
        pdf.save(namaFile)
        return
      }

      // --- Gabung memo + lampiran menjadi satu PDF (pdf-lib) ---
      const { PDFDocument } = await import("pdf-lib")
      const memoBytes = pdf.output("arraybuffer")
      const finalDoc = await PDFDocument.load(memoBytes)

      const A4W = 595.28 // A4 dalam satuan titik (pt)
      const A4H = 841.89
      const pad = 32

      for (const att of lampiranAktif) {
        const b64 = String(att.dataUrl).split(",")[1] || ""
        const bin = atob(b64)
        const bytes = new Uint8Array(bin.length)
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)

        if (att.type === "application/pdf") {
          const srcPdf = await PDFDocument.load(bytes, { ignoreEncryption: true })
          const pages = await finalDoc.copyPages(srcPdf, srcPdf.getPageIndices())
          pages.forEach((p) => finalDoc.addPage(p))
          continue
        }

        // Gambar: pas ke halaman A4 baru dengan margin, jaga proporsi
        let img
        try {
          img = await finalDoc.embedPng(bytes)
        } catch {
          try {
            img = await finalDoc.embedJpg(bytes)
          } catch {
            continue // format tidak didukung
          }
        }
        const page = finalDoc.addPage([A4W, A4H])
        const scale = Math.min((A4W - pad * 2) / img.width, (A4H - pad * 2) / img.height)
        const w = img.width * scale
        const h = img.height * scale
        page.drawImage(img, { x: (A4W - w) / 2, y: (A4H - h) / 2, width: w, height: h })
      }

      const outBytes = await finalDoc.save()
      const blob = new Blob([outBytes], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = namaFile
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 10000)
    } catch (err) {
      window.alert("Gagal membuat PDF: " + ((err && err.message) || err))
    } finally {
      if (host && host.parentNode) host.parentNode.removeChild(host)
      setPdfBusy(false)
    }
  }

  return (
    <>
      <div className="app">
      <header className="app-bar">
        <div className="container-wide app-bar-inner">
          <div className="brand">
            <span className="brand-logo">
              <img src="/tribik-logo.png" alt="PT Balai Lelang Tribik" className="brand-logo-img" />
            </span>
            <div className="brand-text">
              <h1>Memo Pembayaran</h1>
              <p>PT Balai Lelang Tribik</p>
            </div>
          </div>
          <div className="app-bar-actions no-print">
            {savedAt && (
              <span
                className="save-hint"
                title="Perubahan disimpan otomatis di browser ini"
              >
                <Icon name="check" size={13} /> Tersimpan{' '}
                {savedAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            {sheetState.status === 'sending' && (
              <span className="save-hint sheet-pending">
                <Icon name="send" size={13} /> Mengirim ke Sheet
              </span>
            )}
            {sheetState.status === 'ok' && (
              <span className="save-hint" title="Data memo terkirim ke Google Sheet">
                <Icon name="check" size={13} /> Sheet {sheetState.message}
              </span>
            )}
            {sheetState.status === 'error' && (
              <button
                type="button"
                className="save-hint sheet-error"
                onClick={() => setShowSheet(true)}
                title={sheetState.message}
              >
                <Icon name="x" size={13} /> Gagal kirim  klik untuk detail
              </button>
            )}
            <button type="button" className="btn btn-sheet" onClick={handleKirimSheet}>
              <Icon name="send" size={15} /> Kirim ke Sheet
            </button>
            <button
              type="button"
              className="icon-btn gear-btn"
              title="Pengaturan Google Sheet"
              onClick={() => setShowSheet(true)}
            >
              <Icon name="settings" size={17} />
            </button>
            <button type="button" className="btn btn-ghost" onClick={handleReset}>
              <Icon name="rotate" size={15} /> Reset
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setShowPrint(true)}>
              <Icon name="download" size={15} /> Unduh PDF
            </button>
          </div>
        </div>
      </header>

      <main className="container-wide page">
        <div className="layout">
          <div className="col-main">
            <section className="card">
              <header className="card-head">
                <span className="card-icon"><Icon name="doc" size={16} /></span>
                <div>
                  <h2>Informasi Memo</h2>
                  <p>Data utama pengajuan pembayaran</p>
                </div>
              </header>
              <MemoInfoForm
                form={form}
                onChange={(f) => patch({ form: f })}
                onGenerateNomor={() => patch({ form: { ...form, nomor: nextNomorMemo() } })}
              />
            </section>

            <section className="card">
              <header className="card-head">
                <span className="card-icon"><Icon name="list" size={16} /></span>
                <div>
                  <h2>Rincian Pengeluaran</h2>
                  <p>Tambahkan item sesuai kebutuhan  total dihitung otomatis</p>
                </div>
              </header>
              <ItemsTable
                items={items}
                onChange={(next) => patch({ items: next })}
                subtotal={subtotal}
              />
            </section>

            <section className="card">
              <header className="card-head">
                <span className="card-icon"><Icon name="paperclip" size={16} /></span>
                <div>
                  <h2>Lampiran</h2>
                  <p>Maksimal 5 berkas  digabung otomatis ke PDF memo</p>
                </div>
              </header>
              <AttachmentsSection
                attachments={attachments}
                onChange={(next) => patch({ attachments: next })}
              />
            </section>
          </div>

          <aside className="col-side">
            <SummaryCard
              subtotal={subtotal}
              dpp={dpp}
              ppnAmount={ppnAmount}
              ppnPercent={ppnPercent}
              ppnMode={ppnMode}
              onPpnModeChange={(v) => patch({ ppnMode: v })}
              onPpnPercentChange={(v) => patch({ ppnPercent: v })}
              showPpnBreakdown={showPpnBreakdown}
              onTogglePpnBreakdown={(v) => patch({ showPpnBreakdown: v })}
              grandTotal={grandTotal}
              dpPercent={dpPercent}
              dpCustom={dpCustom}
              onDpPercentChange={(v) => patch({ dpPercent: v })}
              onDpCustomChange={(v) => patch({ dpCustom: v })}
              dpNominal={dpNominal}
              sisa={sisa}
              terbilang={kataTerbilang}
            />
            <div className="side-note no-print">
              <Icon name="info" size={14} />
              <span>
                Draft tersimpan otomatis di browser. Klik <b>Unduh PDF</b> untuk
                melihat pratinjau dan jangan lupa klik kirim ke sheet untuk menyimpan
                hasil kerja di gsheet.
              </span>
            </div>
          </aside>
        </div>

        <SignatureSection
          signatures={signatures}
          onChange={(s) => patch({ signatures: s })}
          city={city}
          onCityChange={(c) => patch({ city: c })}
          tanggalText={formatTanggalID(form.tanggal)}
        />
      </main>

      <footer className="page-footer no-print">
        <span>Memo Pembayaran PT Balai Lelang Tribik</span>
        <span className="page-footer-copy">2026  E. Nugraha Wicaksono. All Rights Reserved.</span>
      </footer>
      </div>

      {/* Pratinjau & sumber cetak PDF (juga dipakai bila user menekan Ctrl+P) */}
      <div className={`print-root${showPrint ? ' open' : ''}`}>
        {showPrint && (
          <PrintModal
            onClose={() => setShowPrint(false)}
            onDownload={handleUnduhPdfFile}
            onPrint={() => window.print()}
            pdfBusy={pdfBusy}
            isInclude={ppnMode === 'include'}
            showPpnBreakdown={showPpnBreakdown}
            onTogglePpnBreakdown={(v) => patch({ showPpnBreakdown: v })}
          />
        )}
        <div
          className="print-scroll"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPrint(false)
          }}
        >
          <MemoDocument
            form={form}
            items={items}
            ppnMode={ppnMode}
            ppnPercent={ppnPercent}
            showPpnBreakdown={showPpnBreakdown}
            dpPercent={dpPercent}
            signatures={signatures}
            city={city}
            subtotal={subtotal}
            dpp={dpp}
            ppnAmount={ppnAmount}
            grandTotal={grandTotal}
            dpNominal={dpNominal}
            sisa={sisa}
            terbilang={kataTerbilang}
            attachments={attachments}
          />
        </div>
      </div>

      <SheetSettings
        open={showSheet}
        url={sheetUrl}
        lastError={sheetState.status === 'error' ? sheetState.message : ''}
        onSave={(url) => {
          simpanSheetUrl(url)
          setShowSheet(false)
          if (pendingSend && url) {
            setPendingSend(false)
            kirimKeSheetSekarang(url)
          }
        }}
        onClose={() => setShowSheet(false)}
      />
    </>
  )
}
