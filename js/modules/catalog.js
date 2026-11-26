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
let catalogCurrentPage = 1;
let catalogPageSize = 10;

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

    catalogCurrentPage = 1;
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

function getCatalogPaginationSequence(current, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, idx) => idx + 1);
  }
  const pages = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);
  if (left > 2) pages.push('...');
  for (let p = left; p <= right; p++) pages.push(p);
  if (right < total - 1) pages.push('...');
  pages.push(total);
  return pages;
}

function renderCatalogPagination(totalItems, totalPages, startIndex, endIndex, activeSearch) {
  const infoEl = document.getElementById('catalog-pagination-info');
  const controlsEl = document.getElementById('catalog-pagination-controls');

  if (infoEl) {
    infoEl.textContent = totalItems === 0
      ? 'Menampilkan 0 barang'
      : `Menampilkan ${startIndex + 1}–${endIndex} dari ${totalItems} barang`;
  }

  if (!controlsEl) return;
  controlsEl.innerHTML = '';

  if (totalItems === 0) return;

  const createPageBtn = (label, targetPage, { disabled = false, active = false, title = '' } = {}) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    if (title) btn.title = title;
    btn.disabled = disabled;

    if (active) {
      btn.className = 'min-w-[28px] h-7 px-2 rounded-lg border border-blue-600 bg-blue-600 text-white font-bold text-[11px] shadow-sm cursor-default';
    } else if (disabled) {
      btn.className = 'h-7 px-2.5 rounded-lg border border-slate-200 bg-slate-100 text-slate-400 font-semibold text-[11px] cursor-not-allowed';
    } else {
      btn.className = 'min-w-[28px] h-7 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-[11px] transition cursor-pointer';
      btn.addEventListener('click', () => {
        catalogCurrentPage = targetPage;
        renderCatalogTableView(activeSearch);
      });
    }
    return btn;
  };

  controlsEl.appendChild(createPageBtn('← Sebelumnya', catalogCurrentPage - 1, {
    disabled: catalogCurrentPage <= 1,
    title: 'Halaman sebelumnya'
  }));

  getCatalogPaginationSequence(catalogCurrentPage, totalPages).forEach(entry => {
    if (entry === '...') {
      const span = document.createElement('span');
      span.className = 'px-1.5 text-slate-400 text-[11px] select-none';
      span.textContent = '…';
      controlsEl.appendChild(span);
    } else {
      controlsEl.appendChild(createPageBtn(String(entry), entry, {
        active: entry === catalogCurrentPage,
        title: `Halaman ${entry}`
      }));
    }
  });

  controlsEl.appendChild(createPageBtn('Berikutnya →', catalogCurrentPage + 1, {
    disabled: catalogCurrentPage >= totalPages,
    title: 'Halaman berikutnya'
  }));
}

