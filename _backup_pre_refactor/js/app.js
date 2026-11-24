/**
 * InvoicePro - Main Application Controller
 */

// Format Number to Rupiah (IDR)
function formatRupiah(amount, withPrefix = true) {
  if (amount === undefined || amount === null || isNaN(amount)) amount = 0;
  const formatted = Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return withPrefix ? `Rp ${formatted}` : formatted;
}

// Format raw number to Indonesian thousands separator string (e.g. 2000 -> "2.000")
function formatThousands(num) {
  if (num === undefined || num === null || isNaN(num) || num === '') return '0';
  const clean = Math.round(Number(num));
  return clean.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Parse thousands string back to raw number (e.g. "2.000" -> 2000)
function parseThousands(str) {
  if (str === undefined || str === null || str === '') return 0;
  const clean = String(str).replace(/\D/g, '');
  return clean ? parseInt(clean, 10) : 0;
}

// Bind live Indonesian thousands formatting to any input element
function bindCurrencyInput(inputElement, onValueChange, isPercentFn = null) {
  if (!inputElement) return;

  const handleInput = () => {
    // If field is currently percentage mode, allow 0-100 without thousand dots
    if (typeof isPercentFn === 'function' && isPercentFn()) {
      let val = parseFloat(inputElement.value) || 0;
      if (val > 100) {
        val = 100;
        inputElement.value = '100';
      }
      if (onValueChange) onValueChange(val);
      return;
    }

    const cursorPosition = inputElement.selectionStart || 0;
    const originalValue = inputElement.value || '';
    
    // Count digits before cursor in original text
    const digitsBeforeCursor = originalValue.slice(0, cursorPosition).replace(/\D/g, '').length;
    
    // Clean all non-digit characters
    const cleanDigits = originalValue.replace(/\D/g, '');
    
    if (!cleanDigits) {
      inputElement.value = '';
      if (onValueChange) onValueChange(0);
      return;
    }
    
    // Limit to max 15 digits
    const numericValue = parseInt(cleanDigits.slice(0, 15), 10) || 0;
    const formatted = numericValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    
    inputElement.value = formatted;
    
    // Recalculate cursor position to keep typing smooth and natural
    let newCursorPosition = 0;
    let digitsCount = 0;
    for (let i = 0; i < formatted.length; i++) {
      if (/\d/.test(formatted[i])) {
        digitsCount++;
      }
      if (digitsCount === digitsBeforeCursor) {
        newCursorPosition = i + 1;
        break;
      }
    }
    if (digitsBeforeCursor === 0) newCursorPosition = 0;
    if (digitsCount < digitsBeforeCursor) newCursorPosition = formatted.length;
    
    inputElement.setSelectionRange(newCursorPosition, newCursorPosition);
    
    if (onValueChange) onValueChange(numericValue);
  };

  inputElement.addEventListener('input', handleInput);

  inputElement.addEventListener('blur', () => {
    if (inputElement.value.trim() === '') {
      inputElement.value = '0';
      if (onValueChange) onValueChange(0);
    }
  });

  inputElement.addEventListener('focus', () => {
    if (inputElement.value === '0') {
      inputElement.select();
    }
  });
}

// Convert Number to Indonesian Words (Terbilang)
function terbilangAngka(n) {
  n = Math.floor(Math.abs(n));
  const huruf = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
  
  if (n < 12) return huruf[n];
  if (n < 20) return terbilangAngka(n - 10) + ' Belas';
  if (n < 100) return (huruf[Math.floor(n / 10)] || terbilangAngka(Math.floor(n / 10))) + ' Puluh ' + terbilangAngka(n % 10);
  if (n < 200) return 'Seratus ' + terbilangAngka(n - 100);
  if (n < 1000) return terbilangAngka(Math.floor(n / 100)) + ' Ratus ' + terbilangAngka(n % 100);
  if (n < 2000) return 'Seribu ' + terbilangAngka(n - 1000);
  if (n < 1000000) return terbilangAngka(Math.floor(n / 1000)) + ' Ribu ' + terbilangAngka(n % 1000);
  if (n < 1000000000) return terbilangAngka(Math.floor(n / 1000000)) + ' Juta ' + terbilangAngka(n % 1000000);
  if (n < 1000000000000) return terbilangAngka(Math.floor(n / 1000000000)) + ' Miliar ' + terbilangAngka(n % 1000000000);
  if (n < 1000000000000000) return terbilangAngka(Math.floor(n / 1000000000000)) + ' Triliun ' + terbilangAngka(n % 1000000000000);
  return '';
}

function angkaKeTerbilang(n) {
  if (n === 0 || isNaN(n)) return 'Nol Rupiah';
  const text = terbilangAngka(n).replace(/\s+/g, ' ').trim();
  return text ? `${text} Rupiah` : 'Nol Rupiah';
}

// Format date to Indonesian localized format (e.g., 23 November 2026)
function formatTanggalIndo(dateStr) {
  if (!dateStr) return '-';
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parts[0];
  const month = months[parseInt(parts[1], 10) - 1] || parts[1];
  const day = parseInt(parts[2], 10);
  return `${day} ${month} ${year}`;
}

// Generate unique invoice number
function generateInvoiceNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `INV/${year}${month}${day}/${random}`;
}

// Toast notification helper
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icon = type === 'success' ? '✓' : '!';
  toast.innerHTML = `
    <span class="inline-flex items-center justify-center w-6 h-6 rounded-full ${type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'} font-bold text-xs">${icon}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/**
 * Modern In-App Confirmation Dialog (Native Desktop App Experience)
 * Replaces ugly browser native confirm() popups with sleek modal.
 */
function showAppConfirm({
  title = 'Konfirmasi Tindakan',
  message = 'Apakah Anda yakin ingin melanjutkan tindakan ini?',
  confirmText = 'Ya, Lanjutkan',
  cancelText = 'Batal',
  type = 'danger', // 'danger' | 'warning' | 'primary'
  icon = '🗑️'
} = {}) {
  return new Promise((resolve) => {
    const modal = document.getElementById('modal-app-confirm');
    const titleEl = document.getElementById('app-confirm-title');
    const msgEl = document.getElementById('app-confirm-message');
    const btnOk = document.getElementById('btn-app-confirm-ok');
    const btnCancel = document.getElementById('btn-app-confirm-cancel');
    const iconEl = document.getElementById('app-confirm-icon');
    const iconBg = document.getElementById('app-confirm-icon-bg');

    if (!modal || !btnOk || !btnCancel) {
      resolve(window.confirm(message.replace(/<[^>]+>/g, '')));
      return;
    }

    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.innerHTML = message;
    if (iconEl) iconEl.textContent = icon;
    if (btnOk) btnOk.textContent = confirmText;
    if (btnCancel) btnCancel.textContent = cancelText;

    if (!cancelText) {
      btnCancel.classList.add('hidden');
      btnOk.parentElement.classList.remove('grid-cols-2');
      btnOk.parentElement.classList.add('grid-cols-1');
    } else {
      btnCancel.classList.remove('hidden');
      btnOk.parentElement.classList.remove('grid-cols-1');
      btnOk.parentElement.classList.add('grid-cols-2');
    }

    if (iconBg) {
      if (type === 'danger') {
        iconBg.className = 'w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-rose-50 text-rose-600 text-2xl shadow-inner border border-rose-100';
        btnOk.className = 'w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-200 transition active:scale-95 cursor-pointer';
      } else if (type === 'warning') {
        iconBg.className = 'w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-amber-50 text-amber-600 text-2xl shadow-inner border border-amber-100';
        btnOk.className = 'w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-200 transition active:scale-95 cursor-pointer';
      } else {
        // primary / slate default
        iconBg.className = 'w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-slate-100 text-slate-800 text-2xl shadow-inner border border-slate-200';
        btnOk.className = 'w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md shadow-slate-300 transition active:scale-95 cursor-pointer';
      }
    }

    modal.classList.remove('hidden');

    function cleanup(result) {
      modal.classList.add('hidden');
      btnOk.removeEventListener('click', onOk);
      btnCancel.removeEventListener('click', onCancel);
      modal.removeEventListener('click', onBackdrop);
      window.removeEventListener('keydown', onKeyDown);
      resolve(result);
    }

    function onOk() { cleanup(true); }
    function onCancel() { cleanup(false); }
    function onBackdrop(e) { if (e.target === modal) cleanup(false); }
    function onKeyDown(e) {
      if (e.key === 'Escape') cleanup(false);
      else if (e.key === 'Enter') cleanup(true);
    }

    btnOk.addEventListener('click', onOk);
    btnCancel.addEventListener('click', onCancel);
    modal.addEventListener('click', onBackdrop);
    window.addEventListener('keydown', onKeyDown);
  });
}

function showAppAlert({
  title = 'Informasi',
  message = '',
  buttonText = 'Mengerti',
  type = 'primary',
  icon = 'ℹ️'
} = {}) {
  return showAppConfirm({
    title,
    message,
    confirmText: buttonText,
    cancelText: '',
    type,
    icon
  });
}

window.appConfirm = showAppConfirm;
window.appAlert = showAppAlert;

// Application State
let currentInvoice = null;
let signaturePad = null;
let currentZoom = 1;

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Start with clean blank invoice (no dummy sample data; respects saved store profile if any)
  currentInvoice = StorageService.getBlankInvoice();

  // Initialize UI
  initSignaturePad();
  populateFormFromState();
  setupEventListeners();
  initMasterDataControllers();
  updateLivePreview();
  renderHistoryTable();
  renderSalesTable();
  initViewNavigation();
});

// Initialize Signature Pad
function initSignaturePad() {
  const canvas = document.getElementById('signature-canvas');
  if (canvas && window.SignaturePad) {
    signaturePad = new SignaturePad(canvas, {
      backgroundColor: 'rgba(255, 255, 255, 0)',
      penColor: '#0f172a'
    });

    // Resize canvas correctly
    function resizeCanvas() {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext("2d").scale(ratio, ratio);
      signaturePad.clear();
      if (currentInvoice.signatureImage) {
        signaturePad.fromDataURL(currentInvoice.signatureImage);
      }
    }

    window.addEventListener("resize", resizeCanvas);
    setTimeout(resizeCanvas, 200);
  }
}

// Populate Form inputs from current state
function populateFormFromState() {
  const inv = currentInvoice;

  // Theme
  document.getElementById('input-theme').value = inv.theme || 'dark';
  document.body.setAttribute('data-theme', inv.theme || 'dark');

  // Meta
  document.getElementById('input-invoice-number').value = inv.invoiceNumber || '';
  document.getElementById('input-date').value = inv.date || '';
  document.getElementById('input-due-date').value = inv.dueDate || '';
  document.getElementById('input-status').value = inv.status || 'LUNAS';

  // Store Info
  document.getElementById('input-store-name').value = inv.store.name || '';
  document.getElementById('input-store-tagline').value = inv.store.tagline || '';
  document.getElementById('input-store-address').value = inv.store.address || '';
  document.getElementById('input-store-phone').value = inv.store.phone || '';
  document.getElementById('input-store-email').value = inv.store.email || '';
  document.getElementById('input-store-npwp').value = inv.store.npwp || '';

  if (inv.store.logo) {
    document.getElementById('logo-preview-img').src = inv.store.logo;
    document.getElementById('logo-preview-container').classList.remove('hidden');
  } else {
    document.getElementById('logo-preview-container').classList.add('hidden');
  }

  // Client Info
  document.getElementById('input-client-name').value = inv.client.name || '';
  document.getElementById('input-client-contact').value = inv.client.contactPerson || '';
  document.getElementById('input-client-phone').value = inv.client.phone || '';
  document.getElementById('input-client-email').value = inv.client.email || '';
  document.getElementById('input-client-address').value = inv.client.address || '';
  document.getElementById('input-shipping-address').value = inv.client.shippingAddress || '';

  // Items
  renderFormItems();

  // Financial fields
  const discType = inv.globalDiscountType || 'fixed';
  document.getElementById('input-discount-type').value = discType;
  document.getElementById('input-discount-val').value = discType === 'percent'
    ? (inv.globalDiscountValue || 0)
    : formatThousands(inv.globalDiscountValue || 0);
  document.getElementById('input-tax-rate').value = inv.taxRate || 0;
  document.getElementById('input-shipping-fee').value = formatThousands(inv.shippingFee || 0);
  document.getElementById('input-other-fee').value = formatThousands(inv.otherFee || 0);
  document.getElementById('input-down-payment').value = formatThousands(inv.downPayment || 0);

  // Banks
  renderFormBanks();

  // Notes & Terms
  document.getElementById('input-notes').value = inv.notes !== undefined ? inv.notes : (typeof DEFAULT_NOTES !== 'undefined' ? DEFAULT_NOTES : '');
  document.getElementById('input-terms').value = inv.terms !== undefined ? inv.terms : (typeof DEFAULT_TERMS !== 'undefined' ? DEFAULT_TERMS : '');

  // Signature
  document.getElementById('input-signature-name').value = inv.signatureName || '';
  document.getElementById('input-signature-title').value = inv.signatureTitle || '';
  document.getElementById('input-show-stamp').checked = !!inv.showStamp;
}

// Render dynamic items in form
function renderFormItems() {
  const container = document.getElementById('items-container');
  if (!container) return;
  container.innerHTML = '';

  currentInvoice.items.forEach((item, index) => {
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
          <button type="button" class="btn-duplicate-item text-xs text-slate-500 hover:text-blue-600 px-2 py-1 rounded bg-white border border-slate-200 hover:bg-slate-50 transition" title="Duplikat item">
            Salin
          </button>
          ${currentInvoice.items.length > 1 ? `
          <button type="button" class="btn-delete-item text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded bg-white border border-red-200 hover:bg-red-50 transition" title="Hapus item">
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

    // Row events
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
      updateLivePreview();
    };

    bindCurrencyInput(priceInput, (val) => {
      item.price = val;
      const newSubtotal = (item.qty * item.price) - (item.discount || 0);
      itemRow.querySelector('.item-subtotal').textContent = formatRupiah(newSubtotal);
      updateLivePreview();
    });

    bindCurrencyInput(discountInput, (val) => {
      item.discount = val;
      const newSubtotal = (item.qty * item.price) - (item.discount || 0);
      itemRow.querySelector('.item-subtotal').textContent = formatRupiah(newSubtotal);
      updateLivePreview();
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
      updateLivePreview();
      showToast(`Barang "${p.name}" dipilih dari katalog: Harga otomatis diisi ✓`, 'success');
    };

    nameInput.addEventListener('input', () => {
      updateItemData();
      showSuggestions(nameInput.value);
    });

    nameInput.addEventListener('focus', () => {
      showSuggestions(nameInput.value);
    });

    nameInput.addEventListener('blur', () => {
      setTimeout(() => {
        suggestDropdown.classList.add('hidden');
      }, 200);
    });

    [unitInput, descInput, qtyInput].forEach(inp => {
      inp.addEventListener('input', updateItemData);
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
        currentInvoice.items.splice(index, 1);
        renderFormItems();
        updateLivePreview();
      });
    }

    const btnDuplicate = itemRow.querySelector('.btn-duplicate-item');
    if (btnDuplicate) {
      btnDuplicate.addEventListener('click', () => {
        const copy = JSON.parse(JSON.stringify(item));
        copy.id = Date.now();
        currentInvoice.items.splice(index + 1, 0, copy);
        renderFormItems();
        updateLivePreview();
        showToast('Item berhasil disalin');
      });
    }

    container.appendChild(itemRow);
  });
}

