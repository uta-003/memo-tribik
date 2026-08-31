// Utilitas format angka & tanggal (locale Indonesia)

export function formatNumber(value) {
  const n = Math.round(Number(value) || 0)
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n)
}

export function formatRupiah(value) {
  return `Rp ${formatNumber(value)}`
}

// Ambil hanya digit dari input, lalu ubah menjadi Number
export function parseDigits(raw) {
  const digits = String(raw).replace(/[^\d]/g, '').slice(0, 15)
  return digits ? Number(digits) : 0
}

const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

// "2026-08-29" -> "29 Agustus 2026" (aman dari isu timezone)
export function formatTanggalID(isoDate) {
  if (!isoDate) return ''
  const [y, m, d] = isoDate.split('-').map(Number)
  if (!y || !m || !d) return isoDate
  return `${d} ${BULAN[m - 1]} ${y}`
}

// Tanggal hari ini dalam format ISO lokal (bukan UTC)
export function todayISO() {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

// ID unik untuk key baris tabel
export function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
