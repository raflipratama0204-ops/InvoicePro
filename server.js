const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = process.env.PORT || 3000;
const BASE_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf'
};

// SSE Live Reload Clients
const sseClients = new Set();
let reloadDebounce = null;

function broadcastReload(changedFile) {
  if (reloadDebounce) clearTimeout(reloadDebounce);
  reloadDebounce = setTimeout(() => {
    console.log(`[Auto-Update] File diperbarui: ${changedFile || 'perubahan terdeteksi'}. Mengirim sinyal refresh ke browser...`);
    for (const client of sseClients) {
      try {
        client.write(`data: reload\n\n`);
      } catch (err) {
        sseClients.delete(client);
      }
    }
  }, 300);
}

// Watch workspace files for changes (HTML, CSS, JS, JSON)
try {
  const watchFolders = [
    BASE_DIR,
    path.join(BASE_DIR, 'css'),
    path.join(BASE_DIR, 'js'),
    path.join(BASE_DIR, 'js', 'modules')
  ];

  watchFolders.forEach(folder => {
    if (fs.existsSync(folder)) {
      fs.watch(folder, { recursive: false }, (eventType, filename) => {
        if (!filename) return;
        if (filename.startsWith('.') || filename.endsWith('.tmp') || filename.includes('test')) return;
        const ext = path.extname(filename).toLowerCase();
        if (['.html', '.css', '.js', '.json'].includes(ext)) {
          broadcastReload(filename);
        }
      });
    }
  });
} catch (e) {
  console.warn('[Auto-Update] File watcher tidak aktif:', e.message);
}

const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);

  // Handle SSE Live Reload
  if (reqPath === '/api/live-reload') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    res.write(': keep-alive\n\n');
    sseClients.add(res);
    req.on('close', () => {
      sseClients.delete(res);
    });
    return;
  }

  // Handle API version info
  if (reqPath === '/api/version') {
    const versionPath = path.join(BASE_DIR, 'version.json');
    let vData = { version: '1.0.1', buildTime: Date.now() };
    if (fs.existsSync(versionPath)) {
      try {
        vData = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
      } catch (e) { }
    }
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify(vData));
    return;
  }

  // Handle Backend Firebase Config (so users don't configure Firebase manually)
  if (reqPath === '/api/firebase-config') {
    let fbConfig = null;
    if (process.env.FIREBASE_API_KEY && process.env.FIREBASE_PROJECT_ID) {
      fbConfig = {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN || `${process.env.FIREBASE_PROJECT_ID}.firebaseapp.com`,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
        appId: process.env.FIREBASE_APP_ID || ''
      };
    } else {
      const configPath = path.join(BASE_DIR, 'firebase-config.json');
      if (fs.existsSync(configPath)) {
        try {
          const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          if (parsed && parsed.apiKey && parsed.projectId) {
            fbConfig = parsed;
          }
        } catch (e) { }
      }
    }
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({ configured: Boolean(fbConfig), config: fbConfig }));
    return;
  }

  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  // Block direct static download of backend/rules/hidden files
  const baseName = path.basename(reqPath).toLowerCase();
  if (
    baseName.startsWith('.') ||
    baseName === 'firebase-config.json' ||
    baseName === 'firestore.rules' ||
    baseName === 'server.js' ||
    baseName === 'package.json'
  ) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Access Denied');
    return;
  }

  const safePath = path.normalize(path.join(BASE_DIR, reqPath));
  if (!safePath.startsWith(BASE_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Access Denied');
    return;
  }

  fs.stat(safePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 File Not Found');
      return;
    }

    const ext = path.extname(safePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Anti-cache headers so browser always gets the freshest code without stale cache
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    const stream = fs.createReadStream(safePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n======================================================`);
  console.log(`  🧾 InvoicePro - Pembuat Invoice Penjualan`);
  console.log(`  Aplikasi berjalan di: ${url}`);
  console.log(`  ⚡ Live Reload & Auto-Update: AKTIF`);
  console.log(`======================================================\n`);

  // Open browser on Windows if not suppressed
  if (process.platform === 'win32' && !process.env.NO_AUTO_OPEN) {
    exec(`start ${url}`);
  }
});