// Render dynamic bank accounts in form
function renderFormBanks() {
  const container = document.getElementById('banks-container');
  if (!container) return;
  container.innerHTML = '';

  if (currentInvoice.banks.length === 0) {
    const emptyNotice = document.createElement('div');
    emptyNotice.className = 'text-xs text-slate-400 italic p-3 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-center';
    emptyNotice.innerHTML = 'Belum ada rekening yang dipilih untuk invoice ini. Silakan centang salah satu rekening tersimpan di atas atau klik "+ Tambah Baris" untuk mengetik manual.';
    container.appendChild(emptyNotice);
    return;
  }

  currentInvoice.banks.forEach((bank, index) => {
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
        <button type="button" class="btn-save-bank-master p-1.5 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded border border-blue-200 bg-white" title="Simpan rekening ini ke Master Rekening">
          💾 Simpan
        </button>
        <button type="button" class="btn-delete-bank p-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded border border-red-200 bg-white" title="Hapus dari invoice">
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
      updateLivePreview();
      if (typeof renderSavedBanksCheckboxes === 'function') renderSavedBanksCheckboxes();
    };

    [nameInput, accInput, ownerInput].forEach(inp => inp.addEventListener('input', updateBank));

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
        currentInvoice.banks.splice(index, 1);
        renderFormBanks();
        if (typeof renderSavedBanksCheckboxes === 'function') renderSavedBanksCheckboxes();
        updateLivePreview();
      });
    }

    container.appendChild(bankRow);
  });
}

// Calculate financial totals
function calculateFinancials() {
  const inv = currentInvoice;

  let rawSubtotal = 0;
  inv.items.forEach(item => {
    const itemSub = (item.qty * item.price) - (item.discount || 0);
    rawSubtotal += Math.max(itemSub, 0);
  });

  // Global Discount
  let discountAmount = 0;
  if (inv.globalDiscountType === 'percent') {
    discountAmount = (rawSubtotal * (parseFloat(inv.globalDiscountValue) || 0)) / 100;
  } else {
    discountAmount = parseFloat(inv.globalDiscountValue) || 0;
  }
  discountAmount = Math.min(discountAmount, rawSubtotal);

  const taxableAmount = Math.max(rawSubtotal - discountAmount, 0);

  // Tax (PPN)
  const taxRate = parseFloat(inv.taxRate) || 0;
  const taxAmount = (taxableAmount * taxRate) / 100;

  // Additional Fees
  const shipping = parseFloat(inv.shippingFee) || 0;
  const otherFee = parseFloat(inv.otherFee) || 0;

  // Grand Total
  const grandTotal = Math.max(taxableAmount + taxAmount + shipping + otherFee, 0);

  // Down Payment & Balance Due
  const dp = parseFloat(inv.downPayment) || 0;
  const balanceDue = Math.max(grandTotal - dp, 0);

  return {
    subtotal: rawSubtotal,
    discountAmount,
    taxableAmount,
    taxRate,
    taxAmount,
    shipping,
    otherFee,
    grandTotal,
    downPayment: dp,
    balanceDue
  };
}

