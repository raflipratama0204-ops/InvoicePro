/**
 * InvoicePro - Auto-Update & GitHub Sync Subsystem
 * Memungkinkan aplikasi otomatis me-refresh dan memperbarui kode saat ada pembaruan di GitHub / file lokal.
 */

const AutoUpdater = (function () {
  const LOCAL_STORAGE_REPO_KEY = 'invoicepro_github_repo';
  let initialBuildTime = null;
  let initialVersion = '1.0.1';
  let initialCommitSha = null;
  let isUpdateAvailable = false;
  let isChecking = false;
  let githubApiDisabled = false;
  let pollInterval = null;
  let sseSource = null;

  // Auto-detect GitHub Repository (dari URL github.io jika di-deploy ke GitHub Pages)
  function detectGitHubRepo() {
    // 1. Prioritaskan konfigurasi manual yang tersimpan di localStorage
    const savedRepo = localStorage.getItem(LOCAL_STORAGE_REPO_KEY);
    if (savedRepo && savedRepo.trim()) return savedRepo.trim();

    // 2. Deteksi otomatis dari domain GitHub Pages (misal: username.github.io/invoice-app)
    const host = window.location.hostname || '';
    if (host.endsWith('github.io')) {
      const owner = host.split('.')[0];
      const pathParts = window.location.pathname.split('/').filter(Boolean);
      const repoName = pathParts[0] || '';
      if (owner && repoName) return `${owner}/${repoName}`;
    }

    return null;
  }

  // Periksa apakah pengguna sedang aktif mengetik di formulir builder (agar tidak memutus kerja user)
  function isUserActivelyEditing() {
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
      return true;
    }
    // Periksa jika ada item dengan nama yang belum tersimpan
    if (window.currentInvoice && Array.isArray(window.currentInvoice.items)) {
      const hasUnsavedItems = window.currentInvoice.items.some(it => it.name && it.name.trim().length > 0);
      if (hasUnsavedItems && window.currentInvoice.invoiceNumber) {
        return true;
      }
    }
    return false;
  }

  // Eksekusi pembaruan aplikasi dengan aman (simpan draft, bypass cache browser)
  function applyUpdate(reason = 'github_update') {
    if (isUpdateAvailable) {
      console.log(`[Auto-Updater] Menerapkan pembaruan aplikasi (${reason})...`);
    }

    // Amankan draft invoice saat ini ke LocalStorage agar tidak hilang
    try {
      if (typeof StorageService !== 'undefined' && window.currentInvoice && window.currentInvoice.invoiceNumber) {
        StorageService.saveInvoice(window.currentInvoice);
      }
    } catch (e) {
      console.warn('[Auto-Updater] Gagal menyimpan draft sebelum reload:', e);
    }

    // Sembunyikan banner
    const banner = document.getElementById('banner-app-update');
    if (banner) banner.classList.add('hidden');

    // Tampilkan notifikasi
    if (typeof showToast === 'function') {
      showToast('Memuat pembaruan terbaru...', 'info');
    }

    // Refresh dengan query cache-buster untuk memaksa browser mengambil file JS/CSS terbaru dari GitHub / server
    setTimeout(() => {
      const cleanPath = window.location.pathname;
      const hash = window.location.hash || '';
      window.location.href = `${cleanPath}?updated=${Date.now()}${hash}`;
    }, 400);
  }

  // Tampilkan banner / notifikasi pembaruan
  function notifyUpdateAvailable(updateInfo = '') {
    if (isUpdateAvailable) return;
    isUpdateAvailable = true;

    const banner = document.getElementById('banner-app-update');
    const updateMsg = document.getElementById('banner-update-message');
    const updateBadge = document.getElementById('app-update-badge');

    if (updateMsg && updateInfo) {
      updateMsg.textContent = updateInfo;
    }

    if (updateBadge) {
      updateBadge.classList.remove('hidden');
    }

    // Jika pengguna sedang tidak aktif mengetik (atau di tab Data Penjualan / Katalog), auto-refresh otomatis
    if (!isUserActivelyEditing()) {
      if (typeof showToast === 'function') {
        showToast('📢 Update terbaru terdeteksi dari GitHub! Memperbarui...', 'info');
      }
      setTimeout(() => {
        applyUpdate('auto_idle_refresh');
      }, 1500);
      return;
    }

    // Jika sedang aktif menginput form, tampilkan banner elegan di atas agar pengguna bisa klik saat siap
    if (banner) {
      banner.classList.remove('hidden');
    }
    if (typeof showToast === 'function') {
      showToast('🚀 Pembaruan aplikasi tersedia dari GitHub! Klik tombol di banner atas untuk memperbarui.', 'info');
    }
  }

  // Cek pembaruan melalui endpoint version.json lokal / hosting
  async function checkVersionJsonUpdate() {
    try {
      const res = await fetch(`version.json?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store' }
      });
      if (!res.ok) return false;

      const data = await res.json();
      if (!initialBuildTime) {
        initialBuildTime = data.buildTime || Date.now();
        initialVersion = data.version || '1.0.1';
        return false;
      }

      if (data.buildTime && data.buildTime > initialBuildTime) {
        console.log(`[Auto-Updater] Versi baru terdeteksi via version.json: ${data.version} (${data.buildTime})`);
        notifyUpdateAvailable(`Versi terbaru (${data.version}) telah diperbarui. Klik perbarui untuk memuat perubahan.`);
        return true;
      }
    } catch (e) {
      // Normal jika offline atau file belum siap
    }
    return false;
  }

  // Cek pembaruan langsung dari GitHub Commits API (hanya jika tidak diblokir privacy shield / CORS)
  async function checkGitHubCommitsUpdate() {
    if (githubApiDisabled) return false;
    const repo = detectGitHubRepo();
    if (!repo) return false;

    try {
      const res = await fetch(`https://api.github.com/repos/${repo}/commits?per_page=1`, {
        cache: 'no-store'
      });

      if (!res.ok) {
        if (res.status === 403 || res.status === 429) githubApiDisabled = true;
        return false;
      }

      const commits = await res.json();
      if (Array.isArray(commits) && commits.length > 0) {
        const latestSha = commits[0].sha;
        const commitMsg = commits[0].commit?.message || 'Pembaruan kode';

        if (!initialCommitSha) {
          initialCommitSha = latestSha;
          console.log(`[Auto-Updater] Terhubung ke GitHub Repo (${repo}), Commit: ${latestSha.substring(0, 7)}`);
          return false;
        }

        if (latestSha !== initialCommitSha) {
          console.log(`[Auto-Updater] Commit baru di GitHub terdeteksi: ${latestSha.substring(0, 7)}: ${commitMsg}`);
          notifyUpdateAvailable(`Commit baru di GitHub (${latestSha.substring(0, 7)}): "${commitMsg.slice(0, 45)}...". Klik untuk menerapkan pembaruan.`);
          return true;
        }
      }
    } catch (e) {
      // Browser privacy shield / CORS blocked: disable further GitHub API polling and rely on same-origin version.json
      githubApiDisabled = true;
    }
    return false;
  }

  // Periksa pembaruan secara menyeluruh
  async function checkForUpdates(manual = false) {
    if (isChecking) return;
    isChecking = true;

    if (manual && typeof showToast === 'function') {
      showToast('Memeriksa pembaruan dari GitHub...', 'info');
    }

    try {
      const updatedFromJson = await checkVersionJsonUpdate();
      if (!updatedFromJson) {
        const updatedFromGit = await checkGitHubCommitsUpdate();
        if (manual && !updatedFromGit && !isUpdateAvailable) {
          if (typeof showToast === 'function') {
            showToast('Aplikasi sudah dalam versi terbaru! ✅', 'success');
          }
        }
      }
    } finally {
      isChecking = false;
    }
  }

  // Hubungkan ke SSE Live Reload server lokal Node.js (khusus localhost)
  function initSSE() {
    const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    if (isLocalhost && window.location.protocol.startsWith('http')) {
      try {
        sseSource = new EventSource('/api/live-reload');
        sseSource.onmessage = (e) => {
          if (e.data === 'reload') {
            console.log('[Auto-Updater] Menerima sinyal file reload dari server lokal.');
            notifyUpdateAvailable('Perubahan kode lokal / GitHub terdeteksi.');
            // Jika perubahan lokal di server, segera reload
            setTimeout(() => applyUpdate('local_server_change'), 400);
          }
        };
        sseSource.onerror = () => {
          // Fallback ke polling jika SSE terputus
        };
      } catch (e) {
        // Abaikan jika tidak di server lokal
      }
    }
  }

  // Inisialisasi awal
  function init() {
    // 1. Cek apakah baru saja di-reload dari update
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('updated')) {
      setTimeout(() => {
        if (typeof showToast === 'function') {
          showToast('✅ Aplikasi berhasil diperbarui ke versi GitHub terbaru!', 'success');
        }
        // Bersihkan parameter query dari URL agar rapi
        urlParams.delete('updated');
        const newSearch = urlParams.toString() ? `?${urlParams.toString()}` : '';
        window.history.replaceState({}, document.title, window.location.pathname + newSearch + window.location.hash);
      }, 500);
    }

    // 2. Hubungkan ke SSE Live Reload
    initSSE();

    // 3. Catat initial version & commit
    checkVersionJsonUpdate();
    checkGitHubCommitsUpdate();

    // 4. Polling berkala (setiap 45 detik)
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(() => {
      checkForUpdates(false);
    }, 45000);

    // 5. Cek otomatis ketika user kembali ke tab browser (window focus)
    window.addEventListener('focus', () => {
      checkForUpdates(false);
    });

    // 6. Pasang event listener tombol banner & badge
    setupUIListeners();
  }

  function setupUIListeners() {
    const btnApply = document.getElementById('btn-apply-update-now');
    if (btnApply) {
      btnApply.addEventListener('click', () => applyUpdate('user_clicked_banner'));
    }

    const btnDismiss = document.getElementById('btn-dismiss-update-banner');
    if (btnDismiss) {
      btnDismiss.addEventListener('click', () => {
        const banner = document.getElementById('banner-app-update');
        if (banner) banner.classList.add('hidden');
      });
    }

    const statusBadge = document.getElementById('app-update-status');
    if (statusBadge) {
      statusBadge.addEventListener('click', () => {
        checkForUpdates(true);
      });
    }

    const updateBadge = document.getElementById('app-update-badge');
    if (updateBadge) {
      updateBadge.addEventListener('click', () => {
        applyUpdate('user_clicked_badge');
      });
    }
  }

  return {
    init,
    checkForUpdates,
    applyUpdate,
    setGitHubRepo: function (repo) {
      if (repo && typeof repo === 'string') {
        localStorage.setItem(LOCAL_STORAGE_REPO_KEY, repo.trim());
      } else {
        localStorage.removeItem(LOCAL_STORAGE_REPO_KEY);
      }
      initialCommitSha = null;
      checkForUpdates(true);
    },
    getGitHubRepo: detectGitHubRepo
  };
})();

// Auto-start updater when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => AutoUpdater.init());
} else {
  AutoUpdater.init();
}

window.AutoUpdater = AutoUpdater;

