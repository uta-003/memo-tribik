// Nomor memo otomatis: TRB/Tahun/Bulan Romawi/No. Urut
// Contoh: TRB/2026/VIII/001 — no. urut reset setiap awal bulan.

const ROMAWI = [
  'I', 'II', 'III', 'IV', 'V', 'VI',
  'VII', 'VIII', 'IX', 'X', 'XI', 'XII',
]

const COUNTER_KEY = 'memo-pembayaran-counter-v1'

export function bulanRomawi(monthIndex) {
  return ROMAWI[monthIndex] ?? ''
}

export function formatNomorMemo(tanggal, urut) {
  const t = tanggal instanceof Date ? tanggal : new Date(tanggal)
  const tahun = t.getFullYear()
  const roman = bulanRomawi(t.getMonth())
  const noUrut = String(urut).padStart(3, '0')
  return `TRB/${tahun}/${roman}/${noUrut}`
}

const ROMAWI_PERIODE = [
  'I', 'II', 'III', 'IV', 'V', 'VI',
  'VII', 'VIII', 'IX', 'X', 'XI', 'XII',
]

// Ambil periode (tahun-bulan) dari nomor memo "TRB/2026/VIII/001".
// Kembalikan null bila format tidak dikenali (tidak valid / kosong).
export function periodeNomor(nomor) {
  const m = /^TRB\/(\d{4})\/([IVXLC]+)\/(\d{3})$/.exec(String(nomor || '').trim())
  if (!m) return null
  return { tahun: Number(m[1]), bulan: ROMAWI_PERIODE.indexOf(m[2]) + 1 }
}

// Kunci bulan berjalan: "2026-08" — berganti tiap awal bulan → penghitung reset
function kunciBulan(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function nextNomorMemo() {
  const now = new Date()
  const key = kunciBulan(now)

  // Tanpa browser (SSR/uji) — kembalikan nomor tanpa menyimpan penghitung
  if (typeof window === 'undefined' || !window.localStorage) {
    return formatNomorMemo(now, 1)
  }

  let last = 0
  let savedKey = null
  try {
    const raw = JSON.parse(window.localStorage.getItem(COUNTER_KEY) || 'null')
    if (raw && typeof raw.last === 'number') {
      last = raw.last
      savedKey = raw.key
    }
  } catch {
    /* penghitung rusak → mulai dari 1 */
  }

  const urut = savedKey === key ? last + 1 : 1
  try {
    window.localStorage.setItem(COUNTER_KEY, JSON.stringify({ key, last: urut }))
  } catch {
    /* penyimpanan tidak tersedia — nomor tetap dikembalikan */
  }
  return formatNomorMemo(now, urut)
}