// Update the Live Preview Sheet on the Right Side
function updateLivePreview() {
  const inv = currentInvoice;
  const totals = calculateFinancials();

  // Theme application
  document.body.setAttribute('data-theme', inv.theme || 'dark');

  // Preview elements
  const elStoreName = document.getElementById('pv-store-name');
  const elStoreTagline = document.getElementById('pv-store-tagline');
  const elStoreAddress = document.getElementById('pv-store-address');
  const elStorePhone = document.getElementById('pv-store-phone');
  const elStoreEmail = document.getElementById('pv-store-email');
  const elStoreNpwp = document.getElementById('pv-store-npwp');
  const elStoreLogo = document.getElementById('pv-store-logo');

  if (elStoreName) elStoreName.textContent = inv.store.name || 'NAMA PERUSAHAAN / TOKO';
  if (elStoreTagline) {
    elStoreTagline.textContent = inv.store.tagline || '';
    elStoreTagline.style.display = inv.store.tagline ? 'block' : 'none';
  }
  if (elStoreAddress) elStoreAddress.textContent = inv.store.address || '';
  if (elStorePhone) elStorePhone.textContent = inv.store.phone ? `Telp/WA: ${inv.store.phone}` : '';
  if (elStoreEmail) elStoreEmail.textContent = inv.store.email ? `Email: ${inv.store.email}` : '';
  if (elStoreNpwp) {
    elStoreNpwp.textContent = inv.store.npwp ? `NPWP: ${inv.store.npwp}` : '';
    elStoreNpwp.style.display = inv.store.npwp ? 'block' : 'none';
  }

  // Logo
  if (elStoreLogo) {
    if (inv.store.logo) {
      elStoreLogo.src = inv.store.logo;
      elStoreLogo.classList.remove('hidden');
    } else {
      elStoreLogo.classList.add('hidden');
    }
  }

  // Invoice Meta
  const elInvoiceNo = document.getElementById('pv-invoice-number');
  const elDate = document.getElementById('pv-date');
  const elDueDate = document.getElementById('pv-due-date');
  const elStatusBadge = document.getElementById('pv-status-badge');
  const elStamp = document.getElementById('pv-stamp-watermark');

  if (elInvoiceNo) elInvoiceNo.textContent = inv.invoiceNumber || 'INV-001';
  if (elDate) elDate.textContent = formatTanggalIndo(inv.date);
  if (elDueDate) elDueDate.textContent = formatTanggalIndo(inv.dueDate);

  // Status Styling
  if (elStatusBadge) {
    elStatusBadge.textContent = inv.status;
    elStatusBadge.className = 'px-3 py-1 text-xs font-extrabold rounded-md uppercase tracking-wider inline-block';
    
    if (inv.status === 'LUNAS') {
      elStatusBadge.classList.add('bg-emerald-100', 'text-emerald-800', 'border', 'border-emerald-300');
    } else if (inv.status === 'BELUM LUNAS') {
      elStatusBadge.classList.add('bg-amber-100', 'text-amber-800', 'border', 'border-amber-300');
    } else if (inv.status === 'JATUH TEMPO') {
      elStatusBadge.classList.add('bg-red-100', 'text-red-800', 'border', 'border-red-300');
    } else {
      elStatusBadge.classList.add('bg-blue-100', 'text-blue-800', 'border', 'border-blue-300');
    }
  }

  // Watermark Stamp
  if (elStamp) {
    if (inv.showStamp) {
      elStamp.classList.remove('hidden');
      elStamp.textContent = inv.status;
      elStamp.className = 'stamp-watermark';
      if (inv.status === 'LUNAS') elStamp.classList.add('paid');
      else if (inv.status === 'BELUM LUNAS') elStamp.classList.add('unpaid');
      else if (inv.status === 'JATUH TEMPO') elStamp.classList.add('overdue');
      else elStamp.classList.add('partial');
    } else {
      elStamp.classList.add('hidden');
    }
  }

  // Client Info
  const elClientName = document.getElementById('pv-client-name');
  const elClientContact = document.getElementById('pv-client-contact');
  const elClientPhone = document.getElementById('pv-client-phone');
  const elClientEmail = document.getElementById('pv-client-email');
  const elClientAddress = document.getElementById('pv-client-address');
  const elShippingRow = document.getElementById('pv-shipping-row');
  const elShippingAddress = document.getElementById('pv-shipping-address');

  if (elClientName) elClientName.textContent = inv.client.name || 'Pelanggan / Perusahaan Klien';
  if (elClientContact) {
    elClientContact.textContent = inv.client.contactPerson ? `Up: ${inv.client.contactPerson}` : '';
    elClientContact.style.display = inv.client.contactPerson ? 'block' : 'none';
  }
  if (elClientPhone) elClientPhone.textContent = inv.client.phone ? `No. Telp/WA: ${inv.client.phone}` : '';
  if (elClientEmail) elClientEmail.textContent = inv.client.email ? `Email: ${inv.client.email}` : '';
  if (elClientAddress) elClientAddress.textContent = inv.client.address || '';

  if (elShippingRow && elShippingAddress) {
    if (inv.client.shippingAddress) {
      elShippingRow.classList.remove('hidden');
      elShippingAddress.textContent = inv.client.shippingAddress;
    } else {
      elShippingRow.classList.add('hidden');
    }
  }

  // Table Items
  const tbody = document.getElementById('pv-table-body');
  if (tbody) {
    tbody.innerHTML = '';
    inv.items.forEach((item, idx) => {
      const itemSub = (item.qty * item.price) - (item.discount || 0);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="text-center font-medium text-slate-500 text-[8.5px]">${idx + 1}</td>
        <td>
          <div class="font-bold text-slate-800 text-[9.5px] leading-tight">${escapeHtml(item.name || '-')}</div>
          ${item.description ? `<div class="text-[8px] text-slate-500 leading-tight mt-0.5">${escapeHtml(item.description)}</div>` : ''}
        </td>
        <td class="text-center font-medium text-slate-700 text-[9px] whitespace-nowrap">${item.qty} ${escapeHtml(item.unit || '')}</td>
        <td class="text-right text-slate-700 text-[9.5px] font-mono whitespace-nowrap font-medium">${formatRupiah(item.price)}</td>
        <td class="text-right text-slate-600 text-[9.5px] font-mono whitespace-nowrap font-medium">${item.discount ? formatRupiah(item.discount) : '-'}</td>
        <td class="text-right font-bold text-slate-900 text-[9.5px] font-mono whitespace-nowrap">${formatRupiah(itemSub)}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Summary Totals
  document.getElementById('pv-subtotal').textContent = formatRupiah(totals.subtotal);
  
  const rowDiscount = document.getElementById('pv-discount-row');
  if (rowDiscount) {
    if (totals.discountAmount > 0) {
      rowDiscount.classList.remove('hidden');
      document.getElementById('pv-discount-val').textContent = `- ${formatRupiah(totals.discountAmount)}`;
    } else {
      rowDiscount.classList.add('hidden');
    }
  }

  const rowTax = document.getElementById('pv-tax-row');
  if (rowTax) {
    if (totals.taxRate > 0) {
      rowTax.classList.remove('hidden');
      document.getElementById('pv-tax-label').textContent = `PPN (${totals.taxRate}%):`;
      document.getElementById('pv-tax-val').textContent = formatRupiah(totals.taxAmount);
    } else {
      rowTax.classList.add('hidden');
    }
  }

  const rowShipping = document.getElementById('pv-shipping-fee-row');
  if (rowShipping) {
    if (totals.shipping > 0) {
      rowShipping.classList.remove('hidden');
      document.getElementById('pv-shipping-fee-val').textContent = formatRupiah(totals.shipping);
    } else {
      rowShipping.classList.add('hidden');
    }
  }

  const rowOther = document.getElementById('pv-other-fee-row');
  if (rowOther) {
    if (totals.otherFee > 0) {
      rowOther.classList.remove('hidden');
      document.getElementById('pv-other-fee-val').textContent = formatRupiah(totals.otherFee);
    } else {
      rowOther.classList.add('hidden');
    }
  }

  document.getElementById('pv-grand-total').textContent = formatRupiah(totals.grandTotal);
  document.getElementById('pv-terbilang').textContent = angkaKeTerbilang(totals.grandTotal);

  // Down Payment / Balance Due Display
  const rowDp = document.getElementById('pv-dp-row');
  const rowBalance = document.getElementById('pv-balance-row');
  if (rowDp && rowBalance) {
    if (inv.status === 'DP' || totals.downPayment > 0) {
      rowDp.classList.remove('hidden');
      rowBalance.classList.remove('hidden');
      document.getElementById('pv-dp-val').textContent = formatRupiah(totals.downPayment);
      document.getElementById('pv-balance-val').textContent = formatRupiah(totals.balanceDue);
    } else {
      rowDp.classList.add('hidden');
      rowBalance.classList.add('hidden');
    }
  }

  // Banks in Preview
  const pvBanks = document.getElementById('pv-banks-container');
  if (pvBanks) {
    pvBanks.innerHTML = '';
    inv.banks.forEach(bank => {
      if (!bank.bankName && !bank.accountNumber) return;
      const card = document.createElement('div');
      card.className = 'text-[9px] border-l-2 border-slate-300 pl-2 py-0.5';
      card.innerHTML = `
        <div class="font-bold text-slate-800 text-[9px]">${escapeHtml(bank.bankName || '')}</div>
        <div class="font-mono text-slate-900 font-semibold tracking-wide text-[9.5px]">${escapeHtml(bank.accountNumber || '')}</div>
        <div class="text-[8px] text-slate-500">A/N: ${escapeHtml(bank.accountName || '')}</div>
      `;
      pvBanks.appendChild(card);
    });
  }

  // Notes & Terms
  const elNotes = document.getElementById('pv-notes');
  const elNotesBox = document.getElementById('pv-notes-box');
  if (elNotes && elNotesBox) {
    if (inv.notes) {
      elNotesBox.classList.remove('hidden');
      elNotes.textContent = inv.notes;
    } else {
      elNotesBox.classList.add('hidden');
    }
  }

  const elTerms = document.getElementById('pv-terms');
  const elTermsBox = document.getElementById('pv-terms-box');
  if (elTerms && elTermsBox) {
    if (inv.terms) {
      elTermsBox.classList.remove('hidden');
      elTerms.innerHTML = escapeHtml(inv.terms).replace(/\n/g, '<br>');
    } else {
      elTermsBox.classList.add('hidden');
    }
  }

  // Signature
  const elSignName = document.getElementById('pv-signature-name');
  const elSignTitle = document.getElementById('pv-signature-title');
  const elSignImg = document.getElementById('pv-signature-img');

  if (elSignName) elSignName.textContent = inv.signatureName || '';
  if (elSignTitle) elSignTitle.textContent = inv.signatureTitle || '';
  
  if (elSignImg) {
    if (inv.signatureImage) {
      elSignImg.src = inv.signatureImage;
      elSignImg.classList.remove('hidden');
    } else {
      elSignImg.classList.add('hidden');
    }
  }
}

// Setup Event Listeners
function setupEventListeners() {
  // Theme selector
  const themeSelect = document.getElementById('input-theme');
  if (themeSelect) {
    themeSelect.addEventListener('change', (e) => {
      currentInvoice.theme = e.target.value;
      updateLivePreview();
    });
  }

  // Meta inputs
  bindInput('input-invoice-number', (val) => currentInvoice.invoiceNumber = val);
  bindInput('input-date', (val) => currentInvoice.date = val);
  bindInput('input-due-date', (val) => currentInvoice.dueDate = val);
  
  const statusSelect = document.getElementById('input-status');
  if (statusSelect) {
    statusSelect.addEventListener('change', (e) => {
      currentInvoice.status = e.target.value;
      const dpContainer = document.getElementById('dp-input-container');
      if (dpContainer) {
        if (e.target.value === 'DP') {
          dpContainer.classList.remove('hidden');
        } else {
          dpContainer.classList.add('hidden');
        }
      }
      updateLivePreview();
    });
  }

  // Generate Invoice Number Button
  const btnGenNo = document.getElementById('btn-generate-no');
  if (btnGenNo) {
    btnGenNo.addEventListener('click', () => {
      const newNo = generateInvoiceNumber();
      document.getElementById('input-invoice-number').value = newNo;
      currentInvoice.invoiceNumber = newNo;
      updateLivePreview();
      showToast('Nomor invoice baru dibuat');
    });
  }

  // Store profile inputs
  bindInput('input-store-name', (val) => currentInvoice.store.name = val);
  bindInput('input-store-tagline', (val) => currentInvoice.store.tagline = val);
  bindInput('input-store-address', (val) => currentInvoice.store.address = val);
  bindInput('input-store-phone', (val) => currentInvoice.store.phone = val);
  bindInput('input-store-email', (val) => currentInvoice.store.email = val);
  bindInput('input-store-npwp', (val) => currentInvoice.store.npwp = val);

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
          currentInvoice.store.logo = event.target.result;
          document.getElementById('logo-preview-img').src = event.target.result;
          document.getElementById('logo-preview-container').classList.remove('hidden');
          updateLivePreview();
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
      currentInvoice.store.logo = '';
      document.getElementById('input-store-logo').value = '';
      document.getElementById('logo-preview-container').classList.add('hidden');
      updateLivePreview();
      showToast('Logo dihapus');
    });
  }

  // Save Store as Default
  const btnSaveDefaultStore = document.getElementById('btn-save-default-store');
  if (btnSaveDefaultStore) {
    btnSaveDefaultStore.addEventListener('click', () => {
      StorageService.saveStoreProfile(currentInvoice.store);
      showToast('Profil toko berhasil disimpan sebagai default!');
    });
  }

  // Client inputs
  bindInput('input-client-name', (val) => currentInvoice.client.name = val);
  bindInput('input-client-contact', (val) => currentInvoice.client.contactPerson = val);
  bindInput('input-client-phone', (val) => currentInvoice.client.phone = val);
  bindInput('input-client-email', (val) => currentInvoice.client.email = val);
  bindInput('input-client-address', (val) => currentInvoice.client.address = val);
  bindInput('input-shipping-address', (val) => currentInvoice.client.shippingAddress = val);

  // Add Item Button (Positioned directly below the last item card)
  const btnAddItem = document.getElementById('btn-add-item');
  if (btnAddItem) {
    btnAddItem.addEventListener('click', () => {
      currentInvoice.items.push({
        id: Date.now(),
        name: '',
        description: '',
        qty: 1,
        unit: 'Pcs',
        price: 0,
        discount: 0
      });
      renderFormItems();
      updateLivePreview();

      // Automatically focus on the newly added item's name input
      const allItemInputs = document.querySelectorAll('#items-container .item-name');
      if (allItemInputs.length > 0) {
        const lastInput = allItemInputs[allItemInputs.length - 1];
        lastInput.focus();
        lastInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }

  // Financial inputs with Indonesian thousands separator format
  const discTypeSelect = document.getElementById('input-discount-type');
  const discValInput = document.getElementById('input-discount-val');
  const shipInput = document.getElementById('input-shipping-fee');
  const otherInput = document.getElementById('input-other-fee');
  const dpInput = document.getElementById('input-down-payment');

  if (discTypeSelect) {
    discTypeSelect.addEventListener('change', (e) => {
      currentInvoice.globalDiscountType = e.target.value;
      if (discValInput) {
        if (e.target.value === 'percent') {
          discValInput.value = currentInvoice.globalDiscountValue > 100 ? 100 : currentInvoice.globalDiscountValue;
        } else {
          discValInput.value = formatThousands(currentInvoice.globalDiscountValue || 0);
        }
      }
      updateLivePreview();
    });
  }

  if (discValInput) {
    bindCurrencyInput(
      discValInput,
      (val) => {
        currentInvoice.globalDiscountValue = val;
        updateLivePreview();
      },
      () => currentInvoice.globalDiscountType === 'percent'
    );
  }

  bindInput('input-tax-rate', (val) => {
    currentInvoice.taxRate = parseFloat(val) || 0;
    updateLivePreview();
  });

  if (shipInput) {
    bindCurrencyInput(shipInput, (val) => {
      currentInvoice.shippingFee = val;
      updateLivePreview();
    });
  }

  if (otherInput) {
    bindCurrencyInput(otherInput, (val) => {
      currentInvoice.otherFee = val;
      updateLivePreview();
    });
  }

  if (dpInput) {
    bindCurrencyInput(dpInput, (val) => {
      currentInvoice.downPayment = val;
      updateLivePreview();
    });
  }

  // Add Bank Button
  const btnAddBank = document.getElementById('btn-add-bank');
  if (btnAddBank) {
    btnAddBank.addEventListener('click', () => {
      currentInvoice.banks.push({
        bankName: '',
        accountNumber: '',
        accountName: currentInvoice.store.name || ''
      });
      renderFormBanks();
      updateLivePreview();
    });
  }

  // Notes & Terms
  bindInput('input-notes', (val) => currentInvoice.notes = val);
  bindInput('input-terms', (val) => currentInvoice.terms = val);

  const btnResetNotes = document.getElementById('btn-reset-default-notes');
  if (btnResetNotes) {
    btnResetNotes.addEventListener('click', () => {
      const defNotes = typeof DEFAULT_NOTES !== 'undefined' ? DEFAULT_NOTES : 'Terima kasih atas kepercayaan Anda bertransaksi dengan kami. Mohon periksa kembali kondisi barang saat serah terima.';
      currentInvoice.notes = defNotes;
      document.getElementById('input-notes').value = defNotes;
      updateLivePreview();
      showToast('Catatan dikembalikan ke teks standar');
    });
  }

  const btnResetTerms = document.getElementById('btn-reset-default-terms');
  if (btnResetTerms) {
    btnResetTerms.addEventListener('click', () => {
      const defTerms = typeof DEFAULT_TERMS !== 'undefined' ? DEFAULT_TERMS : '1. Pembayaran sah apabila dana sudah masuk ke rekening yang tertera di atas.\n2. Bukti transfer mohon dikonfirmasikan via WhatsApp.';
      currentInvoice.terms = defTerms;
      document.getElementById('input-terms').value = defTerms;
      updateLivePreview();
      showToast('Syarat & Ketentuan dikembalikan ke teks standar');
    });
  }

  // Signature inputs
  bindInput('input-signature-name', (val) => currentInvoice.signatureName = val);
  bindInput('input-signature-title', (val) => currentInvoice.signatureTitle = val);
  
  const checkStamp = document.getElementById('input-show-stamp');
  if (checkStamp) {
    checkStamp.addEventListener('change', (e) => {
      currentInvoice.showStamp = e.target.checked;
      updateLivePreview();
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
      if (signaturePad) {
        setTimeout(() => {
          const canvas = document.getElementById('signature-canvas');
          const ratio = Math.max(window.devicePixelRatio || 1, 1);
          canvas.width = canvas.offsetWidth * ratio;
          canvas.height = canvas.offsetHeight * ratio;
          canvas.getContext("2d").scale(ratio, ratio);
          signaturePad.clear();
          if (currentInvoice.signatureImage) {
            signaturePad.fromDataURL(currentInvoice.signatureImage);
          }
        }, 100);
      }
    });
  }

  if (btnCloseSig && modalSig) {
    btnCloseSig.addEventListener('click', () => modalSig.classList.add('hidden'));
  }

  if (btnClearSig && signaturePad) {
    btnClearSig.addEventListener('click', () => signaturePad.clear());
  }

  if (btnSaveSig && signaturePad) {
    btnSaveSig.addEventListener('click', () => {
      if (!signaturePad.isEmpty()) {
        currentInvoice.signatureImage = signaturePad.toDataURL('image/png');
        showToast('Tanda tangan digital berhasil disimpan');
      } else {
        currentInvoice.signatureImage = '';
      }
      modalSig.classList.add('hidden');
      updateLivePreview();
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
          currentInvoice.signatureImage = event.target.result;
          updateLivePreview();
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
      if (!element) return;

      const originalText = btnDownloadPDF.innerHTML;
      btnDownloadPDF.disabled = true;
      btnDownloadPDF.innerHTML = `
        <span class="inline-block animate-spin mr-2">⟳</span> Memproses PDF...
      `;

      try {
        await PDFExportService.exportToPDF(element, {
          invoiceNumber: currentInvoice.invoiceNumber,
          clientName: currentInvoice.client.name
        });
        showToast('PDF berhasil diunduh!');
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
    btnSaveInvoice.addEventListener('click', () => {
      const success = StorageService.saveInvoice(currentInvoice);
      if (success) {
        showToast('Invoice berhasil disimpan ke data penjualan!');
        renderHistoryTable();
        renderSalesTable();
      } else {
        showToast('Gagal menyimpan invoice', 'error');
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
        currentInvoice = StorageService.getBlankInvoice();
        populateFormFromState();
        renderSavedBanksCheckboxes();
        const selClient = document.getElementById('select-saved-client');
        if (selClient) selClient.value = '';
        updateLivePreview();
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
      renderHistoryTable();
      modalHistory.classList.remove('hidden');
    });
  }

  if (btnCloseHistory && modalHistory) {
    btnCloseHistory.addEventListener('click', () => modalHistory.classList.add('hidden'));
  }

  // Export / Import JSON
  const btnExportData = document.getElementById('btn-export-backup');
  if (btnExportData) {
    btnExportData.addEventListener('click', () => {
      StorageService.exportDataJSON();
      showToast('Cadangan data berhasil diunduh');
    });
  }

  const fileImportInput = document.getElementById('input-import-backup');
  if (fileImportInput) {
    fileImportInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const ok = StorageService.importDataJSON(event.target.result);
          if (ok) {
            showToast('Data berhasil dipulihkan!');
            renderHistoryTable();
            location.reload();
          } else {
            showToast('Format file cadangan tidak valid', 'error');
          }
        };
        reader.readAsText(file);
      }
    });
  }

  // Zoom controls
  const btnZoomIn = document.getElementById('btn-zoom-in');
  const btnZoomOut = document.getElementById('btn-zoom-out');
  const btnZoomReset = document.getElementById('btn-zoom-reset');
  const sheet = document.getElementById('invoice-preview-sheet');

  function autoFitZoom() {
    const container = document.querySelector('.invoice-sheet-container');
    if (!container || !sheet) return;
    const availWidth = container.clientWidth - 48; // padding buffer
    if (availWidth > 0 && availWidth < 794) {
      currentZoom = Math.min(Math.max(availWidth / 794, 0.4), 1);
    } else {
      currentZoom = 1;
    }
    applyZoom();
  }

  if (btnZoomIn && sheet) {
    btnZoomIn.addEventListener('click', () => {
      currentZoom = Math.min(currentZoom + 0.1, 1.4);
      applyZoom();
    });
  }
  if (btnZoomOut && sheet) {
    btnZoomOut.addEventListener('click', () => {
      currentZoom = Math.max(currentZoom - 0.1, 0.4);
      applyZoom();
    });
  }
  if (btnZoomReset && sheet) {
    btnZoomReset.addEventListener('click', autoFitZoom);
  }

  // Auto-fit on initial load and window resize
  window.addEventListener('resize', autoFitZoom);
  setTimeout(autoFitZoom, 400);

  function applyZoom() {
    if (sheet) {
      sheet.style.transform = `scale(${currentZoom})`;
      const zoomText = document.getElementById('zoom-percentage');
      if (zoomText) zoomText.textContent = `${Math.round(currentZoom * 100)}%`;
    }
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
      updateLivePreview();
    });
  }

  // Sales View Filter & Action Listeners
  const salesSearchInput = document.getElementById('sales-search-input');
  if (salesSearchInput) {
    salesSearchInput.addEventListener('input', () => renderSalesTable());
  }

  const salesFilterStatus = document.getElementById('sales-filter-status');
  if (salesFilterStatus) {
    salesFilterStatus.addEventListener('change', () => renderSalesTable());
  }

  const salesFilterSort = document.getElementById('sales-filter-sort');
  if (salesFilterSort) {
    salesFilterSort.addEventListener('change', () => renderSalesTable());
  }

  const btnExportSalesCSV = document.getElementById('btn-export-sales-csv');
  const exportDropdownMenu = document.getElementById('export-dropdown-menu');
  const btnExportSummary = document.getElementById('btn-export-sales-summary');
  const btnExportItems = document.getElementById('btn-export-sales-items');
  const btnExportComma = document.getElementById('btn-export-sales-comma');

  if (btnExportSalesCSV && exportDropdownMenu) {
    btnExportSalesCSV.addEventListener('click', (e) => {
      e.stopPropagation();
      exportDropdownMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!exportDropdownMenu.contains(e.target) && e.target !== btnExportSalesCSV) {
        exportDropdownMenu.classList.add('hidden');
      }
    });
  }

  if (btnExportSummary) {
    btnExportSummary.addEventListener('click', () => {
      if (exportDropdownMenu) exportDropdownMenu.classList.add('hidden');
      exportSalesToCSV('summary', ';');
    });
  }

  if (btnExportItems) {
    btnExportItems.addEventListener('click', () => {
      if (exportDropdownMenu) exportDropdownMenu.classList.add('hidden');
      exportSalesToCSV('items', ';');
    });
  }

  if (btnExportComma) {
    btnExportComma.addEventListener('click', () => {
      if (exportDropdownMenu) exportDropdownMenu.classList.add('hidden');
      exportSalesToCSV('summary', ',');
    });
  }

  const btnPrintSalesTable = document.getElementById('btn-print-sales-table');
  if (btnPrintSalesTable) {
    btnPrintSalesTable.addEventListener('click', printSalesReport);
  }

  const btnCreateFromSales = document.getElementById('btn-create-invoice-from-sales');
  if (btnCreateFromSales) {
    btnCreateFromSales.addEventListener('click', createNewInvoiceFromSales);
  }
}

