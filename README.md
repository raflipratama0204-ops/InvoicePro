# InvoicePro - Aplikasi Pembuat Invoice Penjualan & Ekspor PDF

Aplikasi web modern, cepat, dan profesional untuk membuat, mengelola, serta mencetak faktur/invoice penjualan ke format PDF standar ukuran A4 dengan mata uang Rupiah (Rp).

---

## 🌟 Fitur Utama

1. **Input Data Cepat & Lengkap**:
   - **Profil Toko / Penjual**: Nama usaha, slogan, alamat, telepon/WhatsApp, email, NPWP, dan upload logo bisnis.
   - **Tombol "Jadikan Toko Default"**: Simpan data toko Anda ke browser sehingga tidak perlu mengetik ulang setiap kali membuat invoice baru.
   - **Detail Pelanggan**: Nama pelanggan/perusahaan, PIC (Up), nomor HP/WA, email, alamat penagihan (*Billing Address*), dan alamat pengiriman (*Shipping Address*).
   - **Metadata Faktur**: Nomor invoice (dengan tombol generator nomor acak/otomatis), tanggal terbit, tanggal jatuh tempo, dan status pembayaran.

2. **Tabel Item Penjualan Dinamis**:
   - Tambah baris barang/jasa tanpa batas.
   - Kolom nama barang, deskripsi/spesifikasi tambahan, kuantitas (Qty), satuan (Pcs, Unit, Jam, Box, dll), harga satuan (Rp), dan potongan diskon per item.
   - Subtotal per baris terhitung otomatis secara *real-time*.
   - Fitur **Salin / Duplikat Baris** dan **Hapus Baris**.

3. **Perhitungan Finansial Komprehensif & Terbilang Otomatis**:
   - Subtotal otomatis.
   - Diskon tambahan (pilihan nominal Rp atau persentase %).
   - Pajak Pertambahan Nilai (PPN 11%, 12%, 10%, 5%, atau tanpa PPN).
   - Ongkos kirim / biaya ekspedisi.
   - Biaya lainnya / materai / biaya administrasi.
   - **Grand Total (Total Tagihan)**.
   - **Fitur Terbilang Otomatis**: Mengonversi total angka tagihan ke kalimat bahasa Indonesia resmi (misal: *"Tiga Puluh Lima Juta Sembilan Ratus Ribu Rupiah"*).
   - Dukungan Uang Muka (DP) & Sisa Tagihan (*Balance Due*).

4. **Rekening Pembayaran & Catatan Resmi**:
   - Tambah multi rekening bank (BCA, Mandiri, BRI, BNI, QRIS, e-wallet, dll).
   - Catatan tambahan (garansi, ucapan terima kasih).
   - Syarat & Ketentuan pembayaran.

5. **Tanda Tangan Digital & Stempel**:
   - **Kanvas Tanda Tangan Digital**: Buat goresan tanda tangan langsung menggunakan kursor mouse, touchpad, atau stylus / sentuhan layar.
   - Upload stempel / gambar tanda tangan transparan.
   - Stempel Status Otomatis (*PAID / LUNAS watermark stamp*).

6. **Pilihan Tema & Desain Profesional**:
   - Pilihan warna tema: Biru Modern (*Default*), Hijau Zamrud, Navy Korporat, Ungu Premium, Slate Monokrom, dan Merah Crimson.
   - Tata letak presisi A4 standar internasional.

7. **Ekspor PDF & Cetak**:
   - **Tombol "Download PDF"**: Menghasilkan file PDF berkualitas tinggi, tajam, dan tidak terpotong dengan penamaan otomatis sesuai nomor invoice dan nama pelanggan.
   - **Tombol "Cetak A4"**: Dialog print langsung terkonfigurasi untuk printer fisik maupun fitur *Save to PDF* bawaan browser.

