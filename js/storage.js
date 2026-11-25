/**
 * InvoicePro - Local Storage & Data Management Module
 * Supports: Invoices, Store Profile, Master Pelanggan, Master Produk, Master Rekening Bank
 */

const STORAGE_KEYS = {
  STORE_PROFILE: 'invoicepro_store_profile',
  INVOICES: 'invoicepro_invoices',
  CUSTOMERS: 'invoicepro_customers',
  PRODUCTS: 'invoicepro_products',
  BANKS: 'invoicepro_banks',
  APP_SETTINGS: 'invoicepro_settings'
};

// Active user UID for per-account data isolation (null = guest/local mode)
let activeUserUid = null;

function getScopedKey(baseKey) {
  return activeUserUid ? `${baseKey}_u_${activeUserUid}` : baseKey;
}

function notifyCloudSync(type, payload) {
  try {
    if (window.FirebaseSync && typeof window.FirebaseSync.onLocalChange === 'function') {
      window.FirebaseSync.onLocalChange(type, payload);
    }
  } catch (e) {
    console.warn('Cloud sync notification skipped:', e);
  }
}

// Default Notes & Terms
const DEFAULT_NOTES = 'Terima kasih atas kepercayaan Anda bertransaksi dengan kami. Mohon periksa kembali kondisi barang saat serah terima.';
const DEFAULT_TERMS = '1. Pembayaran sah apabila dana sudah masuk ke rekening yang tertera di atas.\n2. Bukti transfer mohon dikonfirmasikan via WhatsApp.';

// Default blank invoice template generator
function createBlankInvoice(savedStoreProfile = null) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  let random = Math.floor(1000 + Math.random() * 9000);
  let invoiceNumber = `INV/${year}${month}${day}/${random}`;
  try {
    const existingInvoices = typeof StorageService !== 'undefined' ? StorageService.getAllInvoices() : [];
    let attempts = 0;
    while (existingInvoices.some(inv => inv.invoiceNumber && inv.invoiceNumber.trim().toLowerCase() === invoiceNumber.toLowerCase()) && attempts < 50) {
      random = Math.floor(1000 + Math.random() * 9000);
      invoiceNumber = `INV/${year}${month}${day}/${random}`;
      attempts++;
    }
  } catch (e) {}
  const dueDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const store = savedStoreProfile ? { ...savedStoreProfile } : {
    name: '',
    tagline: '',
    address: '',
    phone: '',
    email: '',
    npwp: '',
    logo: ''
  };

  return {
    id: 'INV-' + Date.now(),
    invoiceNumber: invoiceNumber,
    date: now.toISOString().split('T')[0],
    dueDate: dueDate,
    status: 'BELUM LUNAS', // LUNAS, BELUM LUNAS, JATUH TEMPO, DP
    theme: 'dark',
    
    // Store / Seller Info
    store: store,
    
    // Client Info (completely blank)
    client: {
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      shippingAddress: ''
    },
    
    // 1 Clean Blank Item
    items: [
      {
        id: Date.now(),
        name: '',
        description: '',
        qty: 1,
        unit: 'Pcs',
        price: 0,
        discount: 0
      }
    ],
    
    // Financial settings
    globalDiscountType: 'fixed', // 'fixed' or 'percent'
    globalDiscountValue: 0,
    taxRate: 0, // Default 0% so blank form starts clean at Rp 0
    shippingFee: 0,
    otherFee: 0,
    downPayment: 0,
    
    // Payment banks (empty by default, user can select from master banks)
    banks: [],
    
    // Notes & Terms (Standar tetap ada)
    notes: DEFAULT_NOTES,
    terms: DEFAULT_TERMS,
    
    // Signature
    signatureName: savedStoreProfile?.signatureName || '',
    signatureTitle: savedStoreProfile?.signatureTitle || '',
    signatureImage: '',
    showStamp: true
  };
}

