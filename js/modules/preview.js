/**
 * InvoicePro - Financial Calculations & Live A4 Preview Subsystem
 * Renders real-time A4 sheet invoice, computes taxes, discounts, down payments, and handles responsive zooming.
 */

// Calculate financial totals
function calculateFinancials() {
  const inv = window.currentInvoice;
  if (!inv) {
    return {
      subtotal: 0,
      discountAmount: 0,
      taxableAmount: 0,
      taxRate: 0,
      taxAmount: 0,
      shipping: 0,
      otherFee: 0,
      grandTotal: 0,
      downPayment: 0,
      balanceDue: 0
    };
  }

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
  const inv = window.currentInvoice;
  if (!inv) return;
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

// Setup Zoom & Auto-Fit Controls for Preview
function setupPreviewZoomControls() {
  const btnZoomIn = document.getElementById('btn-zoom-in');
  const btnZoomOut = document.getElementById('btn-zoom-out');
  const btnZoomReset = document.getElementById('btn-zoom-reset');
  const sheet = document.getElementById('invoice-preview-sheet');

  function autoFitZoom() {
    const container = document.querySelector('.invoice-sheet-container');
    if (!container || !sheet) return;
    const availWidth = container.clientWidth - 48; // padding buffer
    if (availWidth > 0 && availWidth < 794) {
      window.currentZoom = Math.min(Math.max(availWidth / 794, 0.4), 1);
    } else {
      window.currentZoom = 1;
    }
    applyZoom();
  }

  function applyZoom() {
    if (sheet) {
      sheet.style.transform = `scale(${window.currentZoom || 1})`;
      const zoomText = document.getElementById('zoom-percentage');
      if (zoomText) zoomText.textContent = `${Math.round((window.currentZoom || 1) * 100)}%`;
    }
  }

  if (btnZoomIn && sheet) {
    btnZoomIn.addEventListener('click', () => {
      window.currentZoom = Math.min((window.currentZoom || 1) + 0.1, 1.4);
      applyZoom();
    });
  }
  if (btnZoomOut && sheet) {
    btnZoomOut.addEventListener('click', () => {
      window.currentZoom = Math.max((window.currentZoom || 1) - 0.1, 0.4);
      applyZoom();
    });
  }
  if (btnZoomReset && sheet) {
    btnZoomReset.addEventListener('click', autoFitZoom);
  }

  // Auto-fit on initial load and window resize
  window.addEventListener('resize', autoFitZoom);
  setTimeout(autoFitZoom, 400);

  // Return helper methods
  return { autoFitZoom, applyZoom };
}

// Global Exports
window.calculateFinancials = calculateFinancials;
window.updateLivePreview = updateLivePreview;
window.setupPreviewZoomControls = setupPreviewZoomControls;