// Bind single input to state
function bindInput(id, updater) {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('input', (e) => {
      updater(e.target.value);
      updateLivePreview();
    });
  }
}

// Render History Table
function renderHistoryTable() {
  const tbody = document.getElementById('history-table-body');
  if (!tbody) return;

  const invoices = StorageService.getAllInvoices();
  tbody.innerHTML = '';

  if (invoices.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-8 text-slate-400">
          Belum ada riwayat invoice tersimpan. Klik "Simpan Invoice" untuk menyimpan invoice yang sedang dibuat.
        </td>
      </tr>
    `;
    return;
  }

  invoices.forEach(inv => {
    const tr = document.createElement('tr');
    tr.className = 'border-b border-slate-100 hover:bg-slate-50 transition-colors';

    let totalAmount = 0;
    if (inv.items) {
      inv.items.forEach(it => totalAmount += ((it.qty * it.price) - (it.discount || 0)));
    }

    tr.innerHTML = `
      <td class="py-3 px-3 font-semibold text-slate-800">${escapeHtml(inv.invoiceNumber || '-')}</td>
      <td class="py-3 px-3 text-slate-600">${escapeHtml(inv.client?.name || '-')}</td>
      <td class="py-3 px-3 text-slate-500">${formatTanggalIndo(inv.date)}</td>
      <td class="py-3 px-3 font-bold text-slate-800">${formatRupiah(totalAmount)}</td>
      <td class="py-3 px-3">
        <span class="text-xs px-2 py-0.5 rounded font-bold uppercase ${inv.status === 'LUNAS' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">
          ${inv.status}
        </span>
      </td>
      <td class="py-3 px-3 text-right space-x-1">
        <button class="btn-load-inv px-2.5 py-1 text-xs bg-blue-50 text-blue-600 font-semibold rounded hover:bg-blue-100 transition-colors" data-id="${inv.id}">
          Buka
        </button>
        <button class="btn-delete-inv px-2.5 py-1 text-xs bg-red-50 text-red-600 font-semibold rounded hover:bg-red-100 transition-colors" data-id="${inv.id}">
          Hapus
        </button>
      </td>
    `;

    tr.querySelector('.btn-load-inv').addEventListener('click', () => {
      currentInvoice = JSON.parse(JSON.stringify(inv));
      populateFormFromState();
      updateLivePreview();
      document.getElementById('modal-history').classList.add('hidden');
      showToast(`Invoice ${inv.invoiceNumber} berhasil dibuka`);
    });

    tr.querySelector('.btn-delete-inv').addEventListener('click', async () => {
      const ok = await showAppConfirm({
        title: 'Hapus Invoice',
        message: `Hapus invoice <strong>${escapeHtml(inv.invoiceNumber)}</strong> dari riwayat? Tindakan ini tidak dapat dibatalkan.`,
        confirmText: 'Ya, Hapus',
        cancelText: 'Batal',
        type: 'danger',
        icon: '🗑️'
      });
      if (ok) {
        StorageService.deleteInvoice(inv.id);
        renderHistoryTable();
        showToast('Invoice dihapus dari riwayat');
      }
    });

    tbody.appendChild(tr);
  });
}





// Escape HTML utility
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ========================================================
   SALES DATA TABLE & DASHBOARD CONTROLLER
   ======================================================== */

// Initialize View Navigation (Builder vs Catalog vs Sales Data)
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

// Switch between Builder View, Catalog View, and Sales Table View
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
    renderSalesTable();
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
    renderCatalogTableView();
  } else {
    // Default: builder
    if (viewBuilder) viewBuilder.classList.remove('hidden');
    if (mobileToggle) mobileToggle.classList.remove('hidden');
    if (tabBuilder) {
      tabBuilder.classList.add('bg-white', 'text-blue-600', 'shadow-sm');
      tabBuilder.classList.remove('text-slate-600');
    }
    updateLivePreview();
  }
}

// Helper to calculate total for any arbitrary invoice object
function calculateInvoiceTotal(inv) {
  if (!inv) return 0;
  let rawSubtotal = 0;
  if (Array.isArray(inv.items)) {
    inv.items.forEach(it => {
      const q = parseFloat(it.qty) || 0;
      const p = parseFloat(it.price) || 0;
      const d = parseFloat(it.discount) || 0;
      rawSubtotal += Math.max((q * p) - d, 0);
    });
  }

  let discountAmount = 0;
  if (inv.globalDiscountType === 'percent') {
    discountAmount = (rawSubtotal * (parseFloat(inv.globalDiscountValue) || 0)) / 100;
  } else {
    discountAmount = parseFloat(inv.globalDiscountValue) || 0;
  }
  discountAmount = Math.min(discountAmount, rawSubtotal);

  const taxableAmount = Math.max(rawSubtotal - discountAmount, 0);
  const taxRate = parseFloat(inv.taxRate) || 0;
  const taxAmount = (taxableAmount * taxRate) / 100;

  const shipping = parseFloat(inv.shippingFee) || 0;
  const otherFee = parseFloat(inv.otherFee) || 0;

  return Math.max(taxableAmount + taxAmount + shipping + otherFee, 0);
}

// Update Top Metric Cards (KPIs)
function updateSalesKPIs(invoices) {
  let totalRevenue = 0;
  let paidRevenue = 0;
  let unpaidRevenue = 0;
  let paidCount = 0;
  let unpaidCount = 0;

  invoices.forEach(inv => {
    const total = calculateInvoiceTotal(inv);
    totalRevenue += total;

    if (inv.status === 'LUNAS') {
      paidRevenue += total;
      paidCount++;
    } else {
      unpaidRevenue += total;
      unpaidCount++;
    }
  });

  const totalCount = invoices.length;
  const avgRevenue = totalCount > 0 ? (totalRevenue / totalCount) : 0;

  const elTotalRev = document.getElementById('kpi-total-revenue');
  const elTotalCnt = document.getElementById('kpi-total-count');
  const elPaidRev = document.getElementById('kpi-paid-revenue');
  const elPaidCnt = document.getElementById('kpi-paid-count');
  const elUnpaidRev = document.getElementById('kpi-unpaid-revenue');
  const elUnpaidCnt = document.getElementById('kpi-unpaid-count');
  const elAvgRev = document.getElementById('kpi-avg-revenue');
  const elBadgeCnt = document.getElementById('sales-badge-count');

  if (elTotalRev) elTotalRev.textContent = formatRupiah(totalRevenue);
  if (elTotalCnt) elTotalCnt.textContent = `${totalCount} Transaksi`;
  if (elPaidRev) elPaidRev.textContent = formatRupiah(paidRevenue);
  if (elPaidCnt) elPaidCnt.textContent = `${paidCount} Transaksi Lunas`;
  if (elUnpaidRev) elUnpaidRev.textContent = formatRupiah(unpaidRevenue);
  if (elUnpaidCnt) elUnpaidCnt.textContent = `${unpaidCount} Transaksi`;
  if (elAvgRev) elAvgRev.textContent = formatRupiah(avgRevenue);
  if (elBadgeCnt) elBadgeCnt.textContent = totalCount;
}

// Get currently filtered & sorted sales invoices
function getFilteredSalesInvoices() {
  const allInvoices = StorageService.getAllInvoices();
  const searchVal = (document.getElementById('sales-search-input')?.value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('sales-filter-status')?.value || 'ALL';
  const sortFilter = document.getElementById('sales-filter-sort')?.value || 'date-desc';

  let filtered = allInvoices.filter(inv => {
    // Status filter
    if (statusFilter !== 'ALL' && inv.status !== statusFilter) {
      return false;
    }

    // Search query filter
    if (searchVal) {
      const noMatch = (inv.invoiceNumber || '').toLowerCase().includes(searchVal);
      const clientMatch = (inv.client?.name || '').toLowerCase().includes(searchVal);
      const contactMatch = (inv.client?.contactPerson || '').toLowerCase().includes(searchVal);
      const itemMatch = Array.isArray(inv.items) && inv.items.some(it => (it.name || '').toLowerCase().includes(searchVal));
      if (!noMatch && !clientMatch && !contactMatch && !itemMatch) {
        return false;
      }
    }

    return true;
  });

  // Sorting
  filtered.sort((a, b) => {
    const totalA = calculateInvoiceTotal(a);
    const totalB = calculateInvoiceTotal(b);
    const dateA = new Date(a.date || '1970-01-01').getTime();
    const dateB = new Date(b.date || '1970-01-01').getTime();

    if (sortFilter === 'date-asc') return dateA - dateB;
    if (sortFilter === 'total-desc') return totalB - totalA;
    if (sortFilter === 'total-asc') return totalA - totalB;
    return dateB - dateA; // default date-desc
  });

  return filtered;
}

// Render Sales Data Table with Search, Filter & Actions
function renderSalesTable() {
  const tbody = document.getElementById('sales-table-body');
  if (!tbody) return;

  const allInvoices = StorageService.getAllInvoices();
  updateSalesKPIs(allInvoices);

  const filtered = getFilteredSalesInvoices();

  tbody.innerHTML = '';

  const paginationInfo = document.getElementById('sales-table-pagination-info');
  if (paginationInfo) {
    paginationInfo.textContent = `Menampilkan ${filtered.length} dari total ${allInvoices.length} data transaksi penjualan`;
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-12 text-slate-400">
          <div class="text-3xl mb-2">📋</div>
          <p class="font-medium">Tidak ada data transaksi penjualan yang sesuai.</p>
          <p class="text-[11px] mt-1 text-slate-400">Coba ubah kata kunci pencarian atau buat invoice baru.</p>
        </td>
      </tr>
    `;
    return;
  }

  filtered.forEach((inv, index) => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50/80 transition-colors border-b border-slate-100';

    const grandTotal = calculateInvoiceTotal(inv);

    // Items preview pills
    let itemsHtml = '<span class="text-slate-400">-</span>';
    if (Array.isArray(inv.items) && inv.items.length > 0) {
      const firstTwo = inv.items.slice(0, 2).map(it => `
        <span class="inline-block bg-slate-100 text-slate-700 rounded px-1.5 py-0.5 text-[10px] mr-1 mb-1 font-medium border border-slate-200">
          ${escapeHtml(it.name || 'Item')} <strong class="text-slate-900 font-bold">x${it.qty || 1}</strong>
        </span>
      `).join('');
      const moreCount = inv.items.length > 2 ? `<span class="inline-block bg-blue-50 text-blue-600 rounded px-1.5 py-0.5 text-[9.5px] font-bold border border-blue-100">+${inv.items.length - 2} lainnya</span>` : '';
      itemsHtml = `<div class="max-w-xs flex flex-wrap items-center">${firstTwo}${moreCount}</div>`;
    }

    // Status styling
    let statusBadgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
    if (inv.status === 'LUNAS') {
      statusBadgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
    } else if (inv.status === 'BELUM LUNAS') {
      statusBadgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
    } else if (inv.status === 'JATUH TEMPO') {
      statusBadgeClass = 'bg-red-100 text-red-800 border-red-300';
    } else if (inv.status === 'DP') {
      statusBadgeClass = 'bg-blue-100 text-blue-800 border-blue-300';
    }

    tr.innerHTML = `
      <td class="py-3 px-3.5 text-center font-medium text-slate-400 text-[11px]">${index + 1}</td>
      <td class="py-3 px-3.5 font-bold text-slate-900 font-mono text-xs cursor-pointer hover:text-blue-600 transition-colors btn-row-open" title="Klik untuk membuka invoice">
        ${escapeHtml(inv.invoiceNumber || '-')}
      </td>
      <td class="py-3 px-3.5 text-slate-600 whitespace-nowrap text-[11px]">
        ${formatTanggalIndo(inv.date)}
      </td>
      <td class="py-3 px-3.5">
        <div class="font-bold text-slate-800 text-xs">${escapeHtml(inv.client?.name || 'Pelanggan Umum')}</div>
        ${inv.client?.contactPerson ? `<div class="text-[10.5px] text-slate-500">${escapeHtml(inv.client.contactPerson)}</div>` : ''}
      </td>
      <td class="py-3 px-3.5">
        ${itemsHtml}
      </td>
      <td class="py-3 px-3.5 text-right font-black text-slate-900 text-xs">
        ${formatRupiah(grandTotal)}
      </td>
      <td class="py-3 px-3.5 text-center whitespace-nowrap">
        <span class="inline-block px-2.5 py-0.5 text-[10px] font-extrabold rounded border uppercase tracking-wider ${statusBadgeClass}">
          ${escapeHtml(inv.status || 'BELUM LUNAS')}
        </span>
      </td>
      <td class="py-3 px-3.5 text-center whitespace-nowrap">
        <div class="inline-flex items-center gap-1.5 justify-center">
          <button type="button" class="btn-row-open px-2.5 py-1 text-[11px] font-semibold rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition flex items-center gap-1" title="Buka & Edit Invoice">
            <span>✏️</span> Edit
          </button>
          <button type="button" class="btn-row-pdf px-2 py-1 text-[11px] font-semibold rounded bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition flex items-center gap-1" title="Unduh PDF">
            <span>📥</span> PDF
          </button>
          <button type="button" class="btn-row-delete px-1.5 py-1 text-[11px] font-semibold rounded bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition" title="Hapus Data">
            🗑️
          </button>
        </div>
      </td>
    `;

    // Event: Open / Edit
    tr.querySelectorAll('.btn-row-open').forEach(btn => {
      btn.addEventListener('click', () => {
        currentInvoice = JSON.parse(JSON.stringify(inv));
        populateFormFromState();
        updateLivePreview();
        switchView('builder');
        showToast(`Invoice ${inv.invoiceNumber} siap diedit`);
      });
    });

    // Event: Download PDF directly
    tr.querySelector('.btn-row-pdf').addEventListener('click', async (e) => {
      const originalBtnText = e.currentTarget.innerHTML;
      e.currentTarget.disabled = true;
      e.currentTarget.innerHTML = '<span class="animate-spin inline-block text-[10px]">⟳</span>';

      try {
        // Temporarily load this invoice into preview to export
        const tempInv = JSON.parse(JSON.stringify(inv));
        const prevCurrent = currentInvoice;
        currentInvoice = tempInv;
        updateLivePreview();

        const sheetEl = document.getElementById('invoice-preview-sheet');
        await PDFExportService.exportToPDF(sheetEl, {
          invoiceNumber: tempInv.invoiceNumber,
          clientName: tempInv.client?.name
        });

        // Restore active editor invoice
        currentInvoice = prevCurrent;
        updateLivePreview();
        showToast(`PDF ${inv.invoiceNumber} berhasil diunduh`);
      } catch (err) {
        console.error(err);
        showToast('Gagal mengunduh PDF', 'error');
      } finally {
        e.currentTarget.disabled = false;
        e.currentTarget.innerHTML = originalBtnText;
      }
    });

    // Event: Delete
    tr.querySelector('.btn-row-delete').addEventListener('click', async () => {
      const ok = await showAppConfirm({
        title: 'Hapus Transaksi Penjualan',
        message: `Hapus data transaksi invoice <strong>${escapeHtml(inv.invoiceNumber)}</strong>? Data riwayat invoice ini juga akan dihapus.`,
        confirmText: 'Ya, Hapus',
        cancelText: 'Batal',
        type: 'danger',
        icon: '🗑️'
      });
      if (ok) {
        StorageService.deleteInvoice(inv.id);
        renderSalesTable();
        renderHistoryTable();
        showToast('Transaksi berhasil dihapus');
      }
    });

    tbody.appendChild(tr);
  });
}





