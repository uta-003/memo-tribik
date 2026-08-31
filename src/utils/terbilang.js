// Konversi angka menjadi kata (bahasa Indonesia) — mendukung hingga ratusan triliun

const SATUAN = [
  '', 'satu', 'dua', 'tiga', 'empat', 'lima',
  'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas',
]

function toKata(n) {
  n = Math.floor(Math.abs(n))
  if (n === 0) return ''
  if (n < 12) return SATUAN[n]
  if (n < 20) return `${toKata(n - 10)} belas`
  if (n < 100) return `${SATUAN[Math.floor(n / 10)]} puluh${n % 10 ? ` ${toKata(n % 10)}` : ''}`
  if (n < 200) return `seratus${n % 100 ? ` ${toKata(n % 100)}` : ''}`
  if (n < 1000) return `${SATUAN[Math.floor(n / 100)]} ratus${n % 100 ? ` ${toKata(n % 100)}` : ''}`
  if (n < 2000) return `seribu${n % 1000 ? ` ${toKata(n % 1000)}` : ''}`
  if (n < 1_000_000) return `${toKata(Math.floor(n / 1000))} ribu${n % 1000 ? ` ${toKata(n % 1000)}` : ''}`
  if (n < 1_000_000_000) return `${toKata(Math.floor(n / 1_000_000))} juta${n % 1_000_000 ? ` ${toKata(n % 1_000_000)}` : ''}`
  if (n < 1_000_000_000_000) return `${toKata(Math.floor(n / 1_000_000_000))} miliar${n % 1_000_000_000 ? ` ${toKata(n % 1_000_000_000)}` : ''}`
  return `${toKata(Math.floor(n / 1_000_000_000_000))} triliun${n % 1_000_000_000_000 ? ` ${toKata(n % 1_000_000_000_000)}` : ''}`
}

export function terbilang(angka) {
  const n = Math.floor(Math.abs(Number(angka) || 0))
  if (n === 0) return 'nol'
  return toKata(n).trim()
}

// Contoh: 2500000 -> "Dua juta lima ratus ribu rupiah"
export function terbilangRupiah(angka) {
  const kata = terbilang(angka)
  return `${kata.charAt(0).toUpperCase()}${kata.slice(1)} rupiah`
}
