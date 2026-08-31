# Memo Pembayaran

Form pengajuan pembayaran internal (memo) berbasis **React + Vite**. Isian
tersimpan otomatis di browser (localStorage) dan siap dicetak ke A4 / disimpan
sebagai PDF lewat tombol **Cetak / PDF**.

## Fitur

- **Informasi Memo** — Nomor Memo, Dibayar Kepada, No. Rek / VA, Tanggal
  (terisi otomatis hari ini), Divisi (ada saran), Nama Bank (ada saran).
- **Tabel Rincian Pengeluaran** — No, Keterangan, QTY, Harga Satuan, dan Total
  per baris (dihitung otomatis). Baris bisa ditambah/dihapus, plus baris
  Subtotal.
- **Ringkasan Pembayaran** — pilihan **Exclude PPN / Include PPN** (tarif PPN
  bisa diubah, default 11%), **Grand Total**, **DP** dengan pilihan persen
  (preset 0–50% + input "Lainnya"), **Sisa Pembayaran**.
- **Terbilang** — Grand Total dikonversi otomatis ke huruf
  (contoh: `#Dua juta lima ratus ribu rupiah#`).
- **Kolom Tanda Tangan** — Pemohon (1), Mengetahui (2), Menyetujui (2),
  masing-masing berisi Nama (Jabatan), lengkap dengan kota & tanggal.
- **Nomor Memo Otomatis** — format `TRB/Tahun/Bulan Romawi/No. Urut`
  (contoh: `TRB/2026/VIII/001`). No. urut naik otomatis dan **reset setiap
  awal bulan**; bisa dibuat ulang lewat tombol ↻ di samping field.
- **Unduh PDF** — pratinjau dokumen A4 (kop, tabel, ringkasan, terbilang,
  TTD) dalam modal; unduh lewat dialog cetak dengan tujuan *Save as PDF*
  (hasil teks vektor, tajam & presisi).
- **Kirim ke Google Sheet** — semua data memo (ringkasan + rincian per item)
  masuk ke spreadsheet lewat Apps Script Web App; kirim ulang dengan nomor
  yang sama memperbarui baris (tidak duplikat). Lihat bagian
  [Kirim ke Google Sheet](#kirim-ke-google-sheet).
- UI modern & responsif, draft tersimpan otomatis.

## Menjalankan

```bash
npm install
npm run dev
```

Buka URL yang muncul (default `http://localhost:5173`).

## Build produksi

```bash
npm run build
npm run preview   # pratinjau hasil build
```

## Struktur

```
src/
├── App.jsx                      # state utama + kalkulasi + layout
├── main.jsx                     # entry point
├── components/
│   ├── MemoInfoForm.jsx         # form informasi memo
│   ├── ItemsTable.jsx           # tabel rincian pengeluaran
│   ├── SummaryCard.jsx          # PPN, DP, sisa, grand total, terbilang
│   ├── SignatureSection.jsx     # kolom tanda tangan
│   ├── MemoDocument.jsx         # dokumen A4 untuk pratinjau & PDF
│   ├── PrintModal.jsx           # modal pratinjau unduh PDF
│   └── icons.jsx                # ikon SVG inline
├── styles/
│   ├── base.css                 # token desain, layout, tombol, input
│   ├── components.css           # tabel, ringkasan, TTD, responsif
│   └── document.css             # dokumen PDF, modal pratinjau, @media print
└── utils/
    ├── format.js                # format rupiah & tanggal (id-ID)
    ├── memoNumber.js            # nomor memo otomatis TRB/tahun/romawi/urut
    ├── gsheet.js                # kirim data ke Google Sheet (Apps Script)
    ├── appsScriptCode.js        # teks kode Apps Script untuk tombol Salin
    └── terbilang.js             # angka -> kata (bahasa Indonesia)

apps-script/Code.gs              # kode untuk spreadsheet (Ekstensi → Apps Script)

## Kirim ke Google Sheet

Data memo (ringkasan + rincian per item) dapat dikirim ke spreadsheet:

1. Buka aplikasi → klik ikon **⚙** di kanan atas.
2. Ikuti langkah **"Setup sekali saja"**: buka spreadsheet → **Ekstensi →
   Apps Script**, tempel kode dari tombol **Salin Kode**, lalu
   **Deploy → New deployment → Web app** (Execute as: *Me*, Who has access:
   *Anyone*).
3. Salin URL **/exec** yang muncul → tempel di kolom URL → **Simpan URL**.
4. Klik **Kirim ke Sheet** — sheet **Memo** berisi 1 baris per memo; sheet
   **Rincian** berisi 1 baris per item pengeluaran.

Kirim ulang dengan nomor memo yang sama akan **memperbarui** baris yang sudah
ada (tidak menduplikat data).
```
