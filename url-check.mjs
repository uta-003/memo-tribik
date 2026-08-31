// Uji langsung URL Apps Script pengguna (dari Node, tanpa batasan CORS browser)
const URL_APPSCRIPT =
  'https://script.google.com/macros/s/AKfycbzR-xu-Xa6QrhyKmP7Wintjp2FLemk0rF66hUoPmRBl1jw6t-qZsS9UxOY3Z9frni1a0A/exec'

async function main() {
  console.log('=== 1. GET (cek deployment & doGet) ===')
  try {
    const r = await fetch(URL_APPSCRIPT, { redirect: 'follow' })
    const t = await r.text()
    console.log('Status:', r.status)
    console.log('Final URL:', r.url)
    console.log('Body (400 char pertama):', t.slice(0, 400))
  } catch (e) {
    console.log('GET error:', e.message)
  }

  console.log('\n=== 2. POST (simulasi persis seperti dari browser) ===')
  const payload = {
    memo: {
      nomor: 'UJI-KONEKSI',
      tanggal: '2026-08-29',
      dibayarKe: 'Uji koneksi (boleh dihapus)',
      noRek: '',
      namaBank: '',
      divisi: '',
      subtotal: 100000,
      ppnMode: 'exclude',
      ppnPercent: 11,
      ppnAmount: 11000,
      grandTotal: 111000,
      dpPercent: 0,
      dpNominal: 0,
      sisa: 111000,
      terbilang: 'Seratus sebelas ribu rupiah',
      signatures: { pemohon: [{ nama: '', jabatan: '' }], mengetahui: [{ nama: '', jabatan: '' }, { nama: '', jabatan: '' }], menyetujui: [{ nama: '', jabatan: '' }, { nama: '', jabatan: '' }] },
    },
    items: [{ keterangan: 'Uji koneksi (boleh dihapus)', qty: 1, harga: 100000, total: 100000 }],
  }
  try {
    const r = await fetch(URL_APPSCRIPT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
    })
    const t = await r.text()
    console.log('Status:', r.status)
    console.log('Body (400 char pertama):', t.slice(0, 400))
    console.log('\nJSON valid?', (() => { try { JSON.parse(t); return 'YA' } catch { return 'TIDAK (kemungkinan HTML/login page)' } })())
  } catch (e) {
    console.log('POST error:', e.message)
  }
}

main()
