import { useEffect, useMemo, useState } from 'react'
import MemoInfoForm from './components/MemoInfoForm.jsx'
import ItemsTable from './components/ItemsTable.jsx'
import SummaryCard from './components/SummaryCard.jsx'
import SignatureSection from './components/SignatureSection.jsx'
import MemoDocument from './components/MemoDocument.jsx'
import PrintModal from './components/PrintModal.jsx'
import SheetSettings from './components/SheetSettings.jsx'
import Icon from './components/icons.jsx'
import { formatTanggalID, todayISO, uid } from './utils/format.js'
import { terbilangRupiah } from './utils/terbilang.js'
import { nextNomorMemo } from './utils/memoNumber.js'
import { kirimKeSheet } from './utils/gsheet.js'

const STORAGE_KEY = 'memo-pembayaran-draft-v1'
const SHEET_URL_KEY = 'memo-pembayaran-gsheet-url-v1'

// Nomor memo pertama per sesi halaman — di-cache agar aman dari
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
    },
    items: [buatBaris()],
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
    if (typeof window === 'undefined') return ''
    try {
      return window.localStorage.getItem(SHEET_URL_KEY) || ''
    } catch {
      return ''
    }
  })
  const [showSheet, setShowSheet] = useState(false)
  const [pendingSend, setPendingSend] = useState(false)
  const [sheetState, setSheetState] = useState({ status: 'idle', message: '' })
  const {
    form, items, ppnMode, ppnPercent, dpPercent, dpCustom, signatures, city,
    showPpnBreakdown,
  } = state

  const patch = (partial) => setState((s) => ({ ...s, ...partial }))

  // Autosave draft ke localStorage (debounce 400ms)
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
        setSavedAt(new Date())
      } catch {
        /* penyimpanan tidak tersedia — abaikan */
      }
    }, 400)
    return () => clearTimeout(t)
  }, [state])

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
      /* penyimpanan tidak tersedia — URL tetap dipakai sesi ini */
    }
  }

  const kirimKeSheetSekarang = async (url) => {
    setSheetState({ status: 'sending', message: 'Mengirim…' })
    try {
      const payload = {
        memo: {
          nomor: form.nomor,
          tanggal: form.tanggal,
          dibayarKe: form.dibayarKe,
          noRek: form.noRek,
          namaBank: form.namaBank,
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

  return (
    <>
      <div className="app">
      <header className="app-bar">
        <div className="container-wide app-bar-inner">
          <div className="brand">
            <span className="brand-logo"><Icon name="doc" size={20} /></span>
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
                <Icon name="send" size={13} /> Mengirim ke Sheet…
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
                <Icon name="x" size={13} /> Gagal kirim — klik untuk detail
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
                  <p>Tambahkan item sesuai kebutuhan — total dihitung otomatis</p>
                </div>
              </header>
              <ItemsTable
                items={items}
                onChange={(next) => patch({ items: next })}
                subtotal={subtotal}
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
                melihat pratinjau dan menyimpan memo sebagai PDF (siap A4).
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
        <span>Memo Pembayaran • PT Balai Lelang Tribik</span>
        <span className="page-footer-copy">2026 © E. Nugraha Wicaksono. All Rights Reserved.</span>
      </footer>
      </div>

      {/* Pratinjau & sumber cetak PDF (juga dipakai bila user menekan Ctrl+P) */}
      <div className={`print-root${showPrint ? ' open' : ''}`}>
        {showPrint && (
          <PrintModal
            onClose={() => setShowPrint(false)}
            onDownload={() => window.print()}
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