class StorageService {
  /**
   * Set active user UID for per-account data isolation
   */
  static setActiveUser(uid) {
    activeUserUid = uid || null;
  }

  /**
   * Get active user UID
   */
  static getActiveUser() {
    return activeUserUid;
  }

  /**
   * Write raw collection data into current user's scoped localStorage without triggering cloud re-sync
   */
  static setScopedCollectionRaw(keyName, value) {
    try {
      const baseKey = STORAGE_KEYS[keyName];
      if (!baseKey) return false;
      if (value === null || value === undefined) {
        localStorage.removeItem(getScopedKey(baseKey));
      } else {
        localStorage.setItem(getScopedKey(baseKey), JSON.stringify(value));
      }
      return true;
    } catch (e) {
      console.error('Failed to set scoped collection:', e);
      return false;
    }
  }

  /**
   * Save or update store profile (default profile)
   */
  static saveStoreProfile(profileData) {
    try {
      localStorage.setItem(getScopedKey(STORAGE_KEYS.STORE_PROFILE), JSON.stringify(profileData));
      notifyCloudSync('storeProfile', profileData);
      return true;
    } catch (e) {
      console.error('Failed to save store profile:', e);
      return false;
    }
  }

  /**
   * Retrieve saved store profile
   */
  static getStoreProfile() {
    try {
      const data = localStorage.getItem(getScopedKey(STORAGE_KEYS.STORE_PROFILE));
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Failed to get store profile:', e);
      return null;
    }
  }

  /**
   * Produce a clean blank invoice respecting saved store profile
   */
  static getBlankInvoice() {
    const savedStore = this.getStoreProfile();
    return createBlankInvoice(savedStore);
  }

  // ==========================================
  // MASTER DATA: PELANGGAN (CUSTOMERS)
  // ==========================================

  /**
   * Get all saved customers
   */
  static getCustomers() {
    try {
      const data = localStorage.getItem(getScopedKey(STORAGE_KEYS.CUSTOMERS));
      const list = data ? JSON.parse(data) : [];
      return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } catch (e) {
      console.error('Failed to get customers:', e);
      return [];
    }
  }

  /**
   * Save or update customer
   */
  static saveCustomer(customer) {
    try {
      const list = this.getCustomers();
      const payload = {
        id: customer.id || 'CUST-' + Date.now(),
        name: (customer.name || '').trim(),
        contactPerson: (customer.contactPerson || '').trim(),
        phone: (customer.phone || '').trim(),
        email: (customer.email || '').trim(),
        address: (customer.address || '').trim(),
        shippingAddress: (customer.shippingAddress || '').trim(),
        updatedAt: new Date().toISOString()
      };

      if (!payload.name) return null;

      const existingIndex = list.findIndex(c => c.id === payload.id || c.name.toLowerCase() === payload.name.toLowerCase());
      if (existingIndex >= 0) {
        payload.id = list[existingIndex].id;
        list[existingIndex] = payload;
      } else {
        payload.createdAt = new Date().toISOString();
        list.push(payload);
      }

      localStorage.setItem(getScopedKey(STORAGE_KEYS.CUSTOMERS), JSON.stringify(list));
      notifyCloudSync('customers', list);
      return payload;
    } catch (e) {
      console.error('Failed to save customer:', e);
      return null;
    }
  }

  /**
   * Delete customer by ID
   */
  static deleteCustomer(id) {
    try {
      let list = this.getCustomers();
      list = list.filter(c => c.id !== id);
      localStorage.setItem(getScopedKey(STORAGE_KEYS.CUSTOMERS), JSON.stringify(list));
      notifyCloudSync('customers', list);
      return true;
    } catch (e) {
      console.error('Failed to delete customer:', e);
      return false;
    }
  }

  /**
   * Get customer by ID
   */
  static getCustomerById(id) {
    const list = this.getCustomers();
    return list.find(c => c.id === id) || null;
  }

  // ==========================================
  // MASTER DATA: PRODUK & JASA (PRODUCTS)
  // ==========================================