// Clean CSV cell escaping: trims, cleans internal newlines to space, and escapes double quotes
function escapeCsvCell(val) {
  if (val === undefined || val === null) return '""';
  let str = String(val).replace(/[\r\n]+/g, ' ').trim();
  str = str.replace(/"/g, '""');
  return `"${str}"`;
}

// Preserve text for Excel so leading 0 and slashes are NOT lost or parsed into scientific notation
function excelTextFormula(val) {
  if (!val) return '""';
  const clean = String(val).replace(/[\r\n]+/g, ' ').replace(/"/g, '""').trim();
  return `="${clean}"`;
}

// Export Sales Data to CSV / Excel (Pilihan: Ringkasan per Invoice atau Detail per Item)
function exportSalesToCSV(type = 'summary', delimiter = ';') {
  const invoices = getFilteredSalesInvoices();
  if (!invoices || invoices.length === 0) {
    showToast('Tidak ada data penjualan untuk diekspor', 'error');
    return;
  }

  let headers = [];
  let rows = [];
  let filePrefix = 'Data_Penjualan_Ringkasan';

  if (type === 'items') {
    // -----------------------------------------------------------------
    // Tipe 2: Laporan Rincian Item Barang (1 baris per produk terjual)
    // -----------------------------------------------------------------
    filePrefix = 'Data_Penjualan_Rincian_Item';
    headers = [
      'No',
      'No Invoice',
      'Tanggal Transaksi',
      'Nama Pelanggan',
      'Status Pembayaran',
      'Nama Barang / Jasa',
      'Spesifikasi / Deskripsi',
      'Kuantitas (Qty)',
      'Satuan',
      'Harga Satuan (Rp)',
      'Potongan Item (Rp)',
      'Subtotal Item (Rp)',
      'Grand Total Invoice (Rp)'
    ];

    let rowNo = 1;
    invoices.forEach(inv => {
      const grandTotal = calculateInvoiceTotal(inv);
      if (Array.isArray(inv.items) && inv.items.length > 0) {
        inv.items.forEach(it => {
          const itemSubtotal = (parseFloat(it.qty) || 0) * (parseFloat(it.price) || 0) - (parseFloat(it.discount) || 0);
          rows.push([
            rowNo++,
            excelTextFormula(inv.invoiceNumber || ''),
            escapeCsvCell(inv.date || ''),
            escapeCsvCell(inv.client?.name || '-'),
            escapeCsvCell(inv.status || 'BELUM LUNAS'),
            escapeCsvCell(it.name || '-'),
            escapeCsvCell(it.description || '-'),
            parseFloat(it.qty) || 0,
            escapeCsvCell(it.unit || 'Pcs'),
            Math.round(parseFloat(it.price) || 0),
            Math.round(parseFloat(it.discount) || 0),
            Math.round(itemSubtotal),
            Math.round(grandTotal)
          ]);
        });
      } else {
        rows.push([
          rowNo++,
          excelTextFormula(inv.invoiceNumber || ''),
          escapeCsvCell(inv.date || ''),
          escapeCsvCell(inv.client?.name || '-'),
          escapeCsvCell(inv.status || 'BELUM LUNAS'),
          '""',
          '""',
          0,
          '""',
          0,
          0,
          0,
          Math.round(grandTotal)
        ]);
      }
    });
  } else {
    // -----------------------------------------------------------------
    // Tipe 1: Laporan Ringkasan Transaksi Invoice (1 baris per invoice)
    // -----------------------------------------------------------------
    headers = [
      'No',
      'No Invoice',
      'Tanggal Transaksi',
      'Jatuh Tempo',
      'Status Pembayaran',
      'Nama Pelanggan',
      'Kontak Person',
      'No Telp / WhatsApp',
      'Rincian Barang Terjual',
      'Total Kuantitas',
      'Subtotal Barang (Rp)',
      'Diskon Total (Rp)',
      'Tarif PPN (%)',
      'Nilai PPN (Rp)',
      'Biaya Pengiriman (Rp)',
      'Biaya Lain-lain (Rp)',
      'Grand Total (Rp)',
      'Uang Muka / DP (Rp)',
      'Sisa Tagihan (Rp)'
    ];

    rows = invoices.map((inv, index) => {
      let itemsSubtotal = 0;
      let totalQty = 0;
      let itemSummary = '-';

      if (Array.isArray(inv.items) && inv.items.length > 0) {
        itemsSubtotal = inv.items.reduce((s, it) => {
          const q = parseFloat(it.qty) || 0;
          const p = parseFloat(it.price) || 0;
          const d = parseFloat(it.discount) || 0;
          return s + Math.max((q * p) - d, 0);
        }, 0);
        totalQty = inv.items.reduce((s, it) => s + (parseFloat(it.qty) || 0), 0);
        itemSummary = inv.items.map((it, i) => {
          const q = parseFloat(it.qty) || 0;
          const p = parseFloat(it.price) || 0;
          const d = parseFloat(it.discount) || 0;
          const itemTot = Math.max((q * p) - d, 0);
          const discText = d ? ` [Pot. Rp ${Math.round(d).toLocaleString('id-ID')}]` : '';
          return `${i + 1}. ${it.name || 'Item'} (${q} ${it.unit || 'Unit'} @ Rp ${Math.round(p).toLocaleString('id-ID')}${discText} = Rp ${Math.round(itemTot).toLocaleString('id-ID')})`;
        }).join(' | ');
      }

      let discount = parseFloat(inv.globalDiscountValue) || 0;
      if (inv.globalDiscountType === 'percent') {
        discount = (itemsSubtotal * discount) / 100;
      }
      discount = Math.min(discount, itemsSubtotal);
      const taxable = Math.max(0, itemsSubtotal - discount);
      const taxRate = parseFloat(inv.taxRate) || 0;
      const taxVal = Math.round((taxable * taxRate) / 100);
      const grandTotal = calculateInvoiceTotal(inv);
      const dp = parseFloat(inv.downPayment) || 0;
      const balance = Math.max(0, grandTotal - dp);

      return [
        index + 1,
        excelTextFormula(inv.invoiceNumber || ''),
        escapeCsvCell(inv.date || ''),
        escapeCsvCell(inv.dueDate || ''),
        escapeCsvCell(inv.status || 'BELUM LUNAS'),
        escapeCsvCell(inv.client?.name || '-'),
        escapeCsvCell(inv.client?.contactPerson || '-'),
        excelTextFormula(inv.client?.phone || ''),
        escapeCsvCell(itemSummary),
        totalQty,
        Math.round(itemsSubtotal),
        Math.round(discount),
        taxRate,
        taxVal,
        Math.round(parseFloat(inv.shippingFee) || 0),
        Math.round(parseFloat(inv.otherFee) || 0),
        Math.round(grandTotal),
        Math.round(dp),
        Math.round(balance)
      ];
    });
  }

  // File construction
  const sepHeader = delimiter === ';' ? 'sep=;\r\n' : '';
  const csvContent = '\uFEFF' + sepHeader + [
    headers.map(h => escapeCsvCell(h)).join(delimiter),
    ...rows.map(r => r.join(delimiter))
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const dateStr = new Date().toISOString().slice(0, 10);
  const filterStatus = document.getElementById('sales-filter-status')?.value;
  const statusSuffix = filterStatus && filterStatus !== 'ALL' ? `_${filterStatus}` : '';
  const delimSuffix = delimiter === ',' ? '_Standard' : '';
  a.download = `${filePrefix}${statusSuffix}${delimSuffix}_${dateStr}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`Data penjualan (${invoices.length} transaksi) berhasil diekspor rapi ke Excel!`, 'success');
}

// Print Sales Report Cleanly
function printSalesReport() {
  document.body.classList.add('printing-sales-report');
  window.print();
  setTimeout(() => {
    document.body.classList.remove('printing-sales-report');
  }, 1000);
}

// Create new invoice from sales view
function createNewInvoiceFromSales() {
  currentInvoice = StorageService.getBlankInvoice();
  populateFormFromState();
  renderSavedBanksCheckboxes();
  const selClient = document.getElementById('select-saved-client');
  if (selClient) selClient.value = '';
  updateLivePreview();
  switchView('builder');
  showToast('Formulir invoice baru siap diisi');
}

// ==========================================
// MASTER DATA CONTROLLERS & INTEGRATION
// ==========================================

function initMasterDataControllers() {
  renderCustomerOptions();
  renderProductDatalist();
  renderSavedBanksCheckboxes();
  updateCatalogBadge();
  setupCustomerEventListeners();
  setupProductEventListeners();
  setupCatalogViewEvents();
  setupBankEventListeners();
}

// ------------------------------------------
// 1. MASTER PELANGGAN (CUSTOMERS)
// ------------------------------------------

function renderCustomerOptions() {
  const select = document.getElementById('select-saved-client');
  const datalist = document.getElementById('datalist-customers');
  const customers = StorageService.getCustomers();

  if (select) {
    select.innerHTML = `<option value="">-- Pilih Pelanggan Tersimpan (${customers.length}) --</option>`;
    customers.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.name}${c.contactPerson ? ` (${c.contactPerson})` : ''}`;
      select.appendChild(opt);
    });
  }

  if (datalist) {
    datalist.innerHTML = '';
    customers.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.name;
      datalist.appendChild(opt);
    });
  }
}