function renderCatalogTableView(searchTerm = null) {
  const tbody = document.getElementById('catalog-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  const activeSearch = typeof searchTerm === 'string'
    ? searchTerm
    : (document.getElementById('catalog-search-input')?.value || '');

  let list = StorageService.getProducts();
  if (activeSearch) {
    const q = activeSearch.toLowerCase();
    list = list.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q)
    );
  }

  updateCatalogBadge();

  if (activeSearch.trim()) {
    const tableCountEl = document.getElementById('catalog-table-count');
    if (tableCountEl) tableCountEl.textContent = `${list.length} hasil`;
  }

  if (list.length === 0) {
    catalogCurrentPage = 1;
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-12 text-slate-400 italic">
          <div class="flex flex-col items-center gap-2">
            <span class="text-3xl">📦</span>
            <span class="font-semibold text-slate-600">${activeSearch.trim() ? 'Barang tidak ditemukan.' : 'Belum ada barang di katalog.'}</span>
            <span class="text-xs">${activeSearch.trim() ? 'Coba ubah kata kunci pencarian Anda.' : 'Gunakan formulir di sebelah kiri untuk menambahkan master barang & harga jual Anda.'}</span>
          </div>
        </td>
      </tr>
    `;
    renderCatalogPagination(0, 1, 0, 0, activeSearch);
    return;
  }

  const totalItems = list.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / catalogPageSize));
  catalogCurrentPage = Math.min(Math.max(1, catalogCurrentPage), totalPages);
  const startIndex = (catalogCurrentPage - 1) * catalogPageSize;
  const endIndex = Math.min(startIndex + catalogPageSize, totalItems);
  const pageItems = list.slice(startIndex, endIndex);

  pageItems.forEach((p, idx) => {
    const rowNumber = startIndex + idx + 1;
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50/80 transition';
    tr.innerHTML = `
      <td class="py-3 px-3.5 text-center font-medium text-slate-500">${rowNumber}</td>
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
        <div class="flex items-center justify-center gap-1.5 flex-wrap">
          <button type="button" class="btn-catalog-add-invoice px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition active:scale-95 flex items-center gap-1 cursor-pointer" title="Tambahkan '${escapeHtml(p.name)}' langsung ke invoice yang sedang dibuat">
            <span>+</span> Invoice
          </button>
          <button type="button" class="btn-catalog-edit px-2 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer" title="Edit Master Barang">
            Edit
          </button>
          <button type="button" class="btn-catalog-delete px-2 py-1 text-xs font-semibold rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition cursor-pointer" title="Hapus Master Barang">
            Hapus
          </button>
        </div>
      </td>
    `;

    // Event: Add Product directly to Invoice
    const btnAddInv = tr.querySelector('.btn-catalog-add-invoice');
    if (btnAddInv) {
      btnAddInv.addEventListener('click', (e) => {
        addProductToInvoice(p, e.currentTarget);
      });
    }

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
        renderCatalogTableView(activeSearch);
        if (typeof renderProductDatalist === 'function') renderProductDatalist();
        showToast('Barang berhasil dihapus dari katalog');
      }
    });

    tbody.appendChild(tr);
  });

  renderCatalogPagination(totalItems, totalPages, startIndex, endIndex, activeSearch);
}

function setupCatalogViewEvents() {
  const btnSave = document.getElementById('btn-save-catalog-item');
  const btnCancel = document.getElementById('btn-cancel-edit-catalog');
  const searchInput = document.getElementById('catalog-search-input');
  const pageSizeSelect = document.getElementById('catalog-page-size');
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

      const saved = StorageService.saveProduct({
        id: editId || undefined,
        name: name,
        description: desc,
        unit: unit,
        price: price
      });

      if (saved) {
        const activeQ = (searchInput?.value || '').toLowerCase();
        const filtered = activeQ
          ? StorageService.getProducts().filter(p =>
              (p.name || '').toLowerCase().includes(activeQ) ||
              (p.description || '').toLowerCase().includes(activeQ)
            )
          : StorageService.getProducts();
        const savedIdx = filtered.findIndex(p => p.id === saved.id);
        if (savedIdx >= 0) {
          catalogCurrentPage = Math.floor(savedIdx / catalogPageSize) + 1;
        }
      }

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
      catalogCurrentPage = 1;
      renderCatalogTableView(searchInput.value);
    });
  }

  if (pageSizeSelect) {
    pageSizeSelect.value = String(catalogPageSize);
    pageSizeSelect.addEventListener('change', (e) => {
      catalogPageSize = parseInt(e.target.value, 10) || 10;
      catalogCurrentPage = 1;
      renderCatalogTableView();
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

// Add product from catalog directly to active invoice
function addProductToInvoice(product, btnElement = null) {
  if (!product || !product.name) return;

  // Pastikan window.currentInvoice terinisialisasi
  if (!window.currentInvoice) {
    if (typeof StorageService !== 'undefined') {
      window.currentInvoice = StorageService.getBlankInvoice();
    } else {
      window.currentInvoice = { items: [] };
    }
  }

  if (!Array.isArray(window.currentInvoice.items)) {
    window.currentInvoice.items = [];
  }

  // Cek apakah invoice builder hanya memiliki 1 baris kosong awal
  const isOnlyBlankItem = window.currentInvoice.items.length === 1 &&
    (!window.currentInvoice.items[0].name || window.currentInvoice.items[0].name.trim() === '') &&
    (parseFloat(window.currentInvoice.items[0].price) || 0) === 0;

  if (isOnlyBlankItem) {
    window.currentInvoice.items[0] = {
      id: Date.now(),
      name: product.name,
      description: product.description || '',
      qty: 1,
      unit: product.unit || 'Pcs',
      price: parseFloat(product.price) || 0,
      discount: 0
    };
  } else {
    // Cek apakah produk dengan nama yang sama persis sudah ada di invoice
    const existingItem = window.currentInvoice.items.find(
      it => (it.name || '').trim().toLowerCase() === product.name.trim().toLowerCase()
    );

    if (existingItem) {
      // Tambahkan kuantitasnya + 1
      const currentQty = parseFloat(existingItem.qty) || 1;
      existingItem.qty = currentQty + 1;
    } else {
      // Tambahkan baris baru
      window.currentInvoice.items.push({
        id: Date.now() + Math.floor(Math.random() * 1000),
        name: product.name,
        description: product.description || '',
        qty: 1,
        unit: product.unit || 'Pcs',
        price: parseFloat(product.price) || 0,
        discount: 0
      });
    }
  }

  // Render ulang form builder dan pratinjau live
  if (typeof renderFormItems === 'function') renderFormItems();
  if (typeof updateLivePreview === 'function') updateLivePreview();
  if (typeof updateBuilderBadge === 'function') updateBuilderBadge();

  // Visual feedback pada tombol yang diklik
  if (btnElement) {
    const originalHtml = btnElement.innerHTML;
    btnElement.innerHTML = '<span>✓</span> Masuk!';
    btnElement.classList.remove('bg-emerald-600', 'hover:bg-emerald-700');
    btnElement.classList.add('bg-blue-600', 'hover:bg-blue-700');
    setTimeout(() => {
      btnElement.innerHTML = originalHtml;
      btnElement.classList.remove('bg-blue-600', 'hover:bg-blue-700');
      btnElement.classList.add('bg-emerald-600', 'hover:bg-emerald-700');
    }, 1200);
  }

  // Notifikasi toast dengan tombol buka invoice langsung
  const totalItemCount = window.currentInvoice.items.length;
  showToast(`
    <span class="font-medium"><strong>"${escapeHtml(product.name)}"</strong> masuk ke invoice (${totalItemCount} item).</span>
    <button onclick="switchView('builder')" class="ml-2 font-bold underline hover:text-white cursor-pointer text-xs">Buka Invoice →</button>
  `, 'success');
}

// Update badge count pada tab "Buat Invoice" di navbar
function updateBuilderBadge() {
  const badge = document.getElementById('builder-badge-count');
  if (!badge) return;

  if (window.currentInvoice && Array.isArray(window.currentInvoice.items)) {
    const filledItems = window.currentInvoice.items.filter(
      it => (it.name && it.name.trim().length > 0) || (parseFloat(it.price) || 0) > 0
    );
    const count = filledItems.length;
    if (count > 0) {
      badge.textContent = `${count}`;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  } else {
    badge.classList.add('hidden');
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
window.addProductToInvoice = addProductToInvoice;
window.updateBuilderBadge = updateBuilderBadge;

