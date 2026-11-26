/**
 * InvoicePro - Core Application Orchestrator & Invoice Builder Controller
 * Manages invoice state, form interactions, live preview synchronization, and module lifecycle.
 */

// Global Application State
window.currentInvoice = null;
window.signaturePad = null;
window.currentZoom = 1;
window.isItemsSectionCollapsed = false;

function updateItemsSectionSummary() {
  const items = Array.isArray(window.currentInvoice?.items) ? window.currentInvoice.items : [];
  const countBadge = document.getElementById('items-section-count-badge');
  const summaryText = document.getElementById('items-collapsed-summary-text');

  if (countBadge) {
    countBadge.textContent = `${items.length} Item`;
  }

  if (summaryText) {
    let subtotal = 0;
    items.forEach(it => {
      const q = parseFloat(it.qty) || 0;
      const p = parseFloat(it.price) || 0;
      const d = parseFloat(it.discount) || 0;
      subtotal += Math.max((q * p) - d, 0);
    });
    const subtotalText = typeof formatRupiah === 'function' ? formatRupiah(subtotal) : `Rp ${subtotal}`;
    summaryText.textContent = `${items.length} barang/jasa · Subtotal ${subtotalText}`;
  }
}

function setItemsSectionCollapsed(collapsed) {
  window.isItemsSectionCollapsed = Boolean(collapsed);
  const bodyEl = document.getElementById('items-section-body');
  const summaryEl = document.getElementById('items-collapsed-summary');
  const chevronEl = document.getElementById('items-toggle-chevron');
  const labelEl = document.getElementById('items-toggle-label');

  if (bodyEl) bodyEl.classList.toggle('hidden', window.isItemsSectionCollapsed);
  if (summaryEl) summaryEl.classList.toggle('hidden', !window.isItemsSectionCollapsed);
  if (chevronEl) chevronEl.classList.toggle('-rotate-90', window.isItemsSectionCollapsed);
  if (labelEl) labelEl.textContent = window.isItemsSectionCollapsed ? 'Buka' : 'Lipat';
  updateItemsSectionSummary();
}

// Document Ready Bootstrapper
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Start with clean blank invoice (respects saved store profile if any)
  window.currentInvoice = StorageService.getBlankInvoice();

  // Initialize UI & Subsystems
  initSignaturePad();
  populateFormFromState();
  setupEventListeners();

  // Initialize modular controllers
  if (typeof initMasterDataControllers === 'function') initMasterDataControllers();
  if (typeof setupSalesEventListeners === 'function') setupSalesEventListeners();
  if (typeof setupCatalogViewEvents === 'function') setupCatalogViewEvents();
  if (typeof setupPreviewZoomControls === 'function') setupPreviewZoomControls();

  // Initial renders
  if (typeof updateLivePreview === 'function') updateLivePreview();
  if (typeof renderHistoryTable === 'function') renderHistoryTable();
  if (typeof renderSalesTable === 'function') renderSalesTable();
  if (typeof updateCatalogBadge === 'function') updateCatalogBadge();

  // Navigation controller
  initViewNavigation();
});

/**
 * Initialize Signature Pad on HTML5 Canvas
 */
function initSignaturePad() {
  const canvas = document.getElementById('signature-canvas');
  if (canvas && window.SignaturePad) {
    window.signaturePad = new SignaturePad(canvas, {
      backgroundColor: 'rgba(255, 255, 255, 0)',
      penColor: '#0f172a'
    });

    // Resize canvas correctly for high-DPI displays
    function resizeCanvas() {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext("2d").scale(ratio, ratio);
      if (window.signaturePad) {
        window.signaturePad.clear();
        if (window.currentInvoice && window.currentInvoice.signatureImage) {
          window.signaturePad.fromDataURL(window.currentInvoice.signatureImage);
        }
      }
    }

    window.addEventListener("resize", resizeCanvas);
    setTimeout(resizeCanvas, 200);
  }
}

/**
 * Populate all form inputs from current state
 */
function populateFormFromState() {
  const inv = window.currentInvoice;
  if (!inv) return;

  // Theme
  const themeInput = document.getElementById('input-theme');
  if (themeInput) themeInput.value = inv.theme || 'slate';
  document.body.setAttribute('data-theme', inv.theme || 'slate');

  // Meta
  const elInvNo = document.getElementById('input-invoice-number');
  if (elInvNo) elInvNo.value = inv.invoiceNumber || '';
  validateInvoiceNumber();
  const elDate = document.getElementById('input-date');
  if (elDate) elDate.value = inv.date || '';
  const elDueDate = document.getElementById('input-due-date');
  if (elDueDate) elDueDate.value = inv.dueDate || '';
  const elStatus = document.getElementById('input-status');
  if (elStatus) elStatus.value = inv.status || 'LUNAS';

  const dpContainer = document.getElementById('dp-input-container');
  if (dpContainer) {
    if (inv.status === 'DP') {
      dpContainer.classList.remove('hidden');
    } else {
      dpContainer.classList.add('hidden');
    }
  }

  // Store Info
  const elStoreName = document.getElementById('input-store-name');
  if (elStoreName) elStoreName.value = inv.store.name || '';
  const elStoreTag = document.getElementById('input-store-tagline');
  if (elStoreTag) elStoreTag.value = inv.store.tagline || '';
  const elStoreAddr = document.getElementById('input-store-address');
  if (elStoreAddr) elStoreAddr.value = inv.store.address || '';
  const elStorePhone = document.getElementById('input-store-phone');
  if (elStorePhone) elStorePhone.value = inv.store.phone || '';
  const elStoreEmail = document.getElementById('input-store-email');
  if (elStoreEmail) elStoreEmail.value = inv.store.email || '';
  const elStoreNpwp = document.getElementById('input-store-npwp');
  if (elStoreNpwp) elStoreNpwp.value = inv.store.npwp || '';

  const logoPreviewImg = document.getElementById('logo-preview-img');
  const logoPreviewContainer = document.getElementById('logo-preview-container');
  if (logoPreviewImg && logoPreviewContainer) {
    if (inv.store.logo) {
      logoPreviewImg.src = inv.store.logo;
      logoPreviewContainer.classList.remove('hidden');
    } else {
      logoPreviewContainer.classList.add('hidden');
    }
  }

  // Client Info
  const elClientName = document.getElementById('input-client-name');
  if (elClientName) elClientName.value = inv.client.name || '';
  const elClientContact = document.getElementById('input-client-contact');
  if (elClientContact) elClientContact.value = inv.client.contactPerson || '';
  const elClientPhone = document.getElementById('input-client-phone');
  if (elClientPhone) elClientPhone.value = inv.client.phone || '';
  const elClientEmail = document.getElementById('input-client-email');
  if (elClientEmail) elClientEmail.value = inv.client.email || '';
  const elClientAddress = document.getElementById('input-client-address');
  if (elClientAddress) elClientAddress.value = inv.client.address || '';
  const elShippingAddress = document.getElementById('input-shipping-address');
  if (elShippingAddress) elShippingAddress.value = inv.client.shippingAddress || '';

  // Items
  renderFormItems();

  // Financial fields
  const discType = inv.globalDiscountType || 'fixed';
  const elDiscType = document.getElementById('input-discount-type');
  if (elDiscType) elDiscType.value = discType;

  const elDiscVal = document.getElementById('input-discount-val');
  if (elDiscVal) {
    elDiscVal.value = discType === 'percent'
      ? (inv.globalDiscountValue || 0)
      : formatThousands(inv.globalDiscountValue || 0);
  }

  const elTaxRate = document.getElementById('input-tax-rate');
  if (elTaxRate) elTaxRate.value = inv.taxRate || 0;

  const elShipping = document.getElementById('input-shipping-fee');
  if (elShipping) elShipping.value = formatThousands(inv.shippingFee || 0);

  const elOther = document.getElementById('input-other-fee');
  if (elOther) elOther.value = formatThousands(inv.otherFee || 0);

  const elDp = document.getElementById('input-down-payment');
  if (elDp) elDp.value = formatThousands(inv.downPayment || 0);

  // Banks
  renderFormBanks();

  // Notes & Terms
  const elNotes = document.getElementById('input-notes');
  if (elNotes) {
    elNotes.value = inv.notes !== undefined ? inv.notes : (typeof DEFAULT_NOTES !== 'undefined' ? DEFAULT_NOTES : '');
  }
  const elTerms = document.getElementById('input-terms');
  if (elTerms) {
    elTerms.value = inv.terms !== undefined ? inv.terms : (typeof DEFAULT_TERMS !== 'undefined' ? DEFAULT_TERMS : '');
  }

  // Signature
  const elSigName = document.getElementById('input-signature-name');
  if (elSigName) elSigName.value = inv.signatureName || '';
  const elSigTitle = document.getElementById('input-signature-title');
  if (elSigTitle) elSigTitle.value = inv.signatureTitle || '';
  const elShowStamp = document.getElementById('input-show-stamp');
  if (elShowStamp) elShowStamp.checked = !!inv.showStamp;
}

