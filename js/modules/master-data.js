/**
 * InvoicePro - Master Data Management Subsystem
 * Manages Customers (Pelanggan), Products (Katalog Datalist & Modal), and Banks (Rekening).
 */

function initMasterDataControllers() {
  renderCustomerOptions();
  renderProductDatalist();
  renderSavedBanksCheckboxes();
  if (typeof updateCatalogBadge === 'function') updateCatalogBadge();
  setupCustomerEventListeners();
  setupProductEventListeners();
  if (typeof setupCatalogViewEvents === 'function') setupCatalogViewEvents();
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
  if (!customer || !window.currentInvoice) return;
  window.currentInvoice.client.name = customer.name || '';
  window.currentInvoice.client.contactPerson = customer.contactPerson || '';
  window.currentInvoice.client.phone = customer.phone || '';
  window.currentInvoice.client.email = customer.email || '';
  window.currentInvoice.client.address = customer.address || '';
  window.currentInvoice.client.shippingAddress = customer.shippingAddress || '';

  document.getElementById('input-client-name').value = window.currentInvoice.client.name;
  document.getElementById('input-client-contact').value = window.currentInvoice.client.contactPerson;
  document.getElementById('input-client-phone').value = window.currentInvoice.client.phone;
  document.getElementById('input-client-email').value = window.currentInvoice.client.email;
  document.getElementById('input-client-address').value = window.currentInvoice.client.address;
  document.getElementById('input-shipping-address').value = window.currentInvoice.client.shippingAddress;

  if (typeof updateLivePreview === 'function') updateLivePreview();
}

function setupCustomerEventListeners() {
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
// 2. MASTER PRODUK (DATALIST & MODAL)
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
      if (!window.currentInvoice) return;
      if (window.currentInvoice.items.length === 1 && !window.currentInvoice.items[0].name && window.currentInvoice.items[0].price === 0) {
        window.currentInvoice.items[0] = {
          id: Date.now(),
          name: p.name,
          unit: p.unit || 'Unit',
          price: p.price || 0,
          description: p.description || '',
          qty: 1,
          discount: 0
        };
      } else {
        window.currentInvoice.items.push({
          id: Date.now(),
          name: p.name,
          unit: p.unit || 'Unit',
          price: p.price || 0,
          description: p.description || '',
          qty: 1,
          discount: 0
        });
      }
      if (typeof renderFormItems === 'function') renderFormItems();
      if (typeof updateLivePreview === 'function') updateLivePreview();
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
  if (!container || !window.currentInvoice) return;
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
    const isAttached = window.currentInvoice.banks.some(ib => 
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
        const alreadyIn = window.currentInvoice.banks.some(ib => 
          ib.accountNumber.replace(/[\s-]/g, '') === b.accountNumber.replace(/[\s-]/g, '')
        );
        if (!alreadyIn) {
          window.currentInvoice.banks.push({
            bankName: b.bankName,
            accountNumber: b.accountNumber,
            accountName: b.accountName
          });
        }
      } else {
        window.currentInvoice.banks = window.currentInvoice.banks.filter(ib => 
          ib.accountNumber.replace(/[\s-]/g, '') !== b.accountNumber.replace(/[\s-]/g, '')
        );
      }
      if (typeof renderFormBanks === 'function') renderFormBanks();
      renderSavedBanksCheckboxes();
      if (typeof updateLivePreview === 'function') updateLivePreview();
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
      if (!window.currentInvoice) return;
      const alreadyIn = window.currentInvoice.banks.some(ib => 
        ib.accountNumber.replace(/[\s-]/g, '') === b.accountNumber.replace(/[\s-]/g, '')
      );
      if (!alreadyIn) {
        window.currentInvoice.banks.push({
          bankName: b.bankName,
          accountNumber: b.accountNumber,
          accountName: b.accountName
        });
        if (typeof renderFormBanks === 'function') renderFormBanks();
        renderSavedBanksCheckboxes();
        if (typeof updateLivePreview === 'function') updateLivePreview();
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

// Global Exports
window.initMasterDataControllers = initMasterDataControllers;
window.renderCustomerOptions = renderCustomerOptions;
window.applyCustomerToInvoice = applyCustomerToInvoice;
window.renderCustomersModalTable = renderCustomersModalTable;
window.renderProductDatalist = renderProductDatalist;
window.renderProductsModalTable = renderProductsModalTable;
window.renderSavedBanksCheckboxes = renderSavedBanksCheckboxes;
window.renderBanksModalTable = renderBanksModalTable;