  /**
   * Get all saved products
   */
  static getProducts() {
    try {
      const data = localStorage.getItem(getScopedKey(STORAGE_KEYS.PRODUCTS));
      const list = data ? JSON.parse(data) : [];
      return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } catch (e) {
      console.error('Failed to get products:', e);
      return [];
    }
  }

  /**
   * Save or update product
   */
  static saveProduct(product) {
    try {
      const list = this.getProducts();
      const payload = {
        id: product.id || 'PROD-' + Date.now(),
        name: (product.name || '').trim(),
        unit: (product.unit || 'Pcs').trim(),
        price: parseFloat(product.price) || 0,
        description: (product.description || '').trim(),
        updatedAt: new Date().toISOString()
      };

      if (!payload.name) return null;

      const existingIndex = list.findIndex(p => p.id === payload.id || p.name.toLowerCase() === payload.name.toLowerCase());
      if (existingIndex >= 0) {
        payload.id = list[existingIndex].id;
        list[existingIndex] = payload;
      } else {
        payload.createdAt = new Date().toISOString();
        list.push(payload);
      }

      localStorage.setItem(getScopedKey(STORAGE_KEYS.PRODUCTS), JSON.stringify(list));
      notifyCloudSync('products', list);
      return payload;
    } catch (e) {
      console.error('Failed to save product:', e);
      return null;
    }
  }

  /**
   * Delete product by ID
   */
  static deleteProduct(id) {
    try {
      let list = this.getProducts();
      list = list.filter(p => p.id !== id);
      localStorage.setItem(getScopedKey(STORAGE_KEYS.PRODUCTS), JSON.stringify(list));
      notifyCloudSync('products', list);
      return true;
    } catch (e) {
      console.error('Failed to delete product:', e);
      return false;
    }
  }

  /**
   * Find product by name (case-insensitive)
   */
  static getProductByName(name) {
    if (!name) return null;
    const clean = name.trim().toLowerCase();
    const list = this.getProducts();
    return list.find(p => p.name.trim().toLowerCase() === clean) || null;
  }

  /**
   * Batch import products from Excel / CSV
   */
  static importProductsBatch(productsList, overwrite = true) {
    try {
      if (!Array.isArray(productsList) || productsList.length === 0) {
        return { success: false, added: 0, updated: 0 };
      }
      const list = this.getProducts();
      let added = 0;
      let updated = 0;

      productsList.forEach(p => {
        const name = (p.name || '').trim();
        if (!name) return;

        const payload = {
          name: name,
          unit: (p.unit || 'Pcs').trim(),
          price: parseFloat(p.price) || 0,
          description: (p.description || '').trim(),
          updatedAt: new Date().toISOString()
        };

        const existingIndex = list.findIndex(item => item.name.trim().toLowerCase() === name.toLowerCase());
        if (existingIndex >= 0) {
          if (overwrite) {
            list[existingIndex] = {
              ...list[existingIndex],
              ...payload,
              id: list[existingIndex].id
            };
            updated++;
          }
        } else {
          payload.id = 'PROD-' + Date.now() + '-' + Math.floor(1000 + Math.random() * 9000);
          payload.createdAt = new Date().toISOString();
          list.push(payload);
          added++;
        }
      });

      localStorage.setItem(getScopedKey(STORAGE_KEYS.PRODUCTS), JSON.stringify(list));
      notifyCloudSync('products', list);
      return { success: true, added, updated };
    } catch (e) {
      console.error('Failed to import products batch:', e);
      return { success: false, added: 0, updated: 0, error: e.message };
    }
  }

  // ==========================================
  // MASTER DATA: REKENING BANK (BANKS)
  // ==========================================

  /**
   * Get all saved master bank accounts
   */
  static getSavedBanks() {
    try {
      const data = localStorage.getItem(getScopedKey(STORAGE_KEYS.BANKS));
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to get saved banks:', e);
      return [];
    }
  }

