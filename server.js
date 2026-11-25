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

  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
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
