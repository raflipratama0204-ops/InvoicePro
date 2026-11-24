/**
 * InvoicePro - Product & Catalog Management Subsystem
 * Manages product database, real-time autocomplete suggestions, Excel/CSV bulk import, and official templates.
 */

// Known Indonesian & English units for smart auto-detection
const KNOWN_CATALOG_UNITS = new Set([
  'pcs', 'pc', 'unit', 'unt', 'set', 'buah', 'bh', 'lembar', 'lbr', 'rim',
  'box', 'bx', 'dus', 'kotak', 'pak', 'pack', 'pck', 'kg', 'kilogram',
  'gram', 'gr', 'g', 'mg', 'meter', 'm', 'cm', 'liter', 'l', 'ml',
  'botol', 'btl', 'kaleng', 'klg', 'lusin', 'lsn', 'kodi', 'gross',
  'pasang', 'psg', 'roll', 'rol', 'ikat', 'karung', 'zak', 'sak',
  'can', 'pail', 'drum', 'tube', 'batang', 'btg', 'tablet', 'strip',
  'kapsul', 'vial', 'ampul', 'porsi', 'jam', 'hari', 'bulan', 'tahun',
  'orang', 'org', 'paket', 'sesi', 'titik', 'eksemplar', 'eks'
]);

let pendingImportProducts = [];