  /**
   * Save or update bank account
   */
  static saveBank(bank) {
    try {
      const list = this.getSavedBanks();
      const payload = {
        id: bank.id || 'BANK-' + Date.now(),
        bankName: (bank.bankName || '').trim(),
        accountNumber: (bank.accountNumber || '').trim(),
        accountName: (bank.accountName || '').trim(),
        updatedAt: new Date().toISOString()
      };

      if (!payload.bankName || !payload.accountNumber) return null;

      const existingIndex = list.findIndex(b => b.id === payload.id || (
        b.bankName.toLowerCase() === payload.bankName.toLowerCase() &&
        b.accountNumber.replace(/[\s-]/g, '') === payload.accountNumber.replace(/[\s-]/g, '')
      ));

      if (existingIndex >= 0) {
        payload.id = list[existingIndex].id;
        list[existingIndex] = payload;
      } else {
        payload.createdAt = new Date().toISOString();
        list.push(payload);
      }

      localStorage.setItem(getScopedKey(STORAGE_KEYS.BANKS), JSON.stringify(list));
      notifyCloudSync('banks', list);
      return payload;
    } catch (e) {
      console.error('Failed to save bank:', e);
      return null;
    }
  }

  /**
   * Delete saved bank account by ID
   */
  static deleteBank(id) {
    try {
      let list = this.getSavedBanks();
      list = list.filter(b => b.id !== id);
      localStorage.setItem(getScopedKey(STORAGE_KEYS.BANKS), JSON.stringify(list));
      notifyCloudSync('banks', list);
      return true;
    } catch (e) {
      console.error('Failed to delete bank:', e);
      return false;
    }
  }

  // ==========================================
  // INVOICES & TRANSACTIONS
  // ==========================================

  /**
   * Get all saved invoices (no dummy injection; starts empty if clean)
   */
  static getAllInvoices() {
    try {
      const data = localStorage.getItem(getScopedKey(STORAGE_KEYS.INVOICES));
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to get invoices:', e);
      return [];
    }
  }

  /**
   * Keep for backward compatibility; does not inject dummy sample invoices
   */
  static ensureInitialData() {
    // Intentionally left blank as requested: user wants a clean, empty start.
  }

  /**
   * Check if invoice number is duplicate in storage
   */
  static isInvoiceNumberDuplicate(invoiceNumber, currentId = null) {
    if (!invoiceNumber) return false;
    const cleanNo = invoiceNumber.trim().toLowerCase();
    const invoices = this.getAllInvoices();
    return invoices.some(inv => 
      inv.invoiceNumber && 
      inv.invoiceNumber.trim().toLowerCase() === cleanNo && 
      inv.id !== currentId
    );
  }

  /**
   * Save single invoice
   */
  static saveInvoice(invoiceData) {
    try {
      if (!invoiceData || !invoiceData.invoiceNumber) return false;

      // Duplicate prevention
      if (this.isInvoiceNumberDuplicate(invoiceData.invoiceNumber, invoiceData.id)) {
        console.warn('Cannot save: Duplicate invoice number', invoiceData.invoiceNumber);
        return false;
      }

      const invoices = this.getAllInvoices();
      const existingIndex = invoices.findIndex(inv => inv.id === invoiceData.id);
      
      const payload = {
        ...invoiceData,
        updatedAt: new Date().toISOString()
      };
      
      if (existingIndex >= 0) {
        invoices[existingIndex] = payload;
      } else {
        payload.createdAt = new Date().toISOString();
        invoices.unshift(payload);
      }
      
      localStorage.setItem(getScopedKey(STORAGE_KEYS.INVOICES), JSON.stringify(invoices));
      notifyCloudSync('saveInvoice', payload);
      return true;
    } catch (e) {
      console.error('Failed to save invoice:', e);
      return false;
    }
  }

