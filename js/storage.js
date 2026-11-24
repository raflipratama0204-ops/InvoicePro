/**
 * InvoicePro - Local Storage & Data Management Module
 */

const STORAGE_KEYS = {
  STORE_PROFILE: 'invoicepro_store_profile',
  INVOICES: 'invoicepro_invoices',
  APP_SETTINGS: 'invoicepro_settings'
};

// Default sample data for first-time users
const DEFAULT_SAMPLE_DATA = {
  id: 'INV-20261123-001',
  invoiceNumber: 'INV/2026/XI/0001',
  date: new Date().toISOString().split('T')[0],
  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  status: 'LUNAS', // LUNAS, BELUM LUNAS, JATUH TEMPO, DP
  theme: 'blue',
  
  // Store / Seller Info
  store: {
    name: 'PT. NUSANTARA MAJU BERSAMA',
    tagline: 'Solusi Pengadaan & Perdagangan Umum Berkualitas',
    address: 'Jl. Sudirman No. 88, Gedung Sahid Lt. 12, Jakarta Pusat, DKI Jakarta 10220',
    phone: '+62 812-3456-7890',
    email: 'kontak@nusantarama.co.id',
    npwp: '01.234.567.8-012.000',
    logo: ''
  },
  
  // Client Info
  client: {
    name: 'CV. BINTANG KARYA SENTOSA',
    contactPerson: 'Bpk. Ahmad Fauzi (Procurement)',
    phone: '+62 813-9876-5432',
    email: 'procurement@bintangkarya.com',
    address: 'Jl. Raya Darmo Permai No. 45, Kota Surabaya, Jawa Timur 60189',
    shippingAddress: ''
  },
  
  // Items List
  items: [
    {
      id: 1,
      name: 'Laptop Bisnis Ultrabook 14 Inch Core i7',
      description: 'RAM 16GB, SSD 512GB, Garansi Resmi 2 Tahun',
      qty: 2,
      unit: 'Unit',
      price: 13500000,
      discount: 0
    },
    {
      id: 2,
      name: 'Monitor LED 24 Inch Full HD IPS',
      description: 'Resolusi 1920x1080, 75Hz Refresh Rate, Kabel HDMI Included',
      qty: 2,
      unit: 'Unit',
      price: 1850000,
      discount: 50000
    },
    {
      id: 3,
      name: 'Wireless Keyboard & Mouse Combo Ergonomic',
      description: 'Silent Click, 2.4Ghz USB Receiver & Bluetooth',
      qty: 5,
      unit: 'Set',
      price: 350000,
      discount: 0
    }
  ],
  
  // Additional financial fields
  globalDiscountType: 'fixed', // 'fixed' or 'percent'
  globalDiscountValue: 0,
  taxRate: 11, // PPN 11%
  shippingFee: 150000,
  otherFee: 0,
  downPayment: 0,
  
  // Payment Method
  banks: [
    {
      bankName: 'Bank Central Asia (BCA)',
      accountNumber: '8830-1234-5678',
      accountName: 'PT NUSANTARA MAJU BERSAMA'
    },
    {
      bankName: 'Bank Mandiri',
      accountNumber: '137-00-9876-5432',
      accountName: 'PT NUSANTARA MAJU BERSAMA'
    }
  ],
  
  // Terms & Notes
  notes: 'Terima kasih atas kepercayaan Anda bertransaksi dengan kami. Mohon periksa kembali kondisi barang saat serah terima.',
  terms: '1. Pembayaran sah apabila dana sudah masuk ke rekening yang tertera di atas.\n2. Barang yang telah dibeli dilindungi garansi resmi sesuai kartu garansi masing-masing produk.\n3. Bukti transfer mohon dikonfirmasikan via WhatsApp.',
  
  // Signature
  signatureName: 'Rafli Ramadhan, S.E.',
  signatureTitle: 'Direktur Operasional',
  signatureImage: '',
  showStamp: true
};

class StorageService {
  /**
   * Save or update store profile (default profile)
   */
  static saveStoreProfile(profileData) {
    try {
      localStorage.setItem(STORAGE_KEYS.STORE_PROFILE, JSON.stringify(profileData));
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
      const data = localStorage.getItem(STORAGE_KEYS.STORE_PROFILE);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Failed to get store profile:', e);
      return null;
    }
  }

  /**
   * Get all saved invoices
   */
  static getAllInvoices() {
    try {
      this.ensureInitialData();
      const data = localStorage.getItem(STORAGE_KEYS.INVOICES);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to get invoices:', e);
      return [];
    }
  }

