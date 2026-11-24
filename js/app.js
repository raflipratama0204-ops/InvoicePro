/**
 * InvoicePro - Main Application Controller
 */

// Format Number to Rupiah (IDR)
function formatRupiah(amount, withPrefix = true) {
  if (amount === undefined || amount === null || isNaN(amount)) amount = 0;
  const formatted = Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return withPrefix ? `Rp ${formatted}` : formatted;
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

// Application State
let currentInvoice = null;
let signaturePad = null;
let currentZoom = 1;

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Check saved store profile
  const savedProfile = StorageService.getStoreProfile();

  // Load existing or sample data
  const initialData = JSON.parse(JSON.stringify(window.DEFAULT_SAMPLE_DATA));
  if (savedProfile) {
    initialData.store = { ...initialData.store, ...savedProfile };
  }

  currentInvoice = initialData;

  // Initialize UI
  initSignaturePad();
  populateFormFromState();
  setupEventListeners();
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
  document.getElementById('input-theme').value = inv.theme || 'blue';
  document.body.setAttribute('data-theme', inv.theme || 'blue');

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
  document.getElementById('input-discount-type').value = inv.globalDiscountType || 'fixed';
  document.getElementById('input-discount-val').value = inv.globalDiscountValue || 0;
  document.getElementById('input-tax-rate').value = inv.taxRate || 0;
  document.getElementById('input-shipping-fee').value = inv.shippingFee || 0;
  document.getElementById('input-other-fee').value = inv.otherFee || 0;
  document.getElementById('input-down-payment').value = inv.downPayment || 0;

  // Banks
  renderFormBanks();

  // Notes & Terms
  document.getElementById('input-notes').value = inv.notes || '';
  document.getElementById('input-terms').value = inv.terms || '';

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
          <span class="w-5 h-5 rounded-full bg-blue-100 text-blue-700 inline-flex items-center justify-center text-xs">${index + 1}</span>
          Item Barang / Jasa
        </span>
        <div class="flex items-center gap-1">
          <button type="button" class="btn-duplicate-item text-xs text-slate-500 hover:text-blue-600 px-2 py-1 rounded bg-white border border-slate-200 hover:bg-slate-50" title="Duplikat item">
            Salin
          </button>
          ${currentInvoice.items.length > 1 ? `
          <button type="button" class="btn-delete-item text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded bg-white border border-red-200 hover:bg-red-50" title="Hapus item">
            Hapus
          </button>` : ''}
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-12 gap-2 mb-2">
        <div class="md:col-span-8">
          <label class="form-label">Nama Barang / Jasa *</label>
          <input type="text" class="form-input item-name" placeholder="Contoh: Jasa Pembuatan Website / Produk X" value="${escapeHtml(item.name)}">
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
          <input type="number" min="0" step="1000" class="form-input item-price" value="${item.price}">
        </div>
        <div class="col-span-1 md:col-span-2">
          <label class="form-label">Potongan (Rp)</label>
          <input type="number" min="0" step="1000" class="form-input item-discount" value="${item.discount || 0}">
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

    const updateItemData = () => {
      item.name = nameInput.value;
      item.unit = unitInput.value;
      item.description = descInput.value;
      item.qty = parseFloat(qtyInput.value) || 0;
      item.price = parseFloat(priceInput.value) || 0;
      item.discount = parseFloat(discountInput.value) || 0;

      const newSubtotal = (item.qty * item.price) - (item.discount || 0);
      itemRow.querySelector('.item-subtotal').textContent = formatRupiah(newSubtotal);
      updateLivePreview();
    };

    [nameInput, unitInput, descInput, qtyInput, priceInput, discountInput].forEach(inp => {
      inp.addEventListener('input', updateItemData);
    });

    const btnDelete = itemRow.querySelector('.btn-delete-item');
    if (btnDelete) {
      btnDelete.addEventListener('click', () => {
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

  currentInvoice.banks.forEach((bank, index) => {
    const bankRow = document.createElement('div');
    bankRow.className = 'grid grid-cols-1 md:grid-cols-12 gap-2 mb-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg items-end';

    bankRow.innerHTML = `
      <div class="md:col-span-4">
        <label class="form-label">Nama Bank / E-Wallet</label>
        <input type="text" class="form-input bank-name" placeholder="BCA / Mandiri / BRI / QRIS" value="${escapeHtml(bank.bankName || '')}">
      </div>
      <div class="md:col-span-4">
        <label class="form-label">No. Rekening / No. HP</label>
        <input type="text" class="form-input bank-acc" placeholder="Contoh: 123-456-7890" value="${escapeHtml(bank.accountNumber || '')}">
      </div>
      <div class="md:col-span-3">
        <label class="form-label">Atas Nama (A/N)</label>
        <input type="text" class="form-input bank-owner" placeholder="Nama Pemilik Rekening" value="${escapeHtml(bank.accountName || '')}">
      </div>
      <div class="md:col-span-1 text-right">
        ${currentInvoice.banks.length > 1 ? `
        <button type="button" class="btn-delete-bank p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded" title="Hapus rekening">
          ✕
        </button>` : ''}
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
    };

    [nameInput, accInput, ownerInput].forEach(inp => inp.addEventListener('input', updateBank));

    const btnDelete = bankRow.querySelector('.btn-delete-bank');
    if (btnDelete) {
      btnDelete.addEventListener('click', () => {
        currentInvoice.banks.splice(index, 1);
        renderFormBanks();
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
  document.body.setAttribute('data-theme', inv.theme || 'blue');

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

  // Add Item Button
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
    });
  }

  // Financial inputs
  bindInput('input-discount-type', (val) => {
    currentInvoice.globalDiscountType = val;
    updateLivePreview();
  });
  bindInput('input-discount-val', (val) => {
    currentInvoice.globalDiscountValue = parseFloat(val) || 0;
    updateLivePreview();
  });
  bindInput('input-tax-rate', (val) => {
    currentInvoice.taxRate = parseFloat(val) || 0;
    updateLivePreview();
  });
  bindInput('input-shipping-fee', (val) => {
    currentInvoice.shippingFee = parseFloat(val) || 0;
    updateLivePreview();
  });
  bindInput('input-other-fee', (val) => {
    currentInvoice.otherFee = parseFloat(val) || 0;
    updateLivePreview();
  });
  bindInput('input-down-payment', (val) => {
    currentInvoice.downPayment = parseFloat(val) || 0;
    updateLivePreview();
  });

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
    btnNewInvoice.addEventListener('click', () => {
      if (confirm('Buat invoice baru? Formulir akan diatur ulang (data toko Anda tetap disimpan).')) {
        const savedStore = StorageService.getStoreProfile() || currentInvoice.store;
        currentInvoice = {
          ...JSON.parse(JSON.stringify(window.DEFAULT_SAMPLE_DATA)),
          id: 'INV-' + Date.now(),
          invoiceNumber: generateInvoiceNumber(),
          date: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'BELUM LUNAS',
          store: savedStore,
          client: { name: '', contactPerson: '', phone: '', email: '', address: '', shippingAddress: '' },
          items: [{ id: Date.now(), name: '', description: '', qty: 1, unit: 'Pcs', price: 0, discount: 0 }],
          downPayment: 0
        };
        populateFormFromState();
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
  if (btnExportSalesCSV) {
    btnExportSalesCSV.addEventListener('click', exportSalesToCSV);
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

    tr.querySelector('.btn-delete-inv').addEventListener('click', () => {
      if (confirm(`Hapus invoice ${inv.invoiceNumber}?`)) {
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

// Initialize View Navigation (Builder vs Sales Data)
function initViewNavigation() {
  const tabBuilder = document.getElementById('nav-tab-builder');
  const tabSales = document.getElementById('nav-tab-sales');

  if (tabBuilder) {
    tabBuilder.addEventListener('click', () => switchView('builder'));
  }
  if (tabSales) {
    tabSales.addEventListener('click', () => switchView('sales'));
  }
}

// Switch between Builder View and Sales Table View
function switchView(viewName) {
  const viewBuilder = document.getElementById('view-invoice-builder');
  const viewSales = document.getElementById('view-sales-table');
  const tabBuilder = document.getElementById('nav-tab-builder');
  const tabSales = document.getElementById('nav-tab-sales');
  const mobileToggle = document.getElementById('mobile-builder-toggle');

  if (viewName === 'sales') {
    if (viewBuilder) viewBuilder.classList.add('hidden');
    if (viewSales) {
      viewSales.classList.remove('hidden');
      viewSales.classList.add('flex');
    }
    if (mobileToggle) mobileToggle.classList.add('hidden');

    if (tabBuilder) {
      tabBuilder.classList.remove('bg-white', 'text-blue-600', 'shadow-sm');
      tabBuilder.classList.add('text-slate-600');
    }
    if (tabSales) {
      tabSales.classList.add('bg-white', 'text-blue-600', 'shadow-sm');
      tabSales.classList.remove('text-slate-600');
    }

    renderSalesTable();
  } else {
    if (viewSales) {
      viewSales.classList.add('hidden');
      viewSales.classList.remove('flex');
    }
    if (viewBuilder) viewBuilder.classList.remove('hidden');
    if (mobileToggle) mobileToggle.classList.remove('hidden');

    if (tabSales) {
      tabSales.classList.remove('bg-white', 'text-blue-600', 'shadow-sm');
      tabSales.classList.add('text-slate-600');
    }
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

// Render Sales Data Table with Search, Filter & Actions
function renderSalesTable() {
  const tbody = document.getElementById('sales-table-body');
  if (!tbody) return;

  const allInvoices = StorageService.getAllInvoices();
  updateSalesKPIs(allInvoices);

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
    tr.querySelector('.btn-row-delete').addEventListener('click', () => {
      if (confirm(`Hapus transaksi invoice ${inv.invoiceNumber}?`)) {
        StorageService.deleteInvoice(inv.id);
        renderSalesTable();
        renderHistoryTable();
        showToast('Transaksi berhasil dihapus');
      }
    });

    tbody.appendChild(tr);
  });
}

// Export Sales Data to CSV / Excel
function exportSalesToCSV() {
  const invoices = StorageService.getAllInvoices();
  if (!invoices || invoices.length === 0) {
    showToast('Belum ada data penjualan untuk diekspor', 'error');
    return;
  }

  const headers = [
    'No',
    'No Invoice',
    'Tanggal',
    'Jatuh Tempo',
    'Nama Pelanggan',
    'No Telp Pelanggan',
    'Alamat Pelanggan',
    'Item Terjual',
    'Total Kuantitas',
    'Subtotal (Rp)',
    'Diskon (Rp)',
    'PPN (%)',
    'Ongkir (Rp)',
    'Grand Total (Rp)',
    'Status Pembayaran'
  ];

  const rows = invoices.map((inv, index) => {
    const total = calculateInvoiceTotal(inv);
    let itemSummary = '';
    let totalQty = 0;
    if (Array.isArray(inv.items)) {
      itemSummary = inv.items.map(it => `${it.name} (${it.qty} ${it.unit || ''})`).join('; ');
      totalQty = inv.items.reduce((acc, it) => acc + (parseFloat(it.qty) || 0), 0);
    }

    return [
      index + 1,
      `"${(inv.invoiceNumber || '').replace(/"/g, '""')}"`,
      `"${inv.date || ''}"`,
      `"${inv.dueDate || ''}"`,
      `"${(inv.client?.name || '').replace(/"/g, '""')}"`,
      `"${(inv.client?.phone || '').replace(/"/g, '""')}"`,
      `"${(inv.client?.address || '').replace(/"/g, '""')}"`,
      `"${itemSummary.replace(/"/g, '""')}"`,
      totalQty,
      inv.items ? inv.items.reduce((s, it) => s + (it.qty * it.price), 0) : 0,
      inv.globalDiscountValue || 0,
      inv.taxRate || 0,
      inv.shippingFee || 0,
      total,
      `"${inv.status || ''}"`
    ];
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Data_Penjualan_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Data penjualan berhasil diekspor ke Excel (CSV)');
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
  const savedStore = StorageService.getStoreProfile() || currentInvoice.store;
  currentInvoice = {
    ...JSON.parse(JSON.stringify(window.DEFAULT_SAMPLE_DATA)),
    id: 'INV-' + Date.now(),
    invoiceNumber: generateInvoiceNumber(),
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'BELUM LUNAS',
    store: savedStore,
    client: { name: '', contactPerson: '', phone: '', email: '', address: '', shippingAddress: '' },
    items: [{ id: Date.now(), name: '', description: '', qty: 1, unit: 'Pcs', price: 0, discount: 0 }],
    downPayment: 0
  };
  populateFormFromState();
  updateLivePreview();
  switchView('builder');
  showToast('Formulir invoice baru siap diisi');
}

