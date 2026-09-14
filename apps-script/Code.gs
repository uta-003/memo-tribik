/**
 * Memo Pembayaran → Google Sheet
 * 1. Buka spreadsheet -> menu Ekstensi -> Apps Script
 * 2. Tempel seluruh kode ini (ganti isi Code.gs)
 * 3. Deploy -> New deployment -> Web app
 *    - Execute as: Me
 *    - Who has access: Anyone  (WAJIB — bukan "Only myself")
 * 4. Salin URL /exec -> tempel di aplikasi Memo Pembayaran (ikon gear)
 *
 * Sudah pernah deploy? -> Deploy -> Manage deployments -> ikon pensil ->
 * "Who has access" pilih Anyone -> Version: New version -> Deploy.
 */

// Spreadsheet tujuan sudah ditanam — script bisa standalone maupun terikat.
const SPREADSHEET_ID = '1MpzZ4oWuUdnBJoq62icId5_gXCgIpTGDsBh6H6aJwwE';

const SHEET_MEMO = 'Memo';
const SHEET_RINCIAN = 'Rincian';

function getSS_() {
  if (SPREADSHEET_ID) {
    try {
      return SpreadsheetApp.openById(SPREADSHEET_ID);
    } catch (err) {
      // lanjut ke fallback spreadsheet aktif
    }
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

const MEMO_HEADERS = ['Timestamp', 'Nomor Memo', 'Tanggal', 'Dibayar Kepada', 'No. Rek / VA', 'Nama Bank', 'Cabang Bank', 'Divisi', 'Subtotal (Rp)', 'Mode PPN', 'Tarif PPN (%)', 'PPN (Rp)', 'Grand Total (Rp)', 'DP (%)', 'DP (Rp)', 'Sisa Pembayaran (Rp)', 'Terbilang', 'Pemohon', 'Mengetahui 1', 'Mengetahui 2', 'Menyetujui 1', 'Menyetujui 2', 'Lampiran'];
const RINCIAN_HEADERS = ['Timestamp', 'Nomor Memo', 'Keterangan Pengeluaran', 'QTY', 'Harga Satuan (Rp)', 'Total (Rp)'];

function doGet() {
  const ss = getSS_();
  if (ss) ensureSheets_(ss);
  return json_({ ok: true, message: 'Memo Pembayaran siap menerima data (POST)' });
}

// Jalankan SEKALI dari editor Apps Script (pilih setupSheet -> Run) untuk
// membuat tabel Memo & Rincian segera — tanpa perlu deployment.
function setupSheet() {
  const ss = getSS_();
  if (!ss) throw new Error('Spreadsheet tidak ditemukan — cek SPREADSHEET_ID');
  ensureSheets_(ss);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (!e || !e.postData) throw new Error('Body kosong');
    const data = JSON.parse(e.postData.contents);
    if (data.test) {
      return json_({ ok: true, message: 'Koneksi berhasil — deployment aktif & berakses publik' });
    }
    const memo = data.memo || {};
    const items = Array.isArray(data.items) ? data.items : [];
    const ss = getSS_();
    if (!ss) throw new Error('Spreadsheet tidak ditemukan');
    ensureSheets_(ss);
    const memoSheet = ss.getSheetByName(SHEET_MEMO);
    const rincianSheet = ss.getSheetByName(SHEET_RINCIAN);
    const now = new Date();
    const nomor = String(memo.nomor || '');

    const sig = function (g, i) {
      const m = (memo.signatures && memo.signatures[g] && memo.signatures[g][i]) || {};
      const nama = String(m.nama || '').trim();
      const jabatan = String(m.jabatan || '').trim();
      return [nama, jabatan].filter(Boolean).join(' - ');
    };

    const memoRow = [now, nomor, memo.tanggal ? new Date(memo.tanggal) : '', memo.dibayarKe, memo.noRek, memo.namaBank, memo.cabangBank, memo.divisi, toNum_(memo.subtotal), memo.ppnMode, toNum_(memo.ppnPercent), toNum_(memo.ppnAmount), toNum_(memo.grandTotal), toNum_(memo.dpPercent), toNum_(memo.dpNominal), toNum_(memo.sisa), memo.terbilang, sig('pemohon', 0), sig('mengetahui', 0), sig('mengetahui', 1), sig('menyetujui', 0), sig('menyetujui', 1), memo.lampiran];

    const rowLama = cariBaris_(memoSheet, 'Nomor Memo', nomor);
    if (rowLama > 0) {
      memoSheet.getRange(rowLama, 1, 1, memoRow.length).setValues([memoRow]);
    } else {
      memoSheet.appendRow(memoRow);
    }

    // Rincian: hapus baris lama dengan nomor sama, lalu tulis ulang (idempoten)
    const barisHapus = cariSemuaBaris_(rincianSheet, 'Nomor Memo', nomor);
    for (let i = barisHapus.length - 1; i >= 0; i--) rincianSheet.deleteRow(barisHapus[i]);
    items.forEach(function (it) {
      rincianSheet.appendRow([now, nomor, it.keterangan, toNum_(it.qty), toNum_(it.harga), toNum_(it.total)]);
    });

    return json_({ ok: true, nomor: nomor, barisRincian: items.length, diperbarui: rowLama > 0 });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Buat sheet Memo & Rincian bila belum ada (dengan header rapi + freeze)
function ensureSheets_(ss) {
  getOrCreateSheet_(ss, SHEET_MEMO, MEMO_HEADERS);
  getOrCreateSheet_(ss, SHEET_RINCIAN, RINCIAN_HEADERS);
}

function getOrCreateSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#fdecec');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function cariBaris_(sheet, header, nilai) {
  const semua = cariSemuaBaris_(sheet, header, nilai);
  return semua.length ? semua[0] : 0;
}

function cariSemuaBaris_(sheet, header, nilai) {
  if (!nilai) return [];
  const col = cariKolom_(sheet, header);
  if (col < 1) return [];
  const values = sheet.getDataRange().getValues();
  const hasil = [];
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][col - 1]) === String(nilai)) hasil.push(i + 1);
  }
  return hasil;
}

function cariKolom_(sheet, header) {
  const last = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet.getRange(1, 1, 1, last).getValues()[0];
  for (let i = 0; i < headers.length; i++) {
    if (String(headers[i]).trim() === header) return i + 1;
  }
  return 0;
}

function toNum_(v) {
  const n = Number(v);
  return isFinite(n) ? n : 0;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
