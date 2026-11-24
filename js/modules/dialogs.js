/**
 * InvoicePro - Native App Dialogs & Notification Subsystem
 * Replaces browser native alert()/confirm() popups with sleek desktop modals.
 */

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

    modal.style.display = 'flex';
    modal.classList.remove('hidden');

    function cleanup(result) {
      modal.style.display = 'none';
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

// Global Exports
window.showToast = showToast;
window.showAppConfirm = showAppConfirm;
window.showAppAlert = showAppAlert;
window.appConfirm = showAppConfirm;
window.appAlert = showAppAlert;