8. **Tabel Data Penjualan & Dashboard Transaksi**:
   - Menu khusus **"📊 Data Penjualan"** di bilah navigasi atas.
   - **Kartu Statistik (KPI)**: Total omset penjualan, total pembayaran lunas, total piutang/belum lunas, dan rata-rata nilai transaksi.
   - **Tabel Data Transaksi Lengkap**: No, Nomor Invoice, Tanggal, Pelanggan, Rincian Barang Terjual, Total Penjualan, Status Pembayaran, dan Tombol Aksi (Edit, Unduh PDF langsung, dan Hapus).
   - **Pencarian Cepat & Filter Cerdas**: Cari berdasarkan nomor faktur, nama klien, atau nama barang; filter berdasarkan status (Lunas, Belum Lunas, DP, Jatuh Tempo); dan sortir berdasarkan tanggal atau nilai rupiah.
   - **Ekspor Excel (CSV)**: Ekspor seluruh daftar transaksi penjualan ke file CSV dengan format UTF-8 BOM yang langsung rapi di Microsoft Excel.
   - **Cetak Laporan**: Cetak tabel data penjualan dengan tata letak dokumen bersih.

9. **Penyimpanan Lokal (Riwayat & Backup)**:
   - Simpan invoice yang sedang dibuat ke LocalStorage browser.
   - Buka kembali invoice lama dari modal riwayat atau langsung dari tabel data penjualan.
   - Ekspor seluruh data invoice ke format file `.json` untuk cadangan (*backup*).
   - Pulihkan/impor data dari file `.json`.

---

## 🚀 Cara Menjalankan Aplikasi

Aplikasi ini dapat langsung digunakan dengan **3 cara mudah**:

### Cara 1: Langsung Klik Dua Kali (Paling Praktis)
1. Buka folder `c:\Rafli\Pembuat Invoice`.
2. Klik dua kali file **`Buka_Aplikasi.bat`** atau file **`index.html`**.
3. Aplikasi akan langsung terbuka di peramban (Google Chrome, Microsoft Edge, Mozilla Firefox, dll).

### Cara 2: Menjalankan Server Node.js
Jika Anda memiliki Node.js di komputer:
```bash
node server.js
```
atau
```bash
npm start
```
Buka browser dan akses alamat: **`http://localhost:3000`**

---

## 📁 Struktur File Proyek

```
Pembuat Invoice/
├── index.html             # Tampilan antarmuka utama aplikasi (Dual split screen)
├── Buka_Aplikasi.bat      # File pintasan Windows untuk membuka aplikasi sekali klik
├── server.js              # Server lokal Node.js ringan (tanpa dependency luar)
├── package.json           # Konfigurasi proyek npm
├── README.md              # Dokumentasi lengkap
├── css/
│   └── style.css          # Desain stylesheet, layout responsif, tema, dan styling cetak A4
├── js/
│   ├── app.js             # Logika utama aplikasi, perhitungan angka, terbilang bahasa Indonesia
│   ├── pdf-export.js      # Mesin ekspor PDF dan konfigurasi cetak A4
│   └── storage.js         # Pengelolaan penyimpanan riwayat invoice & profil toko (LocalStorage)
└── libs/
    ├── html2pdf.bundle.min.js  # Library pembuat PDF berkualitas tinggi
    ├── lucide.min.js           # Ikon modern
    └── signature_pad.umd.min.js # Kanvas tanda tangan digital interaktif
```

---

## 💡 Panduan Cepat Penggunaan

1. **Langkah 1**: Sesuaikan informasi usaha Anda di panel kiri (Nama Toko, Alamat, Logo, No. HP, No Rekening). Klik tombol **"★ Jadikan Toko Default"** agar tersimpan permanen.
2. **Langkah 2**: Masukkan nama pelanggan dan nomor invoice.
3. **Langkah 3**: Masukkan daftar barang atau jasa yang dijual, jumlah kuantitas, serta harga satuan.
4. **Langkah 4**: Tentukan jika ada potongan diskon, PPN (11%), atau ongkos kirim.
5. **Langkah 5**: Tambahkan tanda tangan digital dengan mengklik tombol **"✍️ Gambar TTD Digital"**.
6. **Langkah 6**: Periksa pratinjau invoice di panel kanan (*Live Preview*). Jika sudah sesuai, klik tombol biru **"📥 Download PDF"** di pojok kanan atas!