function applyCustomerToInvoice(customer) {
  if (!customer) return;
  currentInvoice.client.name = customer.name || '';
  currentInvoice.client.contactPerson = customer.contactPerson || '';
  currentInvoice.client.phone = customer.phone || '';
  currentInvoice.client.email = customer.email || '';
  currentInvoice.client.address = customer.address || '';
  currentInvoice.client.shippingAddress = customer.shippingAddress || '';

  document.getElementById('input-client-name').value = currentInvoice.client.name;
  document.getElementById('input-client-contact').value = currentInvoice.client.contactPerson;
  document.getElementById('input-client-phone').value = currentInvoice.client.phone;
  document.getElementById('input-client-email').value = currentInvoice.client.email;
  document.getElementById('input-client-address').value = currentInvoice.client.address;
  document.getElementById('input-shipping-address').value = currentInvoice.client.shippingAddress;

  updateLivePreview();
}

function setupCustomerEventListeners() {
  // Select dropdown change
  const select = document.getElementById('select-saved-client');
  if (select) {
    select.addEventListener('change', (e) => {
      const custId = e.target.value;
      if (!custId) return;
      const cust = StorageService.getCustomerById(custId);
      if (cust) {
        applyCustomerToInvoice(cust);
        showToast(`Data pelanggan "${cust.name}" berhasil dimuat`);
      }
    });
  }

  // Datalist auto-match when typing client name
  const inputClientName = document.getElementById('input-client-name');
  if (inputClientName) {
    const handleClientNameChange = () => {
      const typed = inputClientName.value.trim().toLowerCase();
      if (!typed) return;
      const match = StorageService.getCustomers().find(c => c.name.toLowerCase() === typed);
      if (match) {
        applyCustomerToInvoice(match);
        if (select) select.value = match.id;
        showToast(`Data pelanggan "${match.name}" otomatis dimuat`);
      }
    };
    inputClientName.addEventListener('change', handleClientNameChange);
  }

  // "Simpan Pelanggan" quick action from form
  const btnSaveAsCustomer = document.getElementById('btn-save-as-customer');
  if (btnSaveAsCustomer) {
    btnSaveAsCustomer.addEventListener('click', () => {
      const name = document.getElementById('input-client-name').value.trim();
      if (!name) {
        showToast('Ketik nama pelanggan terlebih dahulu untuk disimpan', 'error');
        return;
      }
      StorageService.saveCustomer({
        name: name,
        contactPerson: document.getElementById('input-client-contact').value.trim(),
        phone: document.getElementById('input-client-phone').value.trim(),
        email: document.getElementById('input-client-email').value.trim(),
        address: document.getElementById('input-client-address').value.trim(),
        shippingAddress: document.getElementById('input-shipping-address').value.trim()
      });
      renderCustomerOptions();
      renderCustomersModalTable();
      showToast(`Data pelanggan "${name}" berhasil disimpan ke Master!`);
    });
  }

  // Customer Modal handlers
  const modal = document.getElementById('modal-manage-customers');
  const btnOpen = document.getElementById('btn-open-manage-customers');
  const btnClose = document.getElementById('btn-close-manage-customers');
  const btnSaveModal = document.getElementById('btn-save-cust-modal');
  const btnCancelEdit = document.getElementById('btn-cancel-edit-cust');
  const searchInput = document.getElementById('cust-search-input');

  if (btnOpen && modal) {
    btnOpen.addEventListener('click', () => {
      resetCustomerModalForm();
      renderCustomersModalTable();
      modal.classList.remove('hidden');
    });
  }

  if (btnClose && modal) {
    btnClose.addEventListener('click', () => modal.classList.add('hidden'));
  }

  if (btnCancelEdit) {
    btnCancelEdit.addEventListener('click', resetCustomerModalForm);
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderCustomersModalTable(searchInput.value);
    });
  }

  if (btnSaveModal) {
    btnSaveModal.addEventListener('click', () => {
      const name = document.getElementById('cust-modal-name').value.trim();
      if (!name) {
        showToast('Nama pelanggan wajib diisi', 'error');
        return;
      }
      const editId = document.getElementById('cust-edit-id').value;
      StorageService.saveCustomer({
        id: editId || undefined,
        name: name,
        contactPerson: document.getElementById('cust-modal-contact').value.trim(),
        phone: document.getElementById('cust-modal-phone').value.trim(),
        email: document.getElementById('cust-modal-email').value.trim(),
        address: document.getElementById('cust-modal-address').value.trim(),
        shippingAddress: document.getElementById('cust-modal-shipping').value.trim()
      });
      resetCustomerModalForm();
      renderCustomersModalTable();
      renderCustomerOptions();
      showToast(`Data pelanggan "${name}" berhasil disimpan`);
    });
  }
}

