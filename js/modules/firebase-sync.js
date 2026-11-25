/**
 * InvoicePro - Firebase Authentication & Per-Account Firestore Sync
 * Koneksi Firebase dimuat langsung dari backend (/api/firebase-config atau js/firebase-config.js),
 * sehingga pengguna akhir cukup langsung masuk dengan akun masing-masing tanpa setup teknis.
 */

const FirebaseSync = (function () {
  let app = null;
  let auth = null;
  let db = null;
  let resolvedConfig = null;
  let currentUser = null;
  let isPulling = false;
  let isInitialized = false;
  let openAuthModalFn = null;

  // Load Firebase configuration strictly from backend / repo config files
  async function loadBackendFirebaseConfig() {
    if (window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey && window.FIREBASE_CONFIG.projectId) {
      resolvedConfig = window.FIREBASE_CONFIG;
      return resolvedConfig;
    }

    if (window.location.protocol.startsWith('http')) {
      try {
        const res = await fetch('/api/firebase-config?_t=' + Date.now(), { cache: 'no-store' });
        if (res.ok) {
          const payload = await res.json();
          if (payload && payload.configured && payload.config && payload.config.apiKey && payload.config.projectId) {
            resolvedConfig = payload.config;
            return resolvedConfig;
          }
        }
      } catch (e) {
        // Ignore on static hosts like GitHub Pages where /api/firebase-config is absent
      }

      try {
        const resJson = await fetch('firebase-config.json?_t=' + Date.now(), { cache: 'no-store' });
        if (resJson.ok) {
          const parsed = await resJson.json();
          if (parsed && parsed.apiKey && parsed.projectId) {
            resolvedConfig = parsed;
            return resolvedConfig;
          }
        }
      } catch (e) {}
    }

    return null;
  }

  // Translate Firebase error codes to clear Indonesian messages
  function translateAuthError(err) {
    const code = err?.code || '';
    const map = {
      'auth/invalid-email': 'Format alamat email tidak valid.',
      'auth/user-disabled': 'Akun ini telah dinonaktifkan.',
      'auth/user-not-found': 'Akun dengan email tersebut belum terdaftar.',
      'auth/wrong-password': 'Kata sandi yang Anda masukkan salah.',
      'auth/invalid-credential': 'Email atau kata sandi salah.',
      'auth/email-already-in-use': 'Email ini sudah terdaftar. Silakan masuk (Login).',
      'auth/weak-password': 'Kata sandi minimal harus 6 karakter.',
      'auth/too-many-requests': 'Terlalu banyak percobaan login. Tunggu beberapa saat lagi.',
      'auth/network-request-failed': 'Koneksi internet bermasalah. Periksa jaringan Anda.',
      'auth/popup-closed-by-user': 'Jendela login Google ditutup sebelum selesai.',
      'auth/operation-not-allowed': 'Metode login ini belum diaktifkan di Firebase Console.'
    };
    return map[code] || (err?.message || 'Terjadi kesalahan autentikasi.');
  }

  // Update account button & sync status indicator in header
  function updateHeaderUI(syncState = 'idle') {
    const btnAccount = document.getElementById('btn-firebase-account');
    const accountLabel = document.getElementById('firebase-account-label');
    const accountDot = document.getElementById('firebase-account-dot');
    const dropdownUserEmail = document.getElementById('dropdown-user-email');
    const dropdownUserStatus = document.getElementById('dropdown-user-status');

    if (!btnAccount || !accountLabel || !accountDot) return;

    if (!currentUser) {
      accountLabel.textContent = 'Masuk Akun';
      accountDot.className = 'w-2 h-2 rounded-full bg-amber-400';
      btnAccount.title = 'Masuk dengan akun Anda agar data tersimpan ke cloud';
      return;
    }

    const displayName = currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'Akun');
    accountLabel.textContent = displayName;
    if (dropdownUserEmail) dropdownUserEmail.textContent = currentUser.email || displayName;

    if (syncState === 'syncing') {
      accountDot.className = 'w-2 h-2 rounded-full bg-blue-500 animate-ping';
      if (dropdownUserStatus) dropdownUserStatus.textContent = 'Menyinkronkan ke cloud...';
    } else if (syncState === 'error') {
      accountDot.className = 'w-2 h-2 rounded-full bg-rose-500';
      if (dropdownUserStatus) dropdownUserStatus.textContent = 'Gagal sinkronisasi (cek koneksi internet)';
    } else {
      accountDot.className = 'w-2 h-2 rounded-full bg-emerald-500';
      if (dropdownUserStatus) dropdownUserStatus.textContent = 'Terhubung & tersinkron ke Firebase';
    }
  }

  // Refresh all UI components after switching user or pulling cloud data
  function refreshAllAppViews() {
    try {
      if (typeof StorageService !== 'undefined') {
        window.currentInvoice = StorageService.getBlankInvoice();
      }
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
    } catch (e) {
      console.error('Error refreshing views after cloud sync:', e);
    }
  }

  // Check if guest localStorage has any data worth migrating on first cloud login
  function hasGuestData() {
    try {
      const inv = JSON.parse(localStorage.getItem('invoicepro_invoices') || '[]');
      const prod = JSON.parse(localStorage.getItem('invoicepro_products') || '[]');
      const cust = JSON.parse(localStorage.getItem('invoicepro_customers') || '[]');
      const bank = JSON.parse(localStorage.getItem('invoicepro_banks') || '[]');
      const prof = JSON.parse(localStorage.getItem('invoicepro_store_profile') || 'null');
      return inv.length > 0 || prod.length > 0 || cust.length > 0 || bank.length > 0 || (prof && prof.name);
    } catch (e) {
      return false;
    }
  }

  // Push all current scoped data to Firestore
  async function pushAllToCloud(uid) {
    if (!db || !uid) return false;
    updateHeaderUI('syncing');
    try {
      const userRef = db.collection('users').doc(uid);
      const now = new Date().toISOString();

      const profile = StorageService.getStoreProfile();
      const customers = StorageService.getCustomers();
      const products = StorageService.getProducts();
      const banks = StorageService.getSavedBanks();
      const invoices = StorageService.getAllInvoices();

      await Promise.all([
        profile ? userRef.collection('data').doc('storeProfile').set({ data: profile, updatedAt: now }) : Promise.resolve(),
        userRef.collection('data').doc('customers').set({ data: customers, updatedAt: now }),
        userRef.collection('data').doc('products').set({ data: products, updatedAt: now }),
        userRef.collection('data').doc('banks').set({ data: banks, updatedAt: now })
      ]);

      for (let i = 0; i < invoices.length; i += 450) {
        const batch = db.batch();
        const chunk = invoices.slice(i, i + 450);
        chunk.forEach(inv => {
          if (inv && inv.id) {
            batch.set(userRef.collection('invoices').doc(String(inv.id)), inv);
          }
        });
        await batch.commit();
      }

      updateHeaderUI('synced');
      return true;
    } catch (e) {
      console.error('Failed to push data to Firebase:', e);
      updateHeaderUI('error');
      return false;
    }
  }

  // Pull all user-specific data from Firestore into user-scoped localStorage
  async function pullAllFromCloud(uid) {
    if (!db || !uid) return false;
    isPulling = true;
    updateHeaderUI('syncing');

    try {
      const userRef = db.collection('users').doc(uid);

      const [profileDoc, customersDoc, productsDoc, banksDoc, invoicesSnap] = await Promise.all([
        userRef.collection('data').doc('storeProfile').get(),
        userRef.collection('data').doc('customers').get(),
        userRef.collection('data').doc('products').get(),
        userRef.collection('data').doc('banks').get(),
        userRef.collection('invoices').get()
      ]);

      const cloudIsEmpty =
        !profileDoc.exists &&
        !customersDoc.exists &&
        !productsDoc.exists &&
        !banksDoc.exists &&
        invoicesSnap.empty;

      if (cloudIsEmpty && hasGuestData() && typeof showAppConfirm === 'function') {
        const migrate = await showAppConfirm({
          title: 'Sinkronkan Data Lokal ke Akun?',
          message: 'Akun Anda masih kosong, tetapi ditemukan data lokal di browser ini. Apakah Anda ingin mengunggah data lokal tersebut ke akun ini?',
          confirmText: 'Ya, Unggah ke Cloud',
          cancelText: 'Mulai Kosong',
          type: 'info',
          icon: '☁️'
        });

        if (migrate) {
          const mapKeys = [
            ['STORE_PROFILE', 'invoicepro_store_profile'],
            ['INVOICES', 'invoicepro_invoices'],
            ['CUSTOMERS', 'invoicepro_customers'],
            ['PRODUCTS', 'invoicepro_products'],
            ['BANKS', 'invoicepro_banks']
          ];
          mapKeys.forEach(([keyName, guestKey]) => {
            const raw = localStorage.getItem(guestKey);
            if (raw) {
              try {
                StorageService.setScopedCollectionRaw(keyName, JSON.parse(raw));
              } catch (e) {}
            }
          });
          isPulling = false;
          await pushAllToCloud(uid);
          refreshAllAppViews();
          if (typeof showToast === 'function') showToast('Data lokal berhasil diunggah ke akun Anda!');
          return true;
        }
      }

      StorageService.setScopedCollectionRaw('STORE_PROFILE', profileDoc.exists ? (profileDoc.data()?.data || null) : null);
      StorageService.setScopedCollectionRaw('CUSTOMERS', customersDoc.exists ? (customersDoc.data()?.data || []) : []);
      StorageService.setScopedCollectionRaw('PRODUCTS', productsDoc.exists ? (productsDoc.data()?.data || []) : []);
      StorageService.setScopedCollectionRaw('BANKS', banksDoc.exists ? (banksDoc.data()?.data || []) : []);

      const invoices = [];
      invoicesSnap.forEach(doc => {
        invoices.push(doc.data());
      });
      invoices.sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0));
      StorageService.setScopedCollectionRaw('INVOICES', invoices);

      updateHeaderUI('synced');
      refreshAllAppViews();
      return true;
    } catch (e) {
      console.error('Failed to pull data from Firebase:', e);
      updateHeaderUI('error');
      if (typeof showToast === 'function') {
        showToast('Gagal mengambil data dari cloud. Periksa koneksi internet Anda.', 'error');
      }
      return false;
    } finally {
      isPulling = false;
    }
  }

  // Handle local StorageService mutations and push to Firestore
  async function onLocalChange(type, payload) {
    if (isPulling || !currentUser || !db) return;

    const uid = currentUser.uid;
    const userRef = db.collection('users').doc(uid);
    const now = new Date().toISOString();
    updateHeaderUI('syncing');

    try {
      if (type === 'storeProfile') {
        await userRef.collection('data').doc('storeProfile').set({ data: payload, updatedAt: now });
      } else if (type === 'customers' || type === 'products' || type === 'banks') {
        await userRef.collection('data').doc(type).set({ data: payload, updatedAt: now });
      } else if (type === 'saveInvoice' && payload && payload.id) {
        await userRef.collection('invoices').doc(String(payload.id)).set(payload);
      } else if (type === 'deleteInvoice' && payload) {
        await userRef.collection('invoices').doc(String(payload)).delete();
      } else if (type === 'bulkInvoices' && Array.isArray(payload)) {
        for (let i = 0; i < payload.length; i += 450) {
          const batch = db.batch();
          payload.slice(i, i + 450).forEach(inv => {
            if (inv && inv.id) batch.set(userRef.collection('invoices').doc(String(inv.id)), inv);
          });
          await batch.commit();
        }
      }
      updateHeaderUI('synced');
    } catch (e) {
      console.error('Cloud sync error:', e);
      updateHeaderUI('error');
    }
  }

  // Handle auth state transitions (switches user data store!)
  async function handleAuthStateChanged(user) {
    const previousUid = currentUser ? currentUser.uid : null;
    currentUser = user || null;

    const loader = document.getElementById('auth-checking-loader');
    const formContainer = document.getElementById('auth-form-container');
    if (loader) loader.classList.add('hidden');

    if (user) {
      StorageService.setActiveUser(user.uid);
      updateHeaderUI('syncing');

      const modalAuth = document.getElementById('modal-auth');
      if (modalAuth) modalAuth.classList.add('hidden');

      if (db) {
        db.collection('users').doc(user.uid).set({
          email: user.email || '',
          displayName: user.displayName || '',
          lastLoginAt: new Date().toISOString()
        }, { merge: true }).catch(() => {});
      }

      await pullAllFromCloud(user.uid);
      if (previousUid !== user.uid && typeof showToast === 'function') {
        showToast(`Selamat datang, ${user.displayName || user.email}! Data toko Anda dimuat.`);
      }
    } else {
      StorageService.setActiveUser(null);
      updateHeaderUI('idle');
      if (previousUid !== null) {
        refreshAllAppViews();
        if (typeof showToast === 'function') {
          showToast('Anda telah keluar. Silakan masuk dengan akun Anda.');
        }
      }
      if (formContainer) formContainer.classList.remove('hidden');
      if (typeof openAuthModalFn === 'function') {
        openAuthModalFn('login');
      }
    }
  }

  // Initialize Firebase SDK from backend config
  async function initFirebase() {
    const config = await loadBackendFirebaseConfig();
    if (!config) {
      updateHeaderUI('idle');
      const loader = document.getElementById('auth-checking-loader');
      const formContainer = document.getElementById('auth-form-container');
      if (loader) loader.classList.add('hidden');
      if (formContainer) formContainer.classList.remove('hidden');
      if (typeof openAuthModalFn === 'function') openAuthModalFn('login');
      return false;
    }

    if (typeof firebase === 'undefined') {
      console.warn('Firebase SDK belum dimuat.');
      updateHeaderUI('error');
      const loader = document.getElementById('auth-checking-loader');
      const formContainer = document.getElementById('auth-form-container');
      if (loader) loader.classList.add('hidden');
      if (formContainer) formContainer.classList.remove('hidden');
      return false;
    }

    try {
      if (firebase.apps && firebase.apps.length > 0) {
        app = firebase.apps[0];
      } else {
        app = firebase.initializeApp(config);
      }
      auth = firebase.auth();
      db = firebase.firestore();

      if (!isInitialized) {
        isInitialized = true;
        auth.onAuthStateChanged(handleAuthStateChanged);
      }
      updateHeaderUI('idle');
      return true;
    } catch (e) {
      console.error('Firebase initialization failed:', e);
      const loader = document.getElementById('auth-checking-loader');
      const formContainer = document.getElementById('auth-form-container');
      if (loader) loader.classList.add('hidden');
      if (formContainer) formContainer.classList.remove('hidden');
      return false;
    }
  }

  // Setup UI Modals & Event Listeners (User Login/Register ONLY - mandatory entry gate)
  function setupUI() {
    const btnAccount = document.getElementById('btn-firebase-account');
    const accountDropdown = document.getElementById('firebase-account-dropdown');
    const modalAuth = document.getElementById('modal-auth');

    if (btnAccount) {
      btnAccount.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!currentUser) {
          openAuthModal('login');
          return;
        }
        if (accountDropdown) accountDropdown.classList.toggle('hidden');
      });
    }

    document.addEventListener('click', (e) => {
      if (accountDropdown && !accountDropdown.contains(e.target) && e.target !== btnAccount) {
        accountDropdown.classList.add('hidden');
      }
    });

    const btnSyncNow = document.getElementById('btn-cloud-sync-now');
    if (btnSyncNow) {
      btnSyncNow.addEventListener('click', async () => {
        if (accountDropdown) accountDropdown.classList.add('hidden');
        if (!currentUser) return;
        const ok = await pullAllFromCloud(currentUser.uid);
        if (ok && typeof showToast === 'function') {
          showToast('Data berhasil disinkronkan!');
        }
      });
    }

    const btnLogout = document.getElementById('btn-firebase-logout');
    if (btnLogout) {
      btnLogout.addEventListener('click', async () => {
        if (accountDropdown) accountDropdown.classList.add('hidden');
        if (auth) await auth.signOut();
      });
    }

    const tabLogin = document.getElementById('tab-auth-login');
    const tabRegister = document.getElementById('tab-auth-register');
    const formAuth = document.getElementById('form-firebase-auth');

    let authMode = 'login';
    function setAuthMode(mode) {
      authMode = mode;
      const nameGroup = document.getElementById('auth-name-group');
      const submitBtn = document.getElementById('btn-auth-submit');
      const errBox = document.getElementById('auth-error-msg');
      if (errBox) errBox.classList.add('hidden');

      if (mode === 'register') {
        if (nameGroup) nameGroup.classList.remove('hidden');
        if (submitBtn) submitBtn.textContent = 'Daftar Akun Baru';
        if (tabRegister) tabRegister.className = 'flex-1 py-2 text-xs font-bold rounded-lg bg-white text-blue-600 shadow-sm transition';
        if (tabLogin) tabLogin.className = 'flex-1 py-2 text-xs font-semibold rounded-lg text-slate-500 hover:text-slate-800 transition';
      } else {
        if (nameGroup) nameGroup.classList.add('hidden');
        if (submitBtn) submitBtn.textContent = 'Masuk ke Akun';
        if (tabLogin) tabLogin.className = 'flex-1 py-2 text-xs font-bold rounded-lg bg-white text-blue-600 shadow-sm transition';
        if (tabRegister) tabRegister.className = 'flex-1 py-2 text-xs font-semibold rounded-lg text-slate-500 hover:text-slate-800 transition';
      }
    }

    if (tabLogin) tabLogin.addEventListener('click', () => setAuthMode('login'));
    if (tabRegister) tabRegister.addEventListener('click', () => setAuthMode('register'));

    function openAuthModal(mode = 'login') {
      const loader = document.getElementById('auth-checking-loader');
      const formContainer = document.getElementById('auth-form-container');
      if (loader) loader.classList.add('hidden');
      if (formContainer) formContainer.classList.remove('hidden');
      setAuthMode(mode);
      if (modalAuth) modalAuth.classList.remove('hidden');
    }

    openAuthModalFn = openAuthModal;

    function showAuthError(msg) {
      const errBox = document.getElementById('auth-error-msg');
      if (errBox) {
        errBox.textContent = msg;
        errBox.classList.remove('hidden');
      }
    }

    if (formAuth) {
      formAuth.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!auth) {
          showAuthError('Server akun cloud belum aktif (konfigurasi Firebase belum diisi di backend).');
          return;
        }
        const email = (document.getElementById('auth-input-email')?.value || '').trim();
        const password = document.getElementById('auth-input-password')?.value || '';
        const name = (document.getElementById('auth-input-name')?.value || '').trim();
        const errBox = document.getElementById('auth-error-msg');
        const submitBtn = document.getElementById('btn-auth-submit');

        if (errBox) errBox.classList.add('hidden');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Memproses...';
        }

        try {
          if (authMode === 'register') {
            const cred = await auth.createUserWithEmailAndPassword(email, password);
            if (name && cred.user) {
              await cred.user.updateProfile({ displayName: name });
            }
          } else {
            await auth.signInWithEmailAndPassword(email, password);
          }
          if (modalAuth) modalAuth.classList.add('hidden');
          formAuth.reset();
        } catch (err) {
          showAuthError(translateAuthError(err));
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = authMode === 'register' ? 'Daftar Akun Baru' : 'Masuk ke Akun';
          }
        }
      });
    }
  }

  function init() {
    setupUI();
    initFirebase();
  }

  return {
    init,
    onLocalChange,
    pullAllFromCloud,
    pushAllToCloud,
    getCurrentUser: () => currentUser,
    isConfigured: () => Boolean(resolvedConfig)
  };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => FirebaseSync.init());
} else {
  FirebaseSync.init();
}

window.FirebaseSync = FirebaseSync;