  /**
   * Delete invoice by ID
   */
  static deleteInvoice(id) {
    try {
      let invoices = this.getAllInvoices();
      invoices = invoices.filter(inv => inv.id !== id);
      localStorage.setItem(getScopedKey(STORAGE_KEYS.INVOICES), JSON.stringify(invoices));
      notifyCloudSync('deleteInvoice', id);
      return true;
    } catch (e) {
      console.error('Failed to delete invoice:', e);
      return false;
    }
  }

  /**
   * Get invoice by ID
   */
  static getInvoiceById(id) {
    const invoices = this.getAllInvoices();
    return invoices.find(inv => inv.id === id) || null;
  }

  // ==========================================
  // BACKUP & RESTORE
  // ==========================================

  /**
   * Export ALL application data (invoices, store profile, customers, products, banks, settings, active draft) as JSON
   */
  static exportDataJSON() {
    const invoices = this.getAllInvoices();
    const customers = this.getCustomers();
    const products = this.getProducts();
    const banks = this.getSavedBanks();
    const storeProfile = this.getStoreProfile();

    let appSettings = null;
    try {
      const rawSettings = localStorage.getItem(getScopedKey(STORAGE_KEYS.APP_SETTINGS));
      appSettings = rawSettings ? JSON.parse(rawSettings) : null;
    } catch (e) {}

    const data = {
      version: '2.1',
      exportedAt: new Date().toISOString(),
      summary: {
        invoices: invoices.length,
        products: products.length,
        customers: customers.length,
        banks: banks.length,
        hasStoreProfile: Boolean(storeProfile && storeProfile.name)
      },
      storeProfile: storeProfile,
      invoices: invoices,
      customers: customers,
      products: products,
      banks: banks,
      appSettings: appSettings,
      activeDraft: window.currentInvoice || null
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `InvoicePro_FullBackup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    return data.summary;
  }

  /**
   * Import ALL application data from JSON string
   */
  static importDataJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (!data || typeof data !== 'object') return { success: false };

      if (data.storeProfile) {
        this.saveStoreProfile(data.storeProfile);
      }
      if (Array.isArray(data.invoices)) {
        localStorage.setItem(getScopedKey(STORAGE_KEYS.INVOICES), JSON.stringify(data.invoices));
        notifyCloudSync('bulkInvoices', data.invoices);
      }
      if (Array.isArray(data.customers)) {
        localStorage.setItem(getScopedKey(STORAGE_KEYS.CUSTOMERS), JSON.stringify(data.customers));
        notifyCloudSync('customers', data.customers);
      }
      if (Array.isArray(data.products)) {
        localStorage.setItem(getScopedKey(STORAGE_KEYS.PRODUCTS), JSON.stringify(data.products));
        notifyCloudSync('products', data.products);
      }
      if (Array.isArray(data.banks)) {
        localStorage.setItem(getScopedKey(STORAGE_KEYS.BANKS), JSON.stringify(data.banks));
        notifyCloudSync('banks', data.banks);
      }
      if (data.appSettings && typeof data.appSettings === 'object') {
        localStorage.setItem(getScopedKey(STORAGE_KEYS.APP_SETTINGS), JSON.stringify(data.appSettings));
      }
      if (data.activeDraft && typeof data.activeDraft === 'object') {
        window.currentInvoice = data.activeDraft;
      }

      return {
        success: true,
        summary: {
          invoices: Array.isArray(data.invoices) ? data.invoices.length : 0,
          products: Array.isArray(data.products) ? data.products.length : 0,
          customers: Array.isArray(data.customers) ? data.customers.length : 0,
          banks: Array.isArray(data.banks) ? data.banks.length : 0,
          hasStoreProfile: Boolean(data.storeProfile)
        }
      };
    } catch (e) {
      console.error('Import error:', e);
      return { success: false };
    }
  }
}

window.StorageService = StorageService;
window.createBlankInvoice = createBlankInvoice;
window.DEFAULT_NOTES = DEFAULT_NOTES;
window.DEFAULT_TERMS = DEFAULT_TERMS;