  /**
   * Ensure default initial sales data exists on first load
   */
  static ensureInitialData() {
    try {
      const existing = localStorage.getItem(STORAGE_KEYS.INVOICES);
      if (!existing || JSON.parse(existing).length === 0) {
        const seedData = [
          JSON.parse(JSON.stringify(window.DEFAULT_SAMPLE_DATA)),
          {
            id: 'INV-20261122-002',
            invoiceNumber: 'INV/2026/XI/0002',
            date: '2026-11-22',
            dueDate: '2026-11-29',
            status: 'BELUM LUNAS',
            theme: 'blue',
            store: window.DEFAULT_SAMPLE_DATA.store,
            client: {
              name: 'PT. MANDIRI PERKASA JAYA',
              contactPerson: 'Ibu Ratna Dewi',
              phone: '+62 821-1122-3344',
              email: 'finance@mandiriperkasa.co.id',
              address: 'Kawasan Industri MM2100 Blok C-5, Cikarang Barat, Bekasi',
              shippingAddress: ''
            },
            items: [
              {
                id: 101,
                name: 'Server Rack 42U Enterprise with PDU & Fan',
                description: 'Include Cable Management, Glass Front Door',
                qty: 1,
                unit: 'Unit',
                price: 13500000,
                discount: 0
              },
              {
                id: 102,
                name: 'Managed Switch 24-Port Gigabit PoE+',
                description: 'Layer 3 Features, 4x SFP+ Uplink 10G',
                qty: 2,
                unit: 'Unit',
                price: 3850000,
                discount: 200000
              }
            ],
            globalDiscountType: 'fixed',
            globalDiscountValue: 0,
            taxRate: 11,
            shippingFee: 250000,
            otherFee: 0,
            downPayment: 0,
            banks: window.DEFAULT_SAMPLE_DATA.banks,
            notes: 'Barang ready stock siap kirim setelah PO dikonfirmasi.',
            terms: '1. Pembayaran tempo 14 hari sejak barang diterima.\n2. Garansi resmi 1 tahun.',
            signatureName: 'Rafli Ramadhan, S.E.',
            signatureTitle: 'Direktur Operasional',
            signatureImage: '',
            showStamp: true,
            createdAt: '2026-11-22T08:30:00.000Z',
            updatedAt: '2026-11-22T08:30:00.000Z'
          },
          {
            id: 'INV-20261120-003',
            invoiceNumber: 'INV/2026/XI/0003',
            date: '2026-11-20',
            dueDate: '2026-11-27',
            status: 'DP',
            theme: 'blue',
            store: window.DEFAULT_SAMPLE_DATA.store,
            client: {
              name: 'TOKO BERKAH ABADI ELEKTRONIK',
              contactPerson: 'Bpk. H. Hendra',
              phone: '+62 856-7788-9900',
              email: 'berkahabadi.store@gmail.com',
              address: 'Pusat Grosir Pasar Pagi Lt. 2 Blok A No. 12, Jakarta Barat',
              shippingAddress: ''
            },
            items: [
              {
                id: 201,
                name: 'Smart TV LED 55 Inch 4K UHD',
                description: 'Google TV, Dolby Audio, Bluetooth 5.0',
                qty: 2,
                unit: 'Unit',
                price: 5200000,
                discount: 200000
              },
              {
                id: 202,
                name: 'Wall Bracket Heavy Duty Swivel 32-65 Inch',
                description: 'Bahan Baja Kokoh, VESA Support',
                qty: 2,
                unit: 'Pcs',
                price: 250000,
                discount: 0
              }
            ],
            globalDiscountType: 'fixed',
            globalDiscountValue: 0,
            taxRate: 0,
            shippingFee: 100000,
            otherFee: 0,
            downPayment: 5000000,
            banks: window.DEFAULT_SAMPLE_DATA.banks,
            notes: 'Sisa pembayaran dilunasi saat pengiriman barang sampai di lokasi.',
            terms: '1. DP tidak dapat dikembalikan apabila pembatalan sepihak.',
            signatureName: 'Rafli Ramadhan, S.E.',
            signatureTitle: 'Direktur Operasional',
            signatureImage: '',
            showStamp: true,
            createdAt: '2026-11-20T10:15:00.000Z',
            updatedAt: '2026-11-20T10:15:00.000Z'
          }
        ];
        localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(seedData));
      }
    } catch (e) {
      console.error('Error seeding initial sales data:', e);
    }
  }

  /**
   * Save single invoice
   */
  static saveInvoice(invoiceData) {
    try {
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
      
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
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
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
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

  /**
   * Export all invoices as a downloadable JSON backup
   */
  static exportDataJSON() {
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      storeProfile: this.getStoreProfile(),
      invoices: this.getAllInvoices()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `InvoicePro_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Import data from JSON string
   */
  static importDataJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data.storeProfile) {
        this.saveStoreProfile(data.storeProfile);
      }
      if (Array.isArray(data.invoices)) {
        localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(data.invoices));
      }
      return true;
    } catch (e) {
      console.error('Import error:', e);
      return false;
    }
  }
}

window.StorageService = StorageService;
window.DEFAULT_SAMPLE_DATA = DEFAULT_SAMPLE_DATA;