/**
 * Render dynamic items in form with interactive auto-complete and calculations
 */
function renderFormItems() {
  const container = document.getElementById('items-container');
  if (!container || !window.currentInvoice) return;
  container.innerHTML = '';

  window.currentInvoice.items.forEach((item, index) => {
    const itemRow = document.createElement('div');
    itemRow.className = 'bg-slate-50 border border-slate-200 p-3 rounded-lg mb-3 item-row relative transition-all hover:border-slate-300';
    itemRow.dataset.index = index;

    const subtotal = (item.qty * item.price) - (item.discount || 0);

    itemRow.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
          <span class="w-5 h-5 rounded-full bg-blue-100 text-blue-700 inline-flex items-center justify-center text-xs font-bold">${index + 1}</span>
          Item Barang / Jasa
        </span>
        <div class="flex items-center gap-1">
          <button type="button" class="btn-duplicate-item text-xs text-slate-500 hover:text-blue-600 px-2 py-1 rounded bg-white border border-slate-200 hover:bg-slate-50 transition cursor-pointer" title="Duplikat item">
            Salin
          </button>
          ${window.currentInvoice.items.length > 1 ? `
          <button type="button" class="btn-delete-item text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded bg-white border border-red-200 hover:bg-red-50 transition cursor-pointer" title="Hapus item">
            Hapus
          </button>` : ''}
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-12 gap-2 mb-2">
        <div class="md:col-span-8 relative item-autocomplete-box">
          <label class="form-label">Nama Barang / Jasa *</label>
          <input type="text" class="form-input item-name font-semibold" placeholder="Ketik nama barang (pilihan katalog otomatis muncul)..." value="${escapeHtml(item.name)}" autocomplete="off">
          <div class="catalog-suggest-dropdown hidden absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-40 max-h-56 overflow-y-auto divide-y divide-slate-100"></div>
        </div>
        <div class="md:col-span-4">
          <label class="form-label">Satuan</label>
          <input type="text" class="form-input item-unit" placeholder="Pcs, Unit, Jam, Box, dll" value="${escapeHtml(item.unit || 'Unit')}">
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-12 gap-2 mb-2">
        <div class="md:col-span-12">
          <label class="form-label">Deskripsi / Spesifikasi (Opsional)</label>
          <input type="text" class="form-input item-desc text-xs" placeholder="Rincian spesifikasi atau catatan produk" value="${escapeHtml(item.description || '')}">
        </div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-12 gap-2 items-end">
        <div class="col-span-1 md:col-span-3">
          <label class="form-label">Kuantitas (Qty)</label>
          <input type="number" min="0.01" step="any" class="form-input item-qty" value="${item.qty}">
        </div>
        <div class="col-span-1 md:col-span-4">
          <label class="form-label">Harga Satuan (Rp)</label>
          <input type="text" inputmode="numeric" class="form-input item-price font-bold font-mono" placeholder="0" value="${formatThousands(item.price)}">
        </div>
        <div class="col-span-1 md:col-span-2">
          <label class="form-label">Potongan (Rp)</label>
          <input type="text" inputmode="numeric" class="form-input item-discount font-mono" placeholder="0" value="${formatThousands(item.discount || 0)}">
        </div>
        <div class="col-span-1 md:col-span-3 bg-white p-2 rounded border border-slate-200 text-right">
          <span class="text-[10px] text-slate-400 block uppercase font-semibold">Subtotal</span>
          <span class="text-sm font-bold text-slate-800 item-subtotal">${formatRupiah(subtotal)}</span>
        </div>
      </div>
    `;

    // Row element bindings
    const nameInput = itemRow.querySelector('.item-name');
    const unitInput = itemRow.querySelector('.item-unit');
    const descInput = itemRow.querySelector('.item-desc');
    const qtyInput = itemRow.querySelector('.item-qty');
    const priceInput = itemRow.querySelector('.item-price');
    const discountInput = itemRow.querySelector('.item-discount');
    const suggestDropdown = itemRow.querySelector('.catalog-suggest-dropdown');

    const updateItemData = () => {
      item.name = nameInput.value;
      item.unit = unitInput.value;
      item.description = descInput.value;
      item.qty = parseFloat(qtyInput.value) || 0;
      item.price = parseThousands(priceInput.value);
      item.discount = parseThousands(discountInput.value);

      const newSubtotal = (item.qty * item.price) - (item.discount || 0);
      itemRow.querySelector('.item-subtotal').textContent = formatRupiah(newSubtotal);
      updateItemsSectionSummary();
      if (typeof updateLivePreview === 'function') updateLivePreview();
    };

    bindCurrencyInput(priceInput, (val) => {
      item.price = val;
      const newSubtotal = (item.qty * item.price) - (item.discount || 0);
      itemRow.querySelector('.item-subtotal').textContent = formatRupiah(newSubtotal);
      updateItemsSectionSummary();
      if (typeof updateLivePreview === 'function') updateLivePreview();
    });

    bindCurrencyInput(discountInput, (val) => {
      item.discount = val;
      const newSubtotal = (item.qty * item.price) - (item.discount || 0);
      itemRow.querySelector('.item-subtotal').textContent = formatRupiah(newSubtotal);
      updateItemsSectionSummary();
      if (typeof updateLivePreview === 'function') updateLivePreview();
    });

    // Show interactive suggestion dropdown from Master Catalog
    const showSuggestions = (query = '') => {
      const products = StorageService.getProducts();
      if (!products || products.length === 0) {
        suggestDropdown.classList.add('hidden');
        return;
      }

      const q = query.trim().toLowerCase();
      const filtered = q
        ? products.filter(p => (p.name || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q))
        : products;

      if (filtered.length === 0) {
        suggestDropdown.classList.add('hidden');
        return;
      }

      suggestDropdown.innerHTML = '';
      filtered.forEach(p => {
        const opt = document.createElement('div');
        opt.className = 'p-2.5 hover:bg-blue-50 cursor-pointer transition flex items-center justify-between gap-3 text-left border-b border-slate-100 last:border-b-0';
        opt.innerHTML = `
          <div class="flex-1 min-w-0">
            <div class="font-bold text-slate-800 text-xs">${escapeHtml(p.name)}</div>
            ${p.description ? `<div class="text-[11px] text-slate-500 truncate mt-0.5">${escapeHtml(p.description)}</div>` : ''}
          </div>
          <div class="text-right whitespace-nowrap pl-2">
            <div class="font-bold font-mono text-blue-600 text-xs">${formatRupiah(p.price)}</div>
            <div class="text-[10px] text-slate-400">/${escapeHtml(p.unit || 'Pcs')}</div>
          </div>
        `;

        opt.addEventListener('mousedown', (e) => {
          e.preventDefault(); // Prevent blur before click executes
          selectCatalogItem(p);
        });

        suggestDropdown.appendChild(opt);
      });

      suggestDropdown.classList.remove('hidden');
    };

    const selectCatalogItem = (p) => {
      nameInput.value = p.name;
      item.name = p.name;

      if (p.unit) {
        unitInput.value = p.unit;
        item.unit = p.unit;
      }
      if (p.price !== undefined && p.price !== null) {
        priceInput.value = formatThousands(p.price);
        item.price = parseFloat(p.price) || 0;
      }
      if (p.description) {
        descInput.value = p.description;
        item.description = p.description;
      }

      suggestDropdown.classList.add('hidden');
      const newSubtotal = (item.qty * item.price) - (item.discount || 0);
      itemRow.querySelector('.item-subtotal').textContent = formatRupiah(newSubtotal);
      updateItemsSectionSummary();
      if (typeof updateLivePreview === 'function') updateLivePreview();
      showToast(`Barang "${p.name}" dipilih dari katalog: Harga otomatis diisi ✓`, 'success');
    };

    if (nameInput) {
      nameInput.addEventListener('input', () => {
        updateItemData();
        showSuggestions(nameInput.value);
      });

      nameInput.addEventListener('focus', () => {
        showSuggestions(nameInput.value);
      });

      nameInput.addEventListener('blur', () => {
        setTimeout(() => {
          if (suggestDropdown) suggestDropdown.classList.add('hidden');
        }, 200);
      });
    }

    [unitInput, descInput, qtyInput].forEach(inp => {
      if (inp) inp.addEventListener('input', updateItemData);
    });

    const btnDelete = itemRow.querySelector('.btn-delete-item');
    if (btnDelete) {
      btnDelete.addEventListener('click', async () => {
        const itemName = item.name ? item.name.trim() : '';
        if (itemName) {
          const ok = await showAppConfirm({
            title: 'Hapus Rincian Barang',
            message: `Hapus baris barang <strong>"${escapeHtml(itemName)}"</strong> dari invoice ini?`,
            confirmText: 'Ya, Hapus',
            cancelText: 'Batal',
            type: 'danger',
            icon: '🗑️'
          });
          if (!ok) return;
        }
        window.currentInvoice.items.splice(index, 1);
        renderFormItems();
        if (typeof updateLivePreview === 'function') updateLivePreview();
      });
    }

    const btnDuplicate = itemRow.querySelector('.btn-duplicate-item');
    if (btnDuplicate) {
      btnDuplicate.addEventListener('click', () => {
        const copy = JSON.parse(JSON.stringify(item));
        copy.id = Date.now();
        window.currentInvoice.items.splice(index + 1, 0, copy);
        renderFormItems();
        if (typeof updateLivePreview === 'function') updateLivePreview();
        showToast('Item berhasil disalin');
      });
    }

    container.appendChild(itemRow);
  });
  updateItemsSectionSummary();
  if (typeof updateBuilderBadge === 'function') updateBuilderBadge();
}

/**
 * Render dynamic bank accounts in form
 */
function renderFormBanks() {
  const container = document.getElementById('banks-container');
  if (!container || !window.currentInvoice) return;
  container.innerHTML = '';

  if (window.currentInvoice.banks.length === 0) {
    const emptyNotice = document.createElement('div');
    emptyNotice.className = 'text-xs text-slate-400 italic p-3 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-center';
    emptyNotice.innerHTML = 'Belum ada rekening yang dipilih untuk invoice ini. Silakan centang salah satu rekening tersimpan di atas atau klik "+ Tambah Rekening" untuk mengetik manual.';
    container.appendChild(emptyNotice);
    return;
  }

  window.currentInvoice.banks.forEach((bank, index) => {
    const bankRow = document.createElement('div');
    bankRow.className = 'grid grid-cols-1 md:grid-cols-12 gap-2 mb-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg items-end';

    bankRow.innerHTML = `
      <div class="md:col-span-4">
        <label class="form-label">Nama Bank / E-Wallet</label>
        <input type="text" class="form-input bank-name font-semibold" placeholder="BCA / Mandiri / BRI / QRIS" value="${escapeHtml(bank.bankName || '')}">
      </div>
      <div class="md:col-span-3">
        <label class="form-label">No. Rekening / No. HP</label>
        <input type="text" class="form-input bank-acc font-mono" placeholder="Contoh: 123-456-7890" value="${escapeHtml(bank.accountNumber || '')}">
      </div>
      <div class="md:col-span-3">
        <label class="form-label">Atas Nama (A/N)</label>
        <input type="text" class="form-input bank-owner" placeholder="Nama Pemilik Rekening" value="${escapeHtml(bank.accountName || '')}">
      </div>
      <div class="md:col-span-2 flex items-center justify-end gap-1">
        <button type="button" class="btn-save-bank-master p-1.5 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded border border-blue-200 bg-white cursor-pointer" title="Simpan rekening ini ke Master Rekening">
          💾 Simpan
        </button>
        <button type="button" class="btn-delete-bank p-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded border border-red-200 bg-white cursor-pointer" title="Hapus dari invoice">
          ✕
        </button>
      </div>
    `;

    const nameInput = bankRow.querySelector('.bank-name');
    const accInput = bankRow.querySelector('.bank-acc');
    const ownerInput = bankRow.querySelector('.bank-owner');

    const updateBank = () => {
      bank.bankName = nameInput.value;
      bank.accountNumber = accInput.value;
      bank.accountName = ownerInput.value;
      if (typeof updateLivePreview === 'function') updateLivePreview();
      if (typeof renderSavedBanksCheckboxes === 'function') renderSavedBanksCheckboxes();
    };

    [nameInput, accInput, ownerInput].forEach(inp => {
      if (inp) inp.addEventListener('input', updateBank);
    });

    const btnSaveMaster = bankRow.querySelector('.btn-save-bank-master');
    if (btnSaveMaster) {
      btnSaveMaster.addEventListener('click', () => {
        if (!nameInput.value.trim() || !accInput.value.trim()) {
          showToast('Nama bank dan nomor rekening wajib diisi', 'error');
          return;
        }
        StorageService.saveBank({
          bankName: nameInput.value.trim(),
          accountNumber: accInput.value.trim(),
          accountName: ownerInput.value.trim()
        });
        if (typeof renderSavedBanksCheckboxes === 'function') renderSavedBanksCheckboxes();
        if (typeof renderBanksModalTable === 'function') renderBanksModalTable();
        showToast('Rekening berhasil disimpan ke Master Rekening!', 'success');
      });
    }

    const btnDelete = bankRow.querySelector('.btn-delete-bank');
    if (btnDelete) {
      btnDelete.addEventListener('click', async () => {
        if (bank.bankName || bank.accountNumber) {
          const ok = await showAppConfirm({
            title: 'Hapus Rekening',
            message: `Hapus rekening <strong>${escapeHtml(bank.bankName || 'Bank')} ${escapeHtml(bank.accountNumber || '')}</strong> dari invoice ini?`,
            confirmText: 'Ya, Hapus',
            cancelText: 'Batal',
            type: 'danger',
            icon: '🏦'
          });
          if (!ok) return;
        }
        window.currentInvoice.banks.splice(index, 1);
        renderFormBanks();
        if (typeof renderSavedBanksCheckboxes === 'function') renderSavedBanksCheckboxes();
        if (typeof updateLivePreview === 'function') updateLivePreview();
      });
    }

    container.appendChild(bankRow);
  });
}

/**
 * Bind single input element to state updater
 */
function bindInput(id, updater) {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('input', (e) => {
      updater(e.target.value);
      if (typeof updateLivePreview === 'function') updateLivePreview();
    });
  }
}

/**
 * Initialize View Navigation (Builder vs Catalog vs Sales Data)
 */
function initViewNavigation() {
  const tabBuilder = document.getElementById('nav-tab-builder');
  const tabSales = document.getElementById('nav-tab-sales');
  const tabCatalog = document.getElementById('nav-tab-catalog');
  const btnGotoCatalog = document.getElementById('btn-goto-catalog');
  const btnCatalogCreateInvoice = document.getElementById('btn-catalog-create-invoice');

  if (tabBuilder) {
    tabBuilder.addEventListener('click', () => switchView('builder'));
  }
  if (tabCatalog) {
    tabCatalog.addEventListener('click', () => switchView('catalog'));
  }
  if (tabSales) {
    tabSales.addEventListener('click', () => switchView('sales'));
  }
  if (btnGotoCatalog) {
    btnGotoCatalog.addEventListener('click', () => switchView('catalog'));
  }
  if (btnCatalogCreateInvoice) {
    btnCatalogCreateInvoice.addEventListener('click', () => switchView('builder'));
  }
}

/**
 * Switch view tabs cleanly
 */
function switchView(viewName) {
  const viewBuilder = document.getElementById('view-invoice-builder');
  const viewSales = document.getElementById('view-sales-table');
  const viewCatalog = document.getElementById('view-catalog-manager');

  const tabBuilder = document.getElementById('nav-tab-builder');
  const tabSales = document.getElementById('nav-tab-sales');
  const tabCatalog = document.getElementById('nav-tab-catalog');
  const mobileToggle = document.getElementById('mobile-builder-toggle');

  // Hide all views first
  if (viewBuilder) viewBuilder.classList.add('hidden');
  if (viewSales) {
    viewSales.classList.add('hidden');
    viewSales.classList.remove('flex');
  }
  if (viewCatalog) {
    viewCatalog.classList.add('hidden');
    viewCatalog.classList.remove('flex');
  }

  // Reset tab button styles
  [tabBuilder, tabSales, tabCatalog].forEach(tab => {
    if (tab) {
      tab.classList.remove('bg-white', 'text-blue-600', 'shadow-sm');
      tab.classList.add('text-slate-600');
    }
  });

  if (viewName === 'sales') {
    if (viewSales) {
      viewSales.classList.remove('hidden');
      viewSales.classList.add('flex');
    }
    if (mobileToggle) mobileToggle.classList.add('hidden');
    if (tabSales) {
      tabSales.classList.add('bg-white', 'text-blue-600', 'shadow-sm');
      tabSales.classList.remove('text-slate-600');
    }
    if (typeof renderSalesTable === 'function') renderSalesTable();
  } else if (viewName === 'catalog') {
    if (viewCatalog) {
      viewCatalog.classList.remove('hidden');
      viewCatalog.classList.add('flex');
    }
    if (mobileToggle) mobileToggle.classList.add('hidden');
    if (tabCatalog) {
      tabCatalog.classList.add('bg-white', 'text-blue-600', 'shadow-sm');
      tabCatalog.classList.remove('text-slate-600');
    }
    if (typeof renderCatalogTableView === 'function') renderCatalogTableView();
  } else {
    // Default: builder
    if (viewBuilder) viewBuilder.classList.remove('hidden');
    if (mobileToggle) mobileToggle.classList.remove('hidden');
    if (tabBuilder) {
      tabBuilder.classList.add('bg-white', 'text-blue-600', 'shadow-sm');
      tabBuilder.classList.remove('text-slate-600');
    }
    if (typeof updateLivePreview === 'function') updateLivePreview();
  }
}

/**
 * Validate invoice number for uniqueness and completeness
 * Turns input red and shows warning if duplicate
 */
function validateInvoiceNumber() {
  const input = document.getElementById('input-invoice-number');
  const errorEl = document.getElementById('invoice-no-error');
  if (!input) return true;

  const currentNo = (input.value || '').trim();
  const currentId = window.currentInvoice?.id || null;

  if (!currentNo) {
    input.classList.add('border-rose-500', 'text-rose-600', 'bg-rose-50/50');
    input.classList.remove('border-slate-300', 'text-slate-900');
    if (errorEl) {
      errorEl.innerHTML = '<span>⚠️</span> <span>Nomor invoice wajib diisi!</span>';
      errorEl.classList.remove('hidden');
    }
    return false;
  }

  const isDuplicate = StorageService.isInvoiceNumberDuplicate(currentNo, currentId);
  if (isDuplicate) {
    input.classList.add('border-rose-500', 'text-rose-600', 'bg-rose-50/50');
    input.classList.remove('border-slate-300', 'text-slate-900');
    if (errorEl) {
      errorEl.innerHTML = '<span>⚠️</span> <span>Nomor invoice ini sudah digunakan! Silakan gunakan nomor lain.</span>';
      errorEl.classList.remove('hidden');
    }
    return false;
  } else {
    input.classList.remove('border-rose-500', 'text-rose-600', 'bg-rose-50/50');
    input.classList.add('border-slate-300');
    if (errorEl) {
      errorEl.classList.add('hidden');
    }
    return true;
  }
}

/**
 * Setup All Event Listeners for Invoice Builder Form
 */
function setupEventListeners() {
  // Theme selector
  const themeSelect = document.getElementById('input-theme');
  if (themeSelect) {
    themeSelect.addEventListener('change', (e) => {
      if (window.currentInvoice) window.currentInvoice.theme = e.target.value;
      if (typeof updateLivePreview === 'function') updateLivePreview();
    });
  }

  // Meta inputs
  const inputInvNo = document.getElementById('input-invoice-number');
  if (inputInvNo) {
    inputInvNo.addEventListener('input', (e) => {
      if (window.currentInvoice) window.currentInvoice.invoiceNumber = e.target.value;
      validateInvoiceNumber();
      if (typeof updateLivePreview === 'function') updateLivePreview();
    });
  }
  bindInput('input-date', (val) => { if (window.currentInvoice) window.currentInvoice.date = val; });
  bindInput('input-due-date', (val) => { if (window.currentInvoice) window.currentInvoice.dueDate = val; });

  const statusSelect = document.getElementById('input-status');
  if (statusSelect) {
    statusSelect.addEventListener('change', (e) => {
      if (window.currentInvoice) window.currentInvoice.status = e.target.value;
      const dpContainer = document.getElementById('dp-input-container');
      if (dpContainer) {
        if (e.target.value === 'DP') {
          dpContainer.classList.remove('hidden');
        } else {
          dpContainer.classList.add('hidden');
        }
      }
      if (typeof updateLivePreview === 'function') updateLivePreview();
    });
  }

  // Generate Invoice Number Button
  const btnGenNo = document.getElementById('btn-generate-no');
  if (btnGenNo) {
    btnGenNo.addEventListener('click', () => {
      let newNo = generateInvoiceNumber();
      let attempts = 0;
      while (StorageService.isInvoiceNumberDuplicate(newNo, window.currentInvoice?.id) && attempts < 50) {
        newNo = generateInvoiceNumber();
        attempts++;
      }
      const elInvNo = document.getElementById('input-invoice-number');
      if (elInvNo) elInvNo.value = newNo;
      if (window.currentInvoice) window.currentInvoice.invoiceNumber = newNo;
      validateInvoiceNumber();
      if (typeof updateLivePreview === 'function') updateLivePreview();
      showToast('Nomor invoice unik berhasil dibuat');
    });
  }

  // Store profile inputs
  bindInput('input-store-name', (val) => { if (window.currentInvoice) window.currentInvoice.store.name = val; });
  bindInput('input-store-tagline', (val) => { if (window.currentInvoice) window.currentInvoice.store.tagline = val; });
  bindInput('input-store-address', (val) => { if (window.currentInvoice) window.currentInvoice.store.address = val; });
  bindInput('input-store-phone', (val) => { if (window.currentInvoice) window.currentInvoice.store.phone = val; });
  bindInput('input-store-email', (val) => { if (window.currentInvoice) window.currentInvoice.store.email = val; });
  bindInput('input-store-npwp', (val) => { if (window.currentInvoice) window.currentInvoice.store.npwp = val; });

  // Logo file upload
  const logoInput = document.getElementById('input-store-logo');
  if (logoInput) {
    logoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        if (file.size > 2 * 1024 * 1024) {
          showToast('Ukuran logo maksimal 2MB', 'error');
          return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          if (window.currentInvoice) window.currentInvoice.store.logo = event.target.result;
          const logoPreviewImg = document.getElementById('logo-preview-img');
          const logoPreviewContainer = document.getElementById('logo-preview-container');
          if (logoPreviewImg) logoPreviewImg.src = event.target.result;
          if (logoPreviewContainer) logoPreviewContainer.classList.remove('hidden');
          if (typeof updateLivePreview === 'function') updateLivePreview();
          showToast('Logo berhasil diunggah');
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Remove Logo
  const btnRemoveLogo = document.getElementById('btn-remove-logo');
  if (btnRemoveLogo) {
    btnRemoveLogo.addEventListener('click', () => {
      if (window.currentInvoice) window.currentInvoice.store.logo = '';
      const inputStoreLogo = document.getElementById('input-store-logo');
      if (inputStoreLogo) inputStoreLogo.value = '';
      const logoPreviewContainer = document.getElementById('logo-preview-container');
      if (logoPreviewContainer) logoPreviewContainer.classList.add('hidden');
      if (typeof updateLivePreview === 'function') updateLivePreview();
      showToast('Logo dihapus');
    });
  }

  // Save Store as Default
  const btnSaveDefaultStore = document.getElementById('btn-save-default-store');
  if (btnSaveDefaultStore) {
    btnSaveDefaultStore.addEventListener('click', () => {
      if (window.currentInvoice) {
        StorageService.saveStoreProfile(window.currentInvoice.store);
        showToast('Profil toko berhasil disimpan sebagai default!');
      }
    });
  }

  // Client inputs
  bindInput('input-client-name', (val) => { if (window.currentInvoice) window.currentInvoice.client.name = val; });
  bindInput('input-client-contact', (val) => { if (window.currentInvoice) window.currentInvoice.client.contactPerson = val; });
  bindInput('input-client-phone', (val) => { if (window.currentInvoice) window.currentInvoice.client.phone = val; });
  bindInput('input-client-email', (val) => { if (window.currentInvoice) window.currentInvoice.client.email = val; });
  bindInput('input-client-address', (val) => { if (window.currentInvoice) window.currentInvoice.client.address = val; });
  bindInput('input-shipping-address', (val) => { if (window.currentInvoice) window.currentInvoice.client.shippingAddress = val; });

  // Collapsible Items Section (Dropdown toggle for long item lists)
  const btnToggleItemsHeader = document.getElementById('btn-toggle-items-header');
  const btnToggleItemsSection = document.getElementById('btn-toggle-items-section');
  const btnCollapseItemsBottom = document.getElementById('btn-collapse-items-bottom');
  const itemsCollapsedSummary = document.getElementById('items-collapsed-summary');

  [btnToggleItemsHeader, btnToggleItemsSection].forEach(el => {
    if (el) {
      el.addEventListener('click', () => {
        setItemsSectionCollapsed(!window.isItemsSectionCollapsed);
      });
    }
  });

  if (btnCollapseItemsBottom) {
    btnCollapseItemsBottom.addEventListener('click', () => {
      setItemsSectionCollapsed(true);
      const card = document.getElementById('card-items-section');
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  if (itemsCollapsedSummary) {
    itemsCollapsedSummary.addEventListener('click', () => {
      setItemsSectionCollapsed(false);
    });
  }

  // Add Item Button (Positioned directly below the last item card)
  const btnAddItem = document.getElementById('btn-add-item');
  if (btnAddItem) {
    btnAddItem.addEventListener('click', () => {
      if (!window.currentInvoice) return;
      if (window.isItemsSectionCollapsed) {
        setItemsSectionCollapsed(false);
      }
      window.currentInvoice.items.push({
        id: Date.now(),
        name: '',
        description: '',
        qty: 1,
        unit: 'Pcs',
        price: 0,
        discount: 0
      });
      renderFormItems();
      if (typeof updateLivePreview === 'function') updateLivePreview();

      // Automatically focus on the newly added item's name input
      const allItemInputs = document.querySelectorAll('#items-container .item-name');
      if (allItemInputs.length > 0) {
        const lastInput = allItemInputs[allItemInputs.length - 1];
        lastInput.focus();
        lastInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }

  // Financial inputs with thousands separator format
  const discTypeSelect = document.getElementById('input-discount-type');
  const discValInput = document.getElementById('input-discount-val');
  const shipInput = document.getElementById('input-shipping-fee');
  const otherInput = document.getElementById('input-other-fee');
  const dpInput = document.getElementById('input-down-payment');

  if (discTypeSelect) {
    discTypeSelect.addEventListener('change', (e) => {
      if (window.currentInvoice) window.currentInvoice.globalDiscountType = e.target.value;
      if (discValInput && window.currentInvoice) {
        if (e.target.value === 'percent') {
          discValInput.value = window.currentInvoice.globalDiscountValue > 100 ? 100 : window.currentInvoice.globalDiscountValue;
        } else {
          discValInput.value = formatThousands(window.currentInvoice.globalDiscountValue || 0);
        }
      }
      if (typeof updateLivePreview === 'function') updateLivePreview();
    });
  }

  if (discValInput) {
    bindCurrencyInput(
      discValInput,
      (val) => {
        if (window.currentInvoice) window.currentInvoice.globalDiscountValue = val;
        if (typeof updateLivePreview === 'function') updateLivePreview();
      },
      () => window.currentInvoice && window.currentInvoice.globalDiscountType === 'percent'
    );
  }

  bindInput('input-tax-rate', (val) => {
    if (window.currentInvoice) window.currentInvoice.taxRate = parseFloat(val) || 0;
    if (typeof updateLivePreview === 'function') updateLivePreview();
  });

  if (shipInput) {
    bindCurrencyInput(shipInput, (val) => {
      if (window.currentInvoice) window.currentInvoice.shippingFee = val;
      if (typeof updateLivePreview === 'function') updateLivePreview();
    });
  }

  if (otherInput) {
    bindCurrencyInput(otherInput, (val) => {
      if (window.currentInvoice) window.currentInvoice.otherFee = val;
      if (typeof updateLivePreview === 'function') updateLivePreview();
    });
  }

  if (dpInput) {
    bindCurrencyInput(dpInput, (val) => {
      if (window.currentInvoice) window.currentInvoice.downPayment = val;
      if (typeof updateLivePreview === 'function') updateLivePreview();
    });
  }

  // Add Bank Button
  const btnAddBank = document.getElementById('btn-add-bank');
  if (btnAddBank) {
    btnAddBank.addEventListener('click', () => {
      if (!window.currentInvoice) return;
      window.currentInvoice.banks.push({
        bankName: '',
        accountNumber: '',
        accountName: window.currentInvoice.store.name || ''
      });
      renderFormBanks();
      if (typeof updateLivePreview === 'function') updateLivePreview();
    });
  }

  // Notes & Terms
  bindInput('input-notes', (val) => { if (window.currentInvoice) window.currentInvoice.notes = val; });
  bindInput('input-terms', (val) => { if (window.currentInvoice) window.currentInvoice.terms = val; });

  const btnResetNotes = document.getElementById('btn-reset-default-notes');
  if (btnResetNotes) {
    btnResetNotes.addEventListener('click', () => {
      const defNotes = typeof DEFAULT_NOTES !== 'undefined' ? DEFAULT_NOTES : 'Terima kasih atas kepercayaan Anda bertransaksi dengan kami. Mohon periksa kembali kondisi barang saat serah terima.';
      if (window.currentInvoice) window.currentInvoice.notes = defNotes;
      const elNotes = document.getElementById('input-notes');
      if (elNotes) elNotes.value = defNotes;
      if (typeof updateLivePreview === 'function') updateLivePreview();
      showToast('Catatan dikembalikan ke teks standar');
    });
  }

  const btnResetTerms = document.getElementById('btn-reset-default-terms');
  if (btnResetTerms) {
    btnResetTerms.addEventListener('click', () => {
      const defTerms = typeof DEFAULT_TERMS !== 'undefined' ? DEFAULT_TERMS : '1. Pembayaran sah apabila dana sudah masuk ke rekening yang tertera di atas.\n2. Bukti transfer mohon dikonfirmasikan via WhatsApp.';
      if (window.currentInvoice) window.currentInvoice.terms = defTerms;
      const elTerms = document.getElementById('input-terms');
      if (elTerms) elTerms.value = defTerms;
      if (typeof updateLivePreview === 'function') updateLivePreview();
      showToast('Syarat & Ketentuan dikembalikan ke teks standar');
    });
  }

  // Signature inputs
  bindInput('input-signature-name', (val) => { if (window.currentInvoice) window.currentInvoice.signatureName = val; });
  bindInput('input-signature-title', (val) => { if (window.currentInvoice) window.currentInvoice.signatureTitle = val; });

  const checkStamp = document.getElementById('input-show-stamp');
  if (checkStamp) {
    checkStamp.addEventListener('change', (e) => {
      if (window.currentInvoice) window.currentInvoice.showStamp = e.target.checked;
      if (typeof updateLivePreview === 'function') updateLivePreview();
    });
  }

  // Signature Modal triggers
  const btnOpenSig = document.getElementById('btn-open-signature-modal');
  const modalSig = document.getElementById('modal-signature');
  const btnCloseSig = document.getElementById('btn-close-signature');
  const btnClearSig = document.getElementById('btn-clear-signature');
  const btnSaveSig = document.getElementById('btn-save-signature');

  if (btnOpenSig && modalSig) {
    btnOpenSig.addEventListener('click', () => {
      modalSig.classList.remove('hidden');
      if (window.signaturePad) {
        setTimeout(() => {
          const canvas = document.getElementById('signature-canvas');
          if (canvas) {
            const ratio = Math.max(window.devicePixelRatio || 1, 1);
            canvas.width = canvas.offsetWidth * ratio;
            canvas.height = canvas.offsetHeight * ratio;
            canvas.getContext("2d").scale(ratio, ratio);
            window.signaturePad.clear();
            if (window.currentInvoice && window.currentInvoice.signatureImage) {
              window.signaturePad.fromDataURL(window.currentInvoice.signatureImage);
            }
          }
        }, 100);
      }
    });
  }

  if (btnCloseSig && modalSig) {
    btnCloseSig.addEventListener('click', () => modalSig.classList.add('hidden'));
  }

  if (btnClearSig && window.signaturePad) {
    btnClearSig.addEventListener('click', () => window.signaturePad.clear());
  }

  if (btnSaveSig && window.signaturePad) {
    btnSaveSig.addEventListener('click', () => {
      if (!window.signaturePad.isEmpty()) {
        window.currentInvoice.signatureImage = window.signaturePad.toDataURL('image/png');
        showToast('Tanda tangan digital berhasil disimpan');
      } else {
        window.currentInvoice.signatureImage = '';
      }
      modalSig.classList.add('hidden');
      if (typeof updateLivePreview === 'function') updateLivePreview();
    });
  }

  // Signature image file upload
  const sigFileInput = document.getElementById('input-signature-file');
  if (sigFileInput) {
    sigFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (window.currentInvoice) window.currentInvoice.signatureImage = event.target.result;
          if (typeof updateLivePreview === 'function') updateLivePreview();
          showToast('Gambar tanda tangan/stempel diunggah');
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Download PDF Action
  const btnDownloadPDF = document.getElementById('btn-download-pdf');
  if (btnDownloadPDF) {
    btnDownloadPDF.addEventListener('click', async () => {
      const element = document.getElementById('invoice-preview-sheet');
      if (!element || !window.currentInvoice) return;

      const originalText = btnDownloadPDF.innerHTML;
      btnDownloadPDF.disabled = true;
      btnDownloadPDF.innerHTML = `
        <span class="inline-block animate-spin mr-2">⟳</span> Memproses PDF...
      `;

      try {
        await PDFExportService.exportToPDF(element, {
          invoiceNumber: window.currentInvoice.invoiceNumber,
          clientName: window.currentInvoice.client.name
        });

        // Otomatis simpan invoice ke Data Penjualan setelah PDF berhasil diunduh
        let autoSaved = false;
        const invNo = (window.currentInvoice.invoiceNumber || '').trim();
        const isDuplicate = invNo && StorageService.isInvoiceNumberDuplicate(invNo, window.currentInvoice.id);

        if (invNo && !isDuplicate) {
          autoSaved = StorageService.saveInvoice(window.currentInvoice);
          if (autoSaved) {
            if (typeof renderHistoryTable === 'function') renderHistoryTable();
            if (typeof renderSalesTable === 'function') renderSalesTable();
          }
        }

        if (autoSaved) {
          showToast('PDF berhasil diunduh & invoice otomatis tersimpan ke Data Penjualan!');
        } else if (isDuplicate) {
          showToast('PDF berhasil diunduh (tidak tersimpan otomatis karena nomor invoice duplikat)', 'error');
        } else {
          showToast('PDF berhasil diunduh!');
        }
      } catch (err) {
        console.error(err);
        showToast('Gagal mengunduh PDF. Menggunakan dialog cetak...', 'error');
        window.print();
      } finally {
        btnDownloadPDF.disabled = false;
        btnDownloadPDF.innerHTML = originalText;
        if (window.lucide) window.lucide.createIcons();
      }
    });
  }

  // Print Action
  const btnPrint = document.getElementById('btn-print');
  if (btnPrint) {
    btnPrint.addEventListener('click', () => {
      PDFExportService.printInvoice();
    });
  }

  // Save Invoice Action
  const btnSaveInvoice = document.getElementById('btn-save-invoice');
  if (btnSaveInvoice) {
    btnSaveInvoice.addEventListener('click', async () => {
      if (!window.currentInvoice) return;

      // Validate invoice number uniqueness & completeness
      if (!validateInvoiceNumber()) {
        const inputInvNo = document.getElementById('input-invoice-number');
        if (inputInvNo) {
          inputInvNo.focus();
          inputInvNo.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        await showAppAlert({
          title: 'Nomor Invoice Duplikat!',
          message: `Nomor invoice <strong>"${escapeHtml(window.currentInvoice.invoiceNumber || '')}"</strong> sudah terdaftar pada riwayat penjualan! Mohon ganti nomor invoice atau klik tombol acak 🎲 agar data transaksi tidak tertukar.`,
          buttonText: 'Perbaiki Nomor',
          type: 'danger',
          icon: '⚠️'
        });
        return;
      }

      const success = StorageService.saveInvoice(window.currentInvoice);
      if (success) {
        showToast('Invoice berhasil disimpan ke data penjualan!');
        if (typeof renderHistoryTable === 'function') renderHistoryTable();
        if (typeof renderSalesTable === 'function') renderSalesTable();
      } else {
        showToast('Gagal menyimpan invoice: Nomor invoice sudah terdaftar', 'error');
      }
    });
  }

  // New Invoice Action
  const btnNewInvoice = document.getElementById('btn-new-invoice');
  if (btnNewInvoice) {
    btnNewInvoice.addEventListener('click', async () => {
      const ok = await showAppConfirm({
        title: 'Buat Invoice Baru',
        message: 'Apakah Anda yakin ingin membuat invoice baru? Formulir rincian barang dan pelanggan akan dikosongkan (data profil toko Anda tetap aman tersimpan).',
        confirmText: 'Ya, Buat Baru',
        cancelText: 'Batal',
        type: 'primary',
        icon: '📄'
      });
      if (ok) {
        window.currentInvoice = StorageService.getBlankInvoice();
        setItemsSectionCollapsed(false);
        populateFormFromState();
        if (typeof renderSavedBanksCheckboxes === 'function') renderSavedBanksCheckboxes();
        const selClient = document.getElementById('select-saved-client');
        if (selClient) selClient.value = '';
        if (typeof updateLivePreview === 'function') updateLivePreview();
        showToast('Formulir invoice baru siap digunakan');
      }
    });
  }

  // History Modal triggers
  const btnOpenHistory = document.getElementById('btn-open-history');
  const modalHistory = document.getElementById('modal-history');
  const btnCloseHistory = document.getElementById('btn-close-history');

  if (btnOpenHistory && modalHistory) {
    btnOpenHistory.addEventListener('click', () => {
      if (typeof renderHistoryTable === 'function') renderHistoryTable();
      modalHistory.classList.remove('hidden');
    });
  }

  if (btnCloseHistory && modalHistory) {
    btnCloseHistory.addEventListener('click', () => modalHistory.classList.add('hidden'));
  }

  // Export / Import Full Application Backup (JSON)
  function handleFullBackupExport() {
    const summary = StorageService.exportDataJSON();
    if (summary) {
      showToast(`Cadangan lengkap diunduh (${summary.invoices} invoice, ${summary.products} produk, ${summary.customers} pelanggan, ${summary.banks} bank)`);
    } else {
      showToast('Cadangan seluruh data berhasil diunduh');
    }
  }

  function handleFullBackupImport(fileInput) {
    const file = fileInput?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const result = StorageService.importDataJSON(event.target.result);
      if (result && result.success) {
        const s = result.summary || {};

        // Ensure cloud sync finishes if logged into Firebase
        if (window.FirebaseSync && typeof window.FirebaseSync.getCurrentUser === 'function') {
          const user = window.FirebaseSync.getCurrentUser();
          if (user && typeof window.FirebaseSync.pushAllToCloud === 'function') {
            await window.FirebaseSync.pushAllToCloud(user.uid);
          }
        }

        // Refresh all UI subsystems cleanly
        if (typeof populateFormFromState === 'function') populateFormFromState();
        if (typeof renderSavedBanksChecklist === 'function') renderSavedBanksChecklist();
        if (typeof renderCustomerDatalist === 'function') renderCustomerDatalist();
        if (typeof renderProductDatalist === 'function') renderProductDatalist();
        if (typeof renderHistoryTable === 'function') renderHistoryTable();
        if (typeof renderSalesTable === 'function') renderSalesTable();
        if (typeof renderCatalogTableView === 'function') renderCatalogTableView();
        if (typeof updateCatalogBadge === 'function') updateCatalogBadge();
        if (typeof updateBuilderBadge === 'function') updateBuilderBadge();
        if (typeof updateLivePreview === 'function') updateLivePreview();

        showToast(`Data dipulihkan: ${s.invoices || 0} invoice, ${s.products || 0} produk, ${s.customers || 0} pelanggan, ${s.banks || 0} bank!`);
      } else {
        showToast('Format file cadangan tidak valid', 'error');
      }
      fileInput.value = '';
    };
    reader.readAsText(file);
  }

  const btnExportData = document.getElementById('btn-export-backup');
  if (btnExportData) {
    btnExportData.addEventListener('click', handleFullBackupExport);
  }

  const btnExportDropdown = document.getElementById('btn-dropdown-export-backup');
  if (btnExportDropdown) {
    btnExportDropdown.addEventListener('click', () => {
      const dd = document.getElementById('firebase-account-dropdown');
      if (dd) dd.classList.add('hidden');
      handleFullBackupExport();
    });
  }

  const fileImportInput = document.getElementById('input-import-backup');
  if (fileImportInput) {
    fileImportInput.addEventListener('change', (e) => handleFullBackupImport(e.target));
  }

  const fileImportDropdown = document.getElementById('input-dropdown-import-backup');
  if (fileImportDropdown) {
    fileImportDropdown.addEventListener('change', (e) => {
      const dd = document.getElementById('firebase-account-dropdown');
      if (dd) dd.classList.add('hidden');
      handleFullBackupImport(e.target);
    });
  }

  // Mobile View Toggle: Form vs Preview
  const tabForm = document.getElementById('tab-btn-form');
  const tabPreview = document.getElementById('tab-btn-preview');
  const colForm = document.getElementById('form-container');
  const colPreview = document.getElementById('preview-container');

  if (tabForm && tabPreview && colForm && colPreview) {
    tabForm.addEventListener('click', () => {
      tabForm.classList.add('bg-white', 'text-blue-600', 'shadow-sm');
      tabForm.classList.remove('text-slate-600');
      tabPreview.classList.remove('bg-white', 'text-blue-600', 'shadow-sm');
      tabPreview.classList.add('text-slate-600');
      colForm.classList.remove('hidden');
      colPreview.classList.add('hidden', 'lg:flex');
    });

    tabPreview.addEventListener('click', () => {
      tabPreview.classList.add('bg-white', 'text-blue-600', 'shadow-sm');
      tabPreview.classList.remove('text-slate-600');
      tabForm.classList.remove('bg-white', 'text-blue-600', 'shadow-sm');
      tabForm.classList.add('text-slate-600');
      colPreview.classList.remove('hidden');
      colForm.classList.add('hidden');
      if (typeof updateLivePreview === 'function') updateLivePreview();
    });
  }
}

// Global Exports
window.populateFormFromState = populateFormFromState;
window.renderFormItems = renderFormItems;
window.renderFormBanks = renderFormBanks;
window.bindInput = bindInput;
window.updateItemsSectionSummary = updateItemsSectionSummary;
window.setItemsSectionCollapsed = setItemsSectionCollapsed;
window.initViewNavigation = initViewNavigation;
window.switchView = switchView;
window.initSignaturePad = initSignaturePad;
window.setupEventListeners = setupEventListeners;
window.validateInvoiceNumber = validateInvoiceNumber;