function resetCustomerModalForm() {
  document.getElementById('cust-edit-id').value = '';
  document.getElementById('cust-modal-name').value = '';
  document.getElementById('cust-modal-contact').value = '';
  document.getElementById('cust-modal-phone').value = '';
  document.getElementById('cust-modal-email').value = '';
  document.getElementById('cust-modal-address').value = '';
  document.getElementById('cust-modal-shipping').value = '';
  document.getElementById('cust-form-title').textContent = 'Tambah Pelanggan Baru';
  document.getElementById('btn-cancel-edit-cust').classList.add('hidden');
}

function renderCustomersModalTable(searchTerm = '') {
  const tbody = document.getElementById('cust-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  let list = StorageService.getCustomers();
  if (searchTerm) {
    const q = searchTerm.toLowerCase();
    list = list.filter(c => 
      (c.name || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q) ||
      (c.contactPerson || '').toLowerCase().includes(q) ||
      (c.address || '').toLowerCase().includes(q)
    );
  }

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center py-6 text-slate-400 italic">Belum ada data pelanggan tersimpan.</td></tr>`;
    return;
  }

  list.forEach(c => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50 transition';
    tr.innerHTML = `
      <td class="py-2.5 px-3">
        <div class="font-bold text-slate-800 text-xs">${escapeHtml(c.name)}</div>
        ${c.email ? `<div class="text-[10px] text-slate-400 font-mono">${escapeHtml(c.email)}</div>` : ''}
      </td>
      <td class="py-2.5 px-3">
        <div class="text-xs text-slate-700">${escapeHtml(c.contactPerson || '-')}</div>
        <div class="text-[11px] text-slate-500 font-mono">${escapeHtml(c.phone || '-')}</div>
      </td>
      <td class="py-2.5 px-3 text-slate-600 text-[11px] max-w-xs truncate">${escapeHtml(c.address || '-')}</td>
      <td class="py-2.5 px-3 text-right">
        <div class="flex items-center justify-end gap-1">
          <button type="button" class="btn-use-cust px-2 py-1 text-[11px] font-bold rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200">
            Pilih ke Invoice
          </button>
          <button type="button" class="btn-edit-cust px-2 py-1 text-[11px] font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-700">
            Edit
          </button>
          <button type="button" class="btn-del-cust px-1.5 py-1 text-[11px] font-semibold rounded bg-red-50 hover:bg-red-100 text-red-600">
            Hapus
          </button>
        </div>
      </td>
    `;

    tr.querySelector('.btn-use-cust').addEventListener('click', () => {
      applyCustomerToInvoice(c);
      const sel = document.getElementById('select-saved-client');
      if (sel) sel.value = c.id;
      document.getElementById('modal-manage-customers').classList.add('hidden');
      showToast(`Pelanggan "${c.name}" diterapkan ke invoice`);
    });

    tr.querySelector('.btn-edit-cust').addEventListener('click', () => {
      document.getElementById('cust-edit-id').value = c.id;
      document.getElementById('cust-modal-name').value = c.name || '';
      document.getElementById('cust-modal-contact').value = c.contactPerson || '';
      document.getElementById('cust-modal-phone').value = c.phone || '';
      document.getElementById('cust-modal-email').value = c.email || '';
      document.getElementById('cust-modal-address').value = c.address || '';
      document.getElementById('cust-modal-shipping').value = c.shippingAddress || '';
      document.getElementById('cust-form-title').textContent = 'Edit Data Pelanggan';
      document.getElementById('btn-cancel-edit-cust').classList.remove('hidden');
      document.getElementById('cust-modal-name').focus();
    });

    tr.querySelector('.btn-del-cust').addEventListener('click', async () => {
      const ok = await showAppConfirm({
        title: 'Hapus Data Pelanggan',
        message: `Apakah Anda yakin ingin menghapus pelanggan <strong>"${escapeHtml(c.name)}"</strong> dari Master Data?`,
        confirmText: 'Ya, Hapus',
        cancelText: 'Batal',
        type: 'danger',
        icon: '👤'
      });
      if (ok) {
        StorageService.deleteCustomer(c.id);
        renderCustomersModalTable(searchTerm);
        renderCustomerOptions();
        showToast('Pelanggan berhasil dihapus');
      }
    });

    tbody.appendChild(tr);
  });
}





// ------------------------------------------
// 2. MASTER PRODUK & JASA (PRODUCTS)
// ------------------------------------------

function renderProductDatalist() {
  const datalist = document.getElementById('datalist-products');
  if (!datalist) return;
  datalist.innerHTML = '';
  const products = StorageService.getProducts();
  products.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.name;
    opt.textContent = `Harga: ${formatRupiah(p.price)}${p.description ? ` | ${p.description}` : ''}`;
    datalist.appendChild(opt);
  });
}

function setupProductEventListeners() {
  const modal = document.getElementById('modal-manage-products');
  const btnOpen = document.getElementById('btn-open-manage-products');
  const btnClose = document.getElementById('btn-close-manage-products');
  const btnSaveModal = document.getElementById('btn-save-prod-modal');
  const btnCancelEdit = document.getElementById('btn-cancel-edit-prod');
  const searchInput = document.getElementById('prod-search-input');
  const prodPriceInput = document.getElementById('prod-modal-price');

  if (prodPriceInput) {
    bindCurrencyInput(prodPriceInput);
  }

  if (btnOpen && modal) {
    btnOpen.addEventListener('click', () => {
      resetProductModalForm();
      renderProductsModalTable();
      modal.classList.remove('hidden');
    });
  }

  if (btnClose && modal) {
    btnClose.addEventListener('click', () => modal.classList.add('hidden'));
  }

  if (btnCancelEdit) {
    btnCancelEdit.addEventListener('click', resetProductModalForm);
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderProductsModalTable(searchInput.value);
    });
  }

  if (btnSaveModal) {
    btnSaveModal.addEventListener('click', () => {
      const name = document.getElementById('prod-modal-name').value.trim();
      if (!name) {
        showToast('Nama barang / jasa wajib diisi', 'error');
        return;
      }
      const editId = document.getElementById('prod-edit-id').value;
      StorageService.saveProduct({
        id: editId || undefined,
        name: name,
        unit: document.getElementById('prod-modal-unit').value.trim() || 'Unit',
        price: parseThousands(document.getElementById('prod-modal-price').value),
        description: document.getElementById('prod-modal-desc').value.trim()
      });
      resetProductModalForm();
      renderProductsModalTable();
      renderProductDatalist();
      showToast(`Produk "${name}" berhasil disimpan ke katalog`);
    });
  }
}

function resetProductModalForm() {
  document.getElementById('prod-edit-id').value = '';
  document.getElementById('prod-modal-name').value = '';
  document.getElementById('prod-modal-unit').value = 'Unit';
  document.getElementById('prod-modal-price').value = '';
  document.getElementById('prod-modal-desc').value = '';
  document.getElementById('prod-form-title').textContent = 'Tambah Barang / Jasa Baru';
  document.getElementById('btn-cancel-edit-prod').classList.add('hidden');
}