// Helper to classify Excel header accurately without cross-matching bugs
function classifyCatalogColumn(rawKey) {
  const k = String(rawKey || '').toLowerCase().trim();
  const norm = k.replace(/[\s_\-./\\()\[\]{}'"]+/g, '');

  // 1. PRICE (Highest priority: any column containing 'harga', 'price', 'tarif', 'biaya', 'rate', 'rp', etc.)
  if (
    norm.includes('harga') ||
    norm.includes('price') ||
    norm.includes('tarif') ||
    norm.includes('biaya') ||
    norm.includes('rate') ||
    norm === 'rp' ||
    norm === 'idr' ||
    k.includes('(rp)') ||
    k.includes('[rp]')
  ) {
    return 'PRICE';
  }

  // 2. QUANTITY / JUMLAH (e.g. 'Jumlah Satuan', 'Qty', 'Banyaknya')
  if (
    norm.includes('jumlah') ||
    norm.includes('kuantitas') ||
    norm.includes('qty') ||
    norm.includes('quantity') ||
    norm.includes('banyak') ||
    norm.includes('stok') ||
    norm.includes('stock')
  ) {
    return 'QTY';
  }

  // 3. SATUAN / UNIT (Unit of Measure: Pcs, Unit, Box, Rim, etc.)
  if (
    norm === 'satuan' ||
    norm === 'unit' ||
    norm === 'uom' ||
    norm === 'kemasan' ||
    norm === 'packaging' ||
    norm === 'satuanbarang' ||
    norm === 'satuanproduk' ||
    norm === 'satuanitem' ||
    norm === 'jenissatuan' ||
    norm === 'measure' ||
    norm.startsWith('satuan') ||
    norm.endsWith('satuan') ||
    norm.includes('satuan')
  ) {
    return 'UNIT';
  }

  // 4. NAMA BARANG
  if (
    norm.includes('namabarang') ||
    norm.includes('namaproduk') ||
    norm.includes('namaitem') ||
    norm.includes('itemname') ||
    norm.includes('productname') ||
    norm === 'nama' ||
    norm === 'name' ||
    norm === 'barang' ||
    norm === 'produk' ||
    norm === 'item' ||
    norm === 'deskripsibarang' ||
    norm === 'namabarangjasa'
  ) {
    return 'NAME';
  }

  // 5. SPESIFIKASI / DESKRIPSI
  if (
    norm.includes('spesifikasi') ||
    norm.includes('spek') ||
    norm.includes('spec') ||
    norm.includes('deskripsi') ||
    norm.includes('desc') ||
    norm.includes('keterangan') ||
    norm.includes('detail') ||
    norm.includes('catatan') ||
    norm.includes('note')
  ) {
    return 'DESC';
  }

  return 'UNKNOWN';
}

function normalizeUnitLabel(unitStr) {
  if (!unitStr) return 'Pcs';
  const clean = String(unitStr).trim();
  const lower = clean.toLowerCase();
  if (lower === 'pcs' || lower === 'pc') return 'Pcs';
  if (lower === 'unit' || lower === 'unt') return 'Unit';
  if (lower === 'buah' || lower === 'bh') return 'Buah';
  if (lower === 'rim') return 'Rim';
  if (lower === 'box' || lower === 'bx' || lower === 'dus' || lower === 'kotak') return 'Box';
  if (lower === 'pak' || lower === 'pack' || lower === 'pck') return 'Pak';
  if (lower === 'set') return 'Set';
  if (lower === 'lembar' || lower === 'lbr') return 'Lembar';
  if (lower === 'kg' || lower === 'kilogram') return 'Kg';
  if (lower === 'gram' || lower === 'gr' || lower === 'g') return 'Gram';
  if (lower === 'liter' || lower === 'l') return 'Liter';
  if (lower === 'meter' || lower === 'm') return 'Meter';
  if (lower === 'botol' || lower === 'btl') return 'Botol';
  if (lower === 'lusin' || lower === 'lsn') return 'Lusin';
  if (lower === 'roll' || lower === 'rol') return 'Roll';
  if (lower === 'pasang' || lower === 'psg') return 'Pasang';
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

// Download template Excel for catalog import
function downloadCatalogExcelTemplate() {
  if (typeof XLSX === 'undefined') {
    showToast('Library Excel belum siap', 'error');
    return;
  }
  const wb = XLSX.utils.book_new();
  const wsData = [
    ['Nama Barang', 'Spesifikasi', 'Satuan', 'Harga Satuan'],
    ['Kertas HVS A4 80gr', 'PaperOne 80gr 500 lembar', 'Rim', 55000],
    ['Tinta Printer Epson L3110', 'Warna Hitam T664', 'Botol', 95000],
    ['Kabel LAN Cat6 1.5m', 'Belden original RJ45', 'Pcs', 25000],
    ['Flashdisk 32GB USB 3.0', 'Sandisk Cruzer Blade garansi 5 tahun', 'Unit', 65000]
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [{ wch: 30 }, { wch: 42 }, { wch: 12 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Template Katalog');
  XLSX.writeFile(wb, 'Template_Katalog_Barang.xlsx');
  showToast('Template Excel berhasil diunduh!');
}

// Parse uploaded Excel or CSV file
function handleCatalogExcelFile(file) {
  if (!file) return;
  if (typeof XLSX === 'undefined') {
    showToast('Library Excel belum dimuat dengan benar', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        showToast('File Excel tidak memiliki lembar kerja (sheet)', 'error');
        return;
      }
      const worksheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (!rows || rows.length === 0) {
        showToast('File Excel kosong atau tidak ada data', 'error');
        return;
      }

      const parsed = [];
      rows.forEach(r => {
        let name = '';
        let desc = '';
        let unit = '';
        let price = 0;
        let unmapped = [];

        Object.keys(r).forEach(k => {
          const rawVal = r[k];
          if (rawVal === undefined || rawVal === null) return;
          const val = String(rawVal).trim();
          if (!val) return;

          const colType = classifyCatalogColumn(k);

          if (colType === 'NAME') {
            if (!name) name = val;
          } else if (colType === 'DESC') {
            if (!desc) desc = val;
          } else if (colType === 'UNIT') {
            const digitsOnly = val.replace(/[Rp\s.,]/g, '');
            if (!/^\d+$/.test(digitsOnly)) {
              if (!unit) unit = val;
            } else {
              if (price === 0) {
                const p = parseInt(val.replace(/[^\d]/g, ''), 10);
                if (p > 0) price = p;
              }
            }
          } else if (colType === 'PRICE') {
            const cleanDigits = val.replace(/[^\d]/g, '');
            if (cleanDigits) {
              const p = parseInt(cleanDigits, 10);
              if (p > 0 || price === 0) price = p;
            }
          } else if (colType === 'QTY') {
            // Ignored for catalog price, prevents misdetection
          } else {
            unmapped.push({ key: k, val: val });
          }
        });

        // 1. If unit wasn't found in a 'UNIT' column, check unmapped columns for known unit words
        if (!unit) {
          for (const item of unmapped) {
            const lower = item.val.toLowerCase().trim();
            if (KNOWN_CATALOG_UNITS.has(lower)) {
              unit = item.val;
              break;
            }
          }
        }

        // 2. If name wasn't found, check unmapped text
        if (!name) {
          for (const item of unmapped) {
            const lower = item.val.toLowerCase().trim();
            if (item.val && isNaN(Number(item.val)) && !KNOWN_CATALOG_UNITS.has(lower)) {
              name = item.val;
              break;
            }
          }
        }

        unit = normalizeUnitLabel(unit);

        if (name) {
          parsed.push({
            name: name,
            description: desc,
            unit: unit || 'Pcs',
            price: price || 0
          });
        }
      });

      if (parsed.length === 0) {
        showToast('Tidak ada data produk yang terbaca. Pastikan ada kolom "Nama Barang" dan "Harga Satuan"', 'error');
        return;
      }

      pendingImportProducts = parsed;
      showImportPreviewModal(file.name, parsed);

    } catch (err) {
      console.error('Error reading Excel file:', err);
      showToast('Gagal memproses file Excel: ' + err.message, 'error');
    }
  };
  reader.readAsArrayBuffer(file);
}

// Show import preview modal
function showImportPreviewModal(fileName, parsedProducts) {
  const modal = document.getElementById('modal-import-catalog');
  if (!modal) return;

  const nameEl = document.getElementById('import-file-name');
  const countEl = document.getElementById('import-row-count');
  if (nameEl) nameEl.textContent = fileName || 'File Excel';
  if (countEl) countEl.textContent = `Ditemukan ${parsedProducts.length} produk siap diimpor`;

  const tbody = document.getElementById('import-preview-table-body');
  if (tbody) {
    tbody.innerHTML = '';
    const previewSlice = parsedProducts.slice(0, 20);
    previewSlice.forEach((p, idx) => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-50 transition';
      tr.innerHTML = `
        <td class="py-2 px-3 text-center text-slate-400 font-medium">${idx + 1}</td>
        <td class="py-2 px-3 font-bold text-slate-800">${escapeHtml(p.name)}</td>
        <td class="py-2 px-3 text-slate-500 text-[11px] max-w-xs truncate">${escapeHtml(p.description || '-')}</td>
        <td class="py-2 px-3 text-center"><span class="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700 text-[11px]">${escapeHtml(p.unit || 'Pcs')}</span></td>
        <td class="py-2 px-3 text-right font-mono font-bold text-slate-900">${formatRupiah(p.price)}</td>
      `;
      tbody.appendChild(tr);
    });

    if (parsedProducts.length > 20) {
      const trMore = document.createElement('tr');
      trMore.innerHTML = `
        <td colspan="5" class="py-2.5 px-3 text-center text-slate-500 italic bg-slate-50/50 text-[11px]">
          ... dan ${parsedProducts.length - 20} produk lainnya
        </td>
      `;
      tbody.appendChild(trMore);
    }
  }

  modal.classList.remove('hidden');
}

// Confirm and save imported products into catalog
function confirmImportCatalog() {
  if (!pendingImportProducts || pendingImportProducts.length === 0) {
    showToast('Tidak ada data produk untuk diimpor', 'error');
    return;
  }

  const overwrite = document.getElementById('check-overwrite-existing')?.checked ?? true;
  const res = StorageService.importProductsBatch(pendingImportProducts, overwrite);

  if (res.success) {
    document.getElementById('modal-import-catalog')?.classList.add('hidden');
    const fileInp = document.getElementById('catalog-excel-file-input');
    if (fileInp) fileInp.value = '';

    renderCatalogTableView();
    updateCatalogBadge();
    if (typeof renderProductDatalist === 'function') renderProductDatalist();

    let msg = `Berhasil mengimpor ${res.added + res.updated} produk ke katalog!`;
    if (res.added > 0 && res.updated > 0) {
      msg = `Selesai: ${res.added} produk baru ditambahkan, ${res.updated} produk diperbarui!`;
    } else if (res.added > 0) {
      msg = `Selesai: ${res.added} produk baru berhasil dimasukkan ke katalog!`;
    } else if (res.updated > 0) {
      msg = `Selesai: ${res.updated} produk berhasil diperbarui!`;
    }

    showToast(msg, 'success');
    pendingImportProducts = [];
  } else {
    showToast('Gagal mengimpor produk: ' + (res.error || 'Terjadi kesalahan'), 'error');
  }
}

function resetCatalogForm() {
  document.getElementById('catalog-input-id').value = '';
  document.getElementById('catalog-input-name').value = '';
  document.getElementById('catalog-input-desc').value = '';
  document.getElementById('catalog-input-unit').value = 'Pcs';
  document.getElementById('catalog-input-price').value = '';
  document.getElementById('catalog-form-title').innerHTML = '<span>➕</span> Input Barang / Jasa Baru';
  document.getElementById('btn-cancel-edit-catalog').classList.add('hidden');
}

function updateCatalogBadge() {
  const count = StorageService.getProducts().length;
  const badge1 = document.getElementById('catalog-badge-count');
  const badge2 = document.getElementById('catalog-count-badge');
  const badge3 = document.getElementById('catalog-table-count');

  if (badge1) badge1.textContent = count;
  if (badge2) badge2.textContent = `${count} Produk`;
  if (badge3) badge3.textContent = `${count} barang`;
}

function renderCatalogTableView(searchTerm = '') {
  const tbody = document.getElementById('catalog-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  let list = StorageService.getProducts();
  if (searchTerm) {
    const q = searchTerm.toLowerCase();
    list = list.filter(p => 
      (p.name || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q)
    );
  }

  updateCatalogBadge();

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-12 text-slate-400 italic">
          <div class="flex flex-col items-center gap-2">
            <span class="text-3xl">📦</span>
            <span class="font-semibold text-slate-600">Belum ada barang di katalog.</span>
            <span class="text-xs">Gunakan formulir di sebelah kiri untuk menambahkan master barang & harga jual Anda.</span>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  list.forEach((p, idx) => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50/80 transition';
    tr.innerHTML = `
      <td class="py-3 px-3.5 text-center font-medium text-slate-500">${idx + 1}</td>
      <td class="py-3 px-3.5">
        <div class="font-bold text-slate-800 text-xs">${escapeHtml(p.name)}</div>
      </td>
      <td class="py-3 px-3.5 text-slate-600 text-[11px] max-w-xs">
        ${escapeHtml(p.description || '-')}
      </td>
      <td class="py-3 px-3.5 text-center text-slate-600 font-medium text-xs">
        <span class="px-2 py-0.5 bg-slate-100 rounded text-slate-700">${escapeHtml(p.unit || 'Pcs')}</span>
      </td>
      <td class="py-3 px-3.5 text-right font-mono font-bold text-slate-900 text-xs">
        ${formatRupiah(p.price)}
      </td>
      <td class="py-3 px-3.5 text-center">
        <div class="flex items-center justify-center gap-1.5">
          <button type="button" class="btn-catalog-edit px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition">
            Edit
          </button>
          <button type="button" class="btn-catalog-delete px-2.5 py-1 text-xs font-semibold rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition">
            Hapus
          </button>
        </div>
      </td>
    `;

    tr.querySelector('.btn-catalog-edit').addEventListener('click', () => {
      document.getElementById('catalog-input-id').value = p.id;
      document.getElementById('catalog-input-name').value = p.name || '';
      document.getElementById('catalog-input-desc').value = p.description || '';
      document.getElementById('catalog-input-unit').value = p.unit || 'Pcs';
      document.getElementById('catalog-input-price').value = formatThousands(p.price || 0);
      document.getElementById('catalog-form-title').innerHTML = '<span>✏️</span> Edit Barang Katalog';
      document.getElementById('btn-cancel-edit-catalog').classList.remove('hidden');
      document.getElementById('catalog-input-name').focus();
    });

    tr.querySelector('.btn-catalog-delete').addEventListener('click', async () => {
      const ok = await showAppConfirm({
        title: 'Hapus Barang Katalog',
        message: `Apakah Anda yakin ingin menghapus <strong>"${escapeHtml(p.name)}"</strong> dari katalog barang?`,
        confirmText: 'Ya, Hapus',
        cancelText: 'Batal',
        type: 'danger',
        icon: '📦'
      });
      if (ok) {
        StorageService.deleteProduct(p.id);
        renderCatalogTableView(searchTerm);
        if (typeof renderProductDatalist === 'function') renderProductDatalist();
        showToast('Barang berhasil dihapus dari katalog');
      }
    });

    tbody.appendChild(tr);
  });
}

function setupCatalogViewEvents() {
  const btnSave = document.getElementById('btn-save-catalog-item');
  const btnCancel = document.getElementById('btn-cancel-edit-catalog');
  const searchInput = document.getElementById('catalog-search-input');
  const catPriceInput = document.getElementById('catalog-input-price');

  if (catPriceInput) {
    bindCurrencyInput(catPriceInput);
  }

  if (btnSave) {
    btnSave.addEventListener('click', () => {
      const name = document.getElementById('catalog-input-name').value.trim();
      const desc = document.getElementById('catalog-input-desc').value.trim();
      const unit = document.getElementById('catalog-input-unit').value.trim() || 'Pcs';
      const price = parseThousands(document.getElementById('catalog-input-price').value);
      const editId = document.getElementById('catalog-input-id').value;

      if (!name) {
        showToast('Nama barang / jasa wajib diisi', 'error');
        document.getElementById('catalog-input-name').focus();
        return;
      }

      StorageService.saveProduct({
        id: editId || undefined,
        name: name,
        description: desc,
        unit: unit,
        price: price
      });

      resetCatalogForm();
      renderCatalogTableView();
      if (typeof renderProductDatalist === 'function') renderProductDatalist();
      showToast(`Barang "${name}" berhasil disimpan ke Katalog!`, 'success');
    });
  }

  if (btnCancel) {
    btnCancel.addEventListener('click', resetCatalogForm);
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderCatalogTableView(searchInput.value);
    });
  }

  // Excel / CSV Template & Import Handlers
  const btnDownloadTemplate = document.getElementById('btn-download-catalog-template');
  if (btnDownloadTemplate) {
    btnDownloadTemplate.addEventListener('click', downloadCatalogExcelTemplate);
  }

  const btnImportExcel = document.getElementById('btn-import-catalog-excel');
  const fileInput = document.getElementById('catalog-excel-file-input');
  if (btnImportExcel && fileInput) {
    btnImportExcel.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) {
        handleCatalogExcelFile(file);
      }
    });
  }

  const btnCloseModal = document.getElementById('btn-close-import-catalog');
  const btnCancelModal = document.getElementById('btn-cancel-import-catalog');
  const modalImport = document.getElementById('modal-import-catalog');

  [btnCloseModal, btnCancelModal].forEach(btn => {
    if (btn && modalImport) {
      btn.addEventListener('click', () => {
        modalImport.classList.add('hidden');
        if (fileInput) fileInput.value = '';
        pendingImportProducts = [];
      });
    }
  });

  const btnConfirmImport = document.getElementById('btn-confirm-import-catalog');
  if (btnConfirmImport) {
    btnConfirmImport.addEventListener('click', confirmImportCatalog);
  }
}

// Global Exports
window.KNOWN_CATALOG_UNITS = KNOWN_CATALOG_UNITS;
window.classifyCatalogColumn = classifyCatalogColumn;
window.normalizeUnitLabel = normalizeUnitLabel;
window.downloadCatalogExcelTemplate = downloadCatalogExcelTemplate;
window.handleCatalogExcelFile = handleCatalogExcelFile;
window.showImportPreviewModal = showImportPreviewModal;
window.confirmImportCatalog = confirmImportCatalog;
window.resetCatalogForm = resetCatalogForm;
window.updateCatalogBadge = updateCatalogBadge;
window.renderCatalogTableView = renderCatalogTableView;
window.setupCatalogViewEvents = setupCatalogViewEvents;

