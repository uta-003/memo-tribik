// Integrasi Google Sheet via Apps Script Web App

// Tautan spreadsheet tujuan (ditampilkan di pengaturan)
export const SHEET_LINK =
  'https://docs.google.com/spreadsheets/d/1MpzZ4oWuUdnBJoq62icId5_gXCgIpTGDsBh6H6aJwwE/edit'

export function isValidSheetUrl(url) {
  return /^https:\/\/script\.google(usercontent)?\.com\//.test(String(url || '').trim())
}

function pesanAksesDitolak() {
  return 'Akses ditolak (403) — di Apps Script buka Deploy → Manage deployments → ✏ Edit → "Who has access" pilih "Anyone" → Deploy (version: New version)'
}

function postKeAppsScript(target, body) {
  return fetch(target, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
    redirect: 'follow',
  })
}

async function bacaJson(res) {
  if (res.status === 403) throw new Error(pesanAksesDitolak())
  let data = null
  try {
    data = await res.json()
  } catch {
    throw new Error(
      `Respons bukan JSON (HTTP ${res.status}) — deploy ulang Apps Script sebagai Web app (URL berakhiran /exec)`,
    )
  }
  return data
}

// Uji koneksi: tidak menulis data apa pun, hanya memastikan deployment aktif & publik
export async function ujiKoneksi(url) {
  const target = String(url || '').trim()
  if (!isValidSheetUrl(target)) {
    throw new Error('URL belum benar — harus URL /exec dari script.google.com')
  }
  let res
  try {
    res = await postKeAppsScript(target, { test: true })
  } catch {
    throw new Error('Tidak dapat menghubungi Apps Script — cek koneksi internet')
  }
  const data = await bacaJson(res)
  if (!data || !data.ok) throw new Error((data && data.error) || 'Apps Script menolak koneksi')
  return data
}

/**
 * Kirim payload { memo, items } ke Web App Apps Script.
 * Memakai Content-Type text/plain agar tidak memicu CORS preflight
 * (Apps Script tidak menangani OPTIONS).
 */
export async function kirimKeSheet(url, payload) {
  const target = String(url || '').trim()
  if (!isValidSheetUrl(target)) {
    throw new Error('URL Web App tidak valid — harus URL /exec dari script.google.com')
  }

  let res
  try {
    res = await postKeAppsScript(target, payload)
  } catch {
    // Request terblokir sebelum sempat dijawab: hampir selalu karena
    // deployment belum publik (Google me-redirect ke halaman login) —
    // jangan pernah bohongi status "terkirim" di kondisi ini.
    throw new Error(
      'Kirim terblokir — deployment Apps Script belum publik. Di editor: Deploy → Manage deployments → ✏ Edit → "Who has access" pilih "Anyone" → Deploy (New version). Atau cek koneksi internet.',
    )
  }
  const data = await bacaJson(res)
  if (!data || !data.ok) throw new Error((data && data.error) || 'Apps Script menolak data')
  return data
}