function renderProductsModalTable(searchTerm = '') {
  const tbody = document.getElementById('prod-table-body');
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

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-slate-400 italic">Belum ada produk di katalog. Tambahkan produk di atas atau langsung saat mengisi invoice.</td></tr>`;
    return;
  }

  list.forEach(p => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50 transition';
    tr.innerHTML = `
      <td class="py-2.5 px-3 font-bold text-slate-800 text-xs">${escapeHtml(p.name)}</td>
      <td class="py-2.5 px-3 text-slate-600 text-xs">${escapeHtml(p.unit || 'Unit')}</td>
      <td class="py-2.5 px-3 text-right font-mono font-bold text-slate-900 text-xs">${formatRupiah(p.price)}</td>
      <td class="py-2.5 px-3 text-slate-500 text-[11px] max-w-xs truncate">${escapeHtml(p.description || '-')}</td>
      <td class="py-2.5 px-3 text-right">
        <div class="flex items-center justify-end gap-1">
          <button type="button" class="btn-add-prod-invoice px-2 py-1 text-[11px] font-bold rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200">
            + Ke Invoice
          </button>
          <button type="button" class="btn-edit-prod px-2 py-1 text-[11px] font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-700">
            Edit
          </button>
          <button type="button" class="btn-del-prod px-1.5 py-1 text-[11px] font-semibold rounded bg-red-50 hover:bg-red-100 text-red-600">
            Hapus
          </button>
        </div>
      </td>
    `;

    tr.querySelector('.btn-add-prod-invoice').addEventListener('click', () => {
      if (currentInvoice.items.length === 1 && !currentInvoice.items[0].name && currentInvoice.items[0].price === 0) {
        currentInvoice.items[0] = {
          id: Date.now(),
          name: p.name,
          unit: p.unit || 'Unit',
          price: p.price || 0,
          description: p.description || '',
          qty: 1,
          discount: 0
        };
      } else {
        currentInvoice.items.push({
          id: Date.now(),
          name: p.name,
          unit: p.unit || 'Unit',
          price: p.price || 0,
          description: p.description || '',
          qty: 1,
          discount: 0
        });
      }
      renderFormItems();
      updateLivePreview();
      document.getElementById('modal-manage-products').classList.add('hidden');
      showToast(`Produk "${p.name}" ditambahkan ke invoice`);
    });

    tr.querySelector('.btn-edit-prod').addEventListener('click', () => {
      document.getElementById('prod-edit-id').value = p.id;
      document.getElementById('prod-modal-name').value = p.name || '';
      document.getElementById('prod-modal-unit').value = p.unit || 'Unit';
      document.getElementById('prod-modal-price').value = formatThousands(p.price || 0);
      document.getElementById('prod-modal-desc').value = p.description || '';
      document.getElementById('prod-form-title').textContent = 'Edit Data Produk';
      document.getElementById('btn-cancel-edit-prod').classList.remove('hidden');
      document.getElementById('prod-modal-name').focus();
    });

    tr.querySelector('.btn-del-prod').addEventListener('click', async () => {
      const ok = await showAppConfirm({
        title: 'Hapus Produk Katalog',
        message: `Apakah Anda yakin ingin menghapus produk <strong>"${escapeHtml(p.name)}"</strong> dari katalog?`,
        confirmText: 'Ya, Hapus',
        cancelText: 'Batal',
        type: 'danger',
        icon: '📦'
      });
      if (ok) {
        StorageService.deleteProduct(p.id);
        renderProductsModalTable(searchTerm);
        renderProductDatalist();
        showToast('Produk berhasil dihapus dari katalog');
      }
    });

    tbody.appendChild(tr);
  });
}





// ------------------------------------------
// 3. MASTER REKENING BANK (BANKS)
// ------------------------------------------

function renderSavedBanksCheckboxes() {
  const container = document.getElementById('saved-banks-checkboxes');
  if (!container) return;
  const savedBanks = StorageService.getSavedBanks();

  if (savedBanks.length === 0) {
    container.innerHTML = `
      <div class="text-xs text-slate-500 py-1 flex items-center gap-2">
        <span>Belum ada master rekening tersimpan.</span>
        <button type="button" id="btn-quick-add-bank-prompt" class="text-blue-600 font-bold hover:underline">+ Tambah Rekening Master</button>
      </div>
    `;
    const promptBtn = document.getElementById('btn-quick-add-bank-prompt');
    if (promptBtn) {
      promptBtn.addEventListener('click', () => {
        document.getElementById('modal-manage-banks').classList.remove('hidden');
        renderBanksModalTable();
      });
    }
    return;
  }

  container.innerHTML = '';
  savedBanks.forEach(b => {
    const isAttached = currentInvoice.banks.some(ib => 
      (ib.accountNumber && ib.accountNumber.replace(/[\s-]/g, '') === b.accountNumber.replace(/[\s-]/g, '')) ||
      (ib.bankName && ib.bankName.toLowerCase() === b.bankName.toLowerCase() && ib.accountName === b.accountName)
    );

    const chip = document.createElement('label');
    chip.className = `flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer transition select-none ${
      isAttached 
        ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
        : 'bg-white text-slate-700 border-slate-300 hover:border-blue-400'
    }`;
    chip.innerHTML = `
      <input type="checkbox" class="saved-bank-toggle hidden" data-id="${b.id}" ${isAttached ? 'checked' : ''}>
      <span class="text-xs">${isAttached ? '✓' : '+'}</span>
      <span>${escapeHtml(b.bankName)}</span>
      <span class="font-mono text-[11px] ${isAttached ? 'text-blue-100' : 'text-slate-500'}">(${escapeHtml(b.accountNumber)})</span>
      <span class="text-[10px] ${isAttached ? 'text-blue-200' : 'text-slate-400'}">A/N ${escapeHtml(b.accountName)}</span>
    `;

    const checkbox = chip.querySelector('.saved-bank-toggle');
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        const alreadyIn = currentInvoice.banks.some(ib => 
          ib.accountNumber.replace(/[\s-]/g, '') === b.accountNumber.replace(/[\s-]/g, '')
        );
        if (!alreadyIn) {
          currentInvoice.banks.push({
            bankName: b.bankName,
            accountNumber: b.accountNumber,
            accountName: b.accountName
          });
        }
      } else {
        currentInvoice.banks = currentInvoice.banks.filter(ib => 
          ib.accountNumber.replace(/[\s-]/g, '') !== b.accountNumber.replace(/[\s-]/g, '')
        );
      }
      renderFormBanks();
      renderSavedBanksCheckboxes();
      updateLivePreview();
    });

    container.appendChild(chip);
  });
}

function setupBankEventListeners() {
  const modal = document.getElementById('modal-manage-banks');
  const btnOpen = document.getElementById('btn-open-manage-banks');
  const btnClose = document.getElementById('btn-close-manage-banks');
  const btnSaveModal = document.getElementById('btn-save-bank-modal');
  const btnCancelEdit = document.getElementById('btn-cancel-edit-bank');

  if (btnOpen && modal) {
    btnOpen.addEventListener('click', () => {
      resetBankModalForm();
      renderBanksModalTable();
      modal.classList.remove('hidden');
    });
  }

  if (btnClose && modal) {
    btnClose.addEventListener('click', () => modal.classList.add('hidden'));
  }

  if (btnCancelEdit) {
    btnCancelEdit.addEventListener('click', resetBankModalForm);
  }

  if (btnSaveModal) {
    btnSaveModal.addEventListener('click', () => {
      const bankName = document.getElementById('bank-modal-name').value.trim();
      const accNum = document.getElementById('bank-modal-number').value.trim();
      const owner = document.getElementById('bank-modal-owner').value.trim();

      if (!bankName || !accNum) {
        showToast('Nama bank dan nomor rekening wajib diisi', 'error');
        return;
      }

      const editId = document.getElementById('bank-edit-id').value;
      StorageService.saveBank({
        id: editId || undefined,
        bankName: bankName,
        accountNumber: accNum,
        accountName: owner
      });
      resetBankModalForm();
      renderBanksModalTable();
      renderSavedBanksCheckboxes();
      showToast(`Rekening "${bankName}" berhasil disimpan ke Master`);
    });
  }
}

function resetBankModalForm() {
  document.getElementById('bank-edit-id').value = '';
  document.getElementById('bank-modal-name').value = '';
  document.getElementById('bank-modal-number').value = '';
  document.getElementById('bank-modal-owner').value = '';
  document.getElementById('bank-form-title').textContent = 'Tambah Rekening Baru';
  document.getElementById('btn-cancel-edit-bank').classList.add('hidden');
}

function renderBanksModalTable() {
  const tbody = document.getElementById('bank-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  const list = StorageService.getSavedBanks();

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center py-6 text-slate-400 italic">Belum ada rekening master tersimpan.</td></tr>`;
    return;
  }

  list.forEach(b => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50 transition';
    tr.innerHTML = `
      <td class="py-2.5 px-3 font-bold text-slate-800 text-xs">${escapeHtml(b.bankName)}</td>
      <td class="py-2.5 px-3 font-mono font-bold text-slate-900 text-xs">${escapeHtml(b.accountNumber)}</td>
      <td class="py-2.5 px-3 text-slate-600 text-xs">${escapeHtml(b.accountName || '-')}</td>
      <td class="py-2.5 px-3 text-right">
        <div class="flex items-center justify-end gap-1">
          <button type="button" class="btn-use-bank-invoice px-2 py-1 text-[11px] font-bold rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200">
            Pilih ke Invoice
          </button>
          <button type="button" class="btn-edit-bank px-2 py-1 text-[11px] font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-700">
            Edit
          </button>
          <button type="button" class="btn-del-bank px-1.5 py-1 text-[11px] font-semibold rounded bg-red-50 hover:bg-red-100 text-red-600">
            Hapus
          </button>
        </div>
      </td>
    `;

    tr.querySelector('.btn-use-bank-invoice').addEventListener('click', () => {
      const alreadyIn = currentInvoice.banks.some(ib => 
        ib.accountNumber.replace(/[\s-]/g, '') === b.accountNumber.replace(/[\s-]/g, '')
      );
      if (!alreadyIn) {
        currentInvoice.banks.push({
          bankName: b.bankName,
          accountNumber: b.accountNumber,
          accountName: b.accountName
        });
        renderFormBanks();
        renderSavedBanksCheckboxes();
        updateLivePreview();
      }
      document.getElementById('modal-manage-banks').classList.add('hidden');
      showToast(`Rekening "${b.bankName}" ditambahkan ke invoice`);
    });

    tr.querySelector('.btn-edit-bank').addEventListener('click', () => {
      document.getElementById('bank-edit-id').value = b.id;
      document.getElementById('bank-modal-name').value = b.bankName || '';
      document.getElementById('bank-modal-number').value = b.accountNumber || '';
      document.getElementById('bank-modal-owner').value = b.accountName || '';
      document.getElementById('bank-form-title').textContent = 'Edit Data Rekening';
      document.getElementById('btn-cancel-edit-bank').classList.remove('hidden');
      document.getElementById('bank-modal-name').focus();
    });

    tr.querySelector('.btn-del-bank').addEventListener('click', async () => {
      const ok = await showAppConfirm({
        title: 'Hapus Rekening Bank',
        message: `Apakah Anda yakin ingin menghapus rekening <strong>${escapeHtml(b.bankName)} - ${escapeHtml(b.accountNumber)}</strong> (${escapeHtml(b.accountName || '')}) dari Master Rekening?`,
        confirmText: 'Ya, Hapus',
        cancelText: 'Batal',
        type: 'danger',
        icon: '🏦'
      });
      if (ok) {
        StorageService.deleteBank(b.id);
        renderBanksModalTable();
        renderSavedBanksCheckboxes();
        showToast('Rekening berhasil dihapus dari Master');
      }
    });

    tbody.appendChild(tr);
  });
}

// ------------------------------------------
// 2B. DEDICATED MASTER KATALOG BARANG & JASA VIEW
// ------------------------------------------

function updateCatalogBadge() {
  const products = StorageService.getProducts();
  const count = products.length;
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
        renderProductDatalist();
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
      renderProductDatalist();
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

// ------------------------------------------
// EXCEL IMPORT & TEMPLATE HELPERS FOR KATALOG
// ------------------------------------------

let pendingImportProducts = [];

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

// Helper to classify Excel header accurately without cross-matching bugs
function classifyCatalogColumn(rawKey) {
  const k = String(rawKey || '').toLowerCase().trim();
  const norm = k.replace(/[\s_\-./\\()\[\]{}'"]+/g, '');

  // 1. PRICE (Highest priority: any column containing 'harga', 'price', 'tarif', 'biaya', 'rate', 'rp', etc.)
  // Crucial: Must be checked before SATUAN so that 'Harga Satuan' is NEVER misclassified as 'Satuan'!
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
  // Crucial: Must be checked before SATUAN so that 'Jumlah Satuan' is NEVER misclassified as 'Satuan'!
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
            // Guard: ensure not pure number
            const digitsOnly = val.replace(/[Rp\s.,]/g, '');
            if (!/^\d+$/.test(digitsOnly)) {
              if (!unit) unit = val;
            } else {
              // Misrouted numeric value in unit header
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

        // 3. Final unit normalization
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
    renderProductDatalist();

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

