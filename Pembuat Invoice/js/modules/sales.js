/**
 * InvoicePro - Sales Analytics, Reporting & CSV Export Subsystem
 * Manages sales transactions data, KPI statistics, historical invoices, and official CSV exports.
 */

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
        <td colspan="10" class="text-center py-12 text-slate-400">
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
    const dp = parseFloat(inv.downPayment) || 0;
    const statusUpper = (inv.status || 'BELUM LUNAS').toUpperCase();

    // Sisa Tagihan calculation & display
    let balance = 0;
    let sisaTagihanHtml = '';
    if (statusUpper === 'LUNAS') {
      balance = 0;
      sisaTagihanHtml = '<span class="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] border border-emerald-200">Rp 0 <span class="text-[9px]">✓</span></span>';
    } else if (statusUpper === 'DP') {
      balance = Math.max(0, grandTotal - dp);
      sisaTagihanHtml = `<div class="font-bold text-blue-700 text-xs">${formatRupiah(balance)}</div><div class="text-[9.5px] text-slate-400">DP: ${formatRupiah(dp)}</div>`;
    } else {
      balance = dp > 0 ? Math.max(0, grandTotal - dp) : grandTotal;
      sisaTagihanHtml = `<div class="font-bold text-amber-700 text-xs">${formatRupiah(balance)}</div>`;
    }

    // Dates with 3-letter month (e.g. 24 Nov 2026, 15 Agu 2026)
    const tanggalStr = typeof formatTanggalIndoShort === 'function' ? formatTanggalIndoShort(inv.date) : (inv.date || '-');
    const tempoStr = inv.dueDate ? (typeof formatTanggalIndoShort === 'function' ? formatTanggalIndoShort(inv.dueDate) : inv.dueDate) : '-';
    let tempoHtml = `<span class="text-slate-600 font-medium">${tempoStr}</span>`;
    if (inv.dueDate && statusUpper !== 'LUNAS') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const due = new Date(inv.dueDate);
      if (due < today) {
        tempoHtml = `<span class="text-rose-600 font-bold inline-flex items-center gap-1" title="Melewati batas jatuh tempo">${tempoStr} <span class="text-[9.5px]">⚠️</span></span>`;
      }
    }

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

    // Interactive Status Quick Select styling
    let selectClass = 'bg-slate-50 text-slate-700 border-slate-300 focus:ring-slate-300';
    if (statusUpper === 'LUNAS') {
      selectClass = 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 focus:ring-emerald-400';
    } else if (statusUpper === 'BELUM LUNAS') {
      selectClass = 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 focus:ring-amber-400';
    } else if (statusUpper === 'DP') {
      selectClass = 'bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100 focus:ring-blue-400';
    } else if (statusUpper === 'JATUH TEMPO') {
      selectClass = 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100 focus:ring-rose-400';
    }

    tr.innerHTML = `
      <td class="py-3 px-3.5 text-center font-medium text-slate-400 text-[11px]">${index + 1}</td>
      <td class="py-3 px-3.5 font-bold text-slate-900 font-mono text-xs cursor-pointer hover:text-blue-600 transition-colors btn-row-open" title="Klik untuk membuka invoice">
        ${escapeHtml(inv.invoiceNumber || '-')}
      </td>
      <td class="py-3 px-3.5 whitespace-nowrap text-[11px]">
        <span class="font-medium text-slate-800">${tanggalStr}</span>
      </td>
      <td class="py-3 px-3.5 whitespace-nowrap text-[11px]">
        ${tempoHtml}
      </td>
      <td class="py-3 px-3.5">
        <div class="font-bold text-slate-800 text-xs">${escapeHtml(inv.client?.name || 'Pelanggan Umum')}</div>
        ${inv.client?.contactPerson ? `<div class="text-[10.5px] text-slate-500">${escapeHtml(inv.client.contactPerson)}</div>` : ''}
      </td>
      <td class="py-3 px-3.5">
        ${itemsHtml}
      </td>
      <td class="py-3 px-3.5 text-right font-black text-slate-900 text-xs whitespace-nowrap">
        ${formatRupiah(grandTotal)}
      </td>
      <td class="py-3 px-3.5 text-right whitespace-nowrap">
        ${sisaTagihanHtml}
      </td>
      <td class="py-3 px-3.5 text-center whitespace-nowrap">
        <div class="relative inline-block text-center">
          <select class="status-quick-select appearance-none cursor-pointer pl-2.5 pr-6 py-1 text-[10.5px] font-extrabold rounded-lg border uppercase tracking-wider transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 ${selectClass}" data-id="${escapeHtml(inv.id)}" title="Klik untuk langsung mengubah status pembayaran">
            <option value="LUNAS" ${statusUpper === 'LUNAS' ? 'selected' : ''} class="bg-white text-emerald-800 font-bold py-1">LUNAS</option>
            <option value="BELUM LUNAS" ${statusUpper === 'BELUM LUNAS' ? 'selected' : ''} class="bg-white text-amber-800 font-bold py-1">BELUM LUNAS</option>
            <option value="DP" ${statusUpper === 'DP' ? 'selected' : ''} class="bg-white text-blue-800 font-bold py-1">DP (UANG MUKA)</option>
            <option value="JATUH TEMPO" ${statusUpper === 'JATUH TEMPO' ? 'selected' : ''} class="bg-white text-rose-800 font-bold py-1">JATUH TEMPO</option>
          </select>
          <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 opacity-60">
            <svg class="w-2.5 h-2.5 text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        </div>
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

    // Event: Quick Status Changer directly from sales table
    const statusSelect = tr.querySelector('.status-quick-select');
    if (statusSelect) {
      statusSelect.addEventListener('change', (e) => {
        const newStatus = e.target.value;
        if (newStatus === inv.status) return;

        inv.status = newStatus;
        const ok = StorageService.saveInvoice(inv);
        if (ok) {
          if (window.currentInvoice && window.currentInvoice.id === inv.id) {
            window.currentInvoice.status = newStatus;
            const formStatusInput = document.getElementById('input-invoice-status');
            if (formStatusInput) formStatusInput.value = newStatus;
            if (typeof updateLivePreview === 'function') updateLivePreview();
          }
          showToast(`Status ${inv.invoiceNumber || ''} berhasil diubah ke ${newStatus}`, 'success');
          renderSalesTable();
        } else {
          showToast('Gagal memperbarui status invoice', 'error');
          renderSalesTable();
        }
      });
    }

    // Event: Open / Edit
    tr.querySelectorAll('.btn-row-open').forEach(btn => {
      btn.addEventListener('click', () => {
        window.currentInvoice = JSON.parse(JSON.stringify(inv));
        if (typeof populateFormFromState === 'function') populateFormFromState();
        if (typeof updateLivePreview === 'function') updateLivePreview();
        if (typeof switchView === 'function') switchView('builder');
        showToast(`Invoice ${inv.invoiceNumber} siap diedit`);
      });
    });

    // Event: Download PDF directly
    tr.querySelector('.btn-row-pdf').addEventListener('click', async (e) => {
      const originalBtnText = e.currentTarget.innerHTML;
      e.currentTarget.disabled = true;
      e.currentTarget.innerHTML = '<span class="animate-spin inline-block text-[10px]">⟳</span>';

      try {
        const tempInv = JSON.parse(JSON.stringify(inv));
        const prevCurrent = window.currentInvoice;
        window.currentInvoice = tempInv;
        if (typeof updateLivePreview === 'function') updateLivePreview();

        const sheetEl = document.getElementById('invoice-preview-sheet');
        await PDFExportService.exportToPDF(sheetEl, {
          invoiceNumber: tempInv.invoiceNumber,
          clientName: tempInv.client?.name
        });

        window.currentInvoice = prevCurrent;
        if (typeof updateLivePreview === 'function') updateLivePreview();
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

// Render History Table in Modal
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
      window.currentInvoice = JSON.parse(JSON.stringify(inv));
      if (typeof populateFormFromState === 'function') populateFormFromState();
      if (typeof updateLivePreview === 'function') updateLivePreview();
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
  let filePrefix = 'Data_Penjualan_Transaksi';

  if (type === 'items') {
    filePrefix = 'Data_Penjualan_Rincian_Item';
    headers = [
      'No',
      'No Invoice',
      'Tanggal Transaksi',
      'Jatuh Tempo',
      'Nama Pelanggan',
      'Kontak Person',
      'No Telp / WhatsApp',
      'Status Pembayaran',
      'Nama Barang / Jasa',
      'Spesifikasi / Deskripsi',
      'Kuantitas (Qty)',
      'Satuan',
      'Harga Satuan (Rp)',
      'Potongan Item (Rp)',
      'Subtotal Item (Rp)',
      'Grand Total Invoice (Rp)',
      'Jumlah Dibayarkan (Rp)',
      'Sisa Tagihan (Rp)'
    ];

    let rowNo = 1;
    invoices.forEach(inv => {
      const grandTotal = calculateInvoiceTotal(inv);
      const dp = parseFloat(inv.downPayment) || 0;
      const statusUpper = (inv.status || 'BELUM LUNAS').toUpperCase();

      let jumlahDibayar = 0;
      let balance = 0;
      if (statusUpper === 'LUNAS') {
        jumlahDibayar = Math.max(grandTotal, dp);
        balance = 0;
      } else if (statusUpper === 'DP') {
        jumlahDibayar = dp;
        balance = Math.max(0, grandTotal - dp);
      } else {
        jumlahDibayar = dp > 0 ? dp : 0;
        balance = Math.max(0, grandTotal - jumlahDibayar);
      }

      if (Array.isArray(inv.items) && inv.items.length > 0) {
        inv.items.forEach(it => {
          const itemSubtotal = (parseFloat(it.qty) || 0) * (parseFloat(it.price) || 0) - (parseFloat(it.discount) || 0);
          rows.push([
            rowNo++,
            excelTextFormula(inv.invoiceNumber || ''),
            escapeCsvCell(inv.date || ''),
            escapeCsvCell(inv.dueDate || ''),
            escapeCsvCell(inv.client?.name || '-'),
            escapeCsvCell(inv.client?.contactPerson || '-'),
            excelTextFormula(inv.client?.phone || ''),
            escapeCsvCell(inv.status || 'BELUM LUNAS'),
            escapeCsvCell(it.name || '-'),
            escapeCsvCell(it.description || '-'),
            parseFloat(it.qty) || 0,
            escapeCsvCell(it.unit || 'Pcs'),
            Math.round(parseFloat(it.price) || 0),
            Math.round(parseFloat(it.discount) || 0),
            Math.round(itemSubtotal),
            Math.round(grandTotal),
            Math.round(jumlahDibayar),
            Math.round(balance)
          ]);
        });
      } else {
        rows.push([
          rowNo++,
          excelTextFormula(inv.invoiceNumber || ''),
          escapeCsvCell(inv.date || ''),
          escapeCsvCell(inv.dueDate || ''),
          escapeCsvCell(inv.client?.name || '-'),
          escapeCsvCell(inv.client?.contactPerson || '-'),
          excelTextFormula(inv.client?.phone || ''),
          escapeCsvCell(inv.status || 'BELUM LUNAS'),
          '""',
          '""',
          0,
          '""',
          0,
          0,
          0,
          Math.round(grandTotal),
          Math.round(jumlahDibayar),
          Math.round(balance)
        ]);
      }
    });
  } else {
    // Mode Utama (Summary Transaksi): 1 baris per invoice tanpa rincian item (nama, satuan, spesifikasi, qty, harga satuan ditiadakan)
    headers = [
      'No',
      'No Invoice',
      'Tanggal Transaksi',
      'Jatuh Tempo',
      'Status Pembayaran',
      'Nama Pelanggan',
      'Kontak Person',
      'No Telp / WhatsApp',
      'Subtotal Barang (Rp)',
      'Diskon Total (Rp)',
      'Tarif PPN (%)',
      'Nilai PPN (Rp)',
      'Biaya Pengiriman (Rp)',
      'Biaya Lain-lain (Rp)',
      'Grand Total (Rp)',
      'Jumlah Dibayarkan (Rp)',
      'Sisa Tagihan (Rp)'
    ];

    rows = invoices.map((inv, index) => {
      let itemsSubtotal = 0;
      if (Array.isArray(inv.items) && inv.items.length > 0) {
        itemsSubtotal = inv.items.reduce((s, it) => {
          const q = parseFloat(it.qty) || 0;
          const p = parseFloat(it.price) || 0;
          const d = parseFloat(it.discount) || 0;
          return s + Math.max((q * p) - d, 0);
        }, 0);
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
      const statusUpper = (inv.status || 'BELUM LUNAS').toUpperCase();

      let jumlahDibayar = 0;
      let balance = 0;
      if (statusUpper === 'LUNAS') {
        jumlahDibayar = Math.max(grandTotal, dp);
        balance = 0;
      } else if (statusUpper === 'DP') {
        jumlahDibayar = dp;
        balance = Math.max(0, grandTotal - dp);
      } else {
        jumlahDibayar = dp > 0 ? dp : 0;
        balance = Math.max(0, grandTotal - jumlahDibayar);
      }

      return [
        index + 1,
        excelTextFormula(inv.invoiceNumber || ''),
        escapeCsvCell(inv.date || ''),
        escapeCsvCell(inv.dueDate || ''),
        escapeCsvCell(inv.status || 'BELUM LUNAS'),
        escapeCsvCell(inv.client?.name || '-'),
        escapeCsvCell(inv.client?.contactPerson || '-'),
        excelTextFormula(inv.client?.phone || ''),
        Math.round(itemsSubtotal),
        Math.round(discount),
        taxRate,
        taxVal,
        Math.round(parseFloat(inv.shippingFee) || 0),
        Math.round(parseFloat(inv.otherFee) || 0),
        Math.round(grandTotal),
        Math.round(jumlahDibayar),
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
  const countText = type === 'items' ? `${invoices.length} transaksi, ${rows.length} item` : `${invoices.length} transaksi`;
  showToast(`Data penjualan (${countText}) berhasil diekspor rapi ke Excel!`, 'success');
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
  window.currentInvoice = StorageService.getBlankInvoice();
  if (typeof populateFormFromState === 'function') populateFormFromState();
  if (typeof renderSavedBanksCheckboxes === 'function') renderSavedBanksCheckboxes();
  const selClient = document.getElementById('select-saved-client');
  if (selClient) selClient.value = '';
  if (typeof updateLivePreview === 'function') updateLivePreview();
  if (typeof switchView === 'function') switchView('builder');
  showToast('Formulir invoice baru siap diisi');
}

// Setup sales view event listeners
function setupSalesEventListeners() {
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

// Global Exports
window.calculateInvoiceTotal = calculateInvoiceTotal;
window.updateSalesKPIs = updateSalesKPIs;
window.getFilteredSalesInvoices = getFilteredSalesInvoices;
window.renderSalesTable = renderSalesTable;
window.renderHistoryTable = renderHistoryTable;
window.exportSalesToCSV = exportSalesToCSV;
window.printSalesReport = printSalesReport;
window.createNewInvoiceFromSales = createNewInvoiceFromSales;
window.setupSalesEventListeners = setupSalesEventListeners;

