// Serves USB and PCI lists
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PORT = process.env.PORT || 3000;
const DATA_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml'
};

function getUsbList() {
  let output = '';
  try {
    output = execSync('lsusb', { encoding: 'utf8', timeout: 3000 });
  } catch (e) {
    try {
      output = execSync('su -c lsusb', { encoding: 'utf8', timeout: 3000 });
    } catch(e2) {
      output = "Error: lsusb not found or permission denied.";
    }
  }
  
  const lines = output.trim().split('\n').filter(line => line.length > 0);
  return lines.map(line => {
    const match = line.match(/^Bus (\d+) Device (\d+): ID ([0-9a-f:]+) (.*)$/i);
    if (match) {
      return {
        raw: line,
        bus: match[1],
        device: match[2],
        id: match[3],
        name: match[4].trim()
      };
    }
    return { raw: line };
  });
}

function getPciList() {
  let output = '';
  try {
    output = execSync('lspci', { encoding: 'utf8', timeout: 3000 });
  } catch (e) {
    try {
      output = execSync('su -c lspci', { encoding: 'utf8', timeout: 3000 });
    } catch(e2) {
      output = "Error: lspci not found or permission denied.";
    }
  }
  
  const lines = output.trim().split('\n').filter(line => line.length > 0);
  return lines.map(line => {
    const match = line.match(/^([0-9a-fA-F:\.]+)\s+(.*)$/i);
    if (match) {
      return {
        raw: line,
        slot: match[1],
        name: match[2].trim()
      };
    }
    return { raw: line };
  });
}

function sendJson(res, status, data) {
  const json = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(json),
  });
  res.end(json);
}

function serveStatic(req, res, pathname) {
  let relativePath = pathname;
  let baseDir = path.join(__dirname, 'public');

  if (pathname.startsWith('/css/')) {
    baseDir = path.join(__dirname, 'css');
    relativePath = pathname.slice(4);
  } else if (pathname.startsWith('/js/')) {
    baseDir = path.join(__dirname, 'js');
    relativePath = pathname.slice(3);
  } else if (pathname === '/' || pathname === '') {
    relativePath = '/index.html';
  }

  const safePath = path.normalize(relativePath).replace(/^(\.\.[/\\])+/, '');
  const fullPath = path.join(baseDir, safePath);

  if (!fullPath.startsWith(baseDir)) {
    res.writeHead(403);
    return res.end();
  }

  fs.stat(fullPath, (err, stats) => {
    if (!err && stats.isFile()) {
      const ext = path.extname(fullPath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
        'Content-Length': stats.size,
      });
      fs.createReadStream(fullPath).pipe(res);
      return;
    }

    if (pathname.startsWith('/css/') || pathname.startsWith('/js/')) {
      res.writeHead(404);
      return res.end();
    }

    const indexPath = path.join(__dirname, 'public', 'index.html');
    fs.stat(indexPath, (indexErr, indexStats) => {
      if (indexErr || !indexStats.isFile()) {
        res.writeHead(404);
        return res.end();
      }
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Length': indexStats.size,
      });
      fs.createReadStream(indexPath).pipe(res);
    });
  });
}

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, 'http://localhost');
  const pathname = parsedUrl.pathname;

  if (req.method === 'GET' && pathname === '/api/usb') {
    return sendJson(res, 200, getUsbList());
  }
  
  if (req.method === 'GET' && pathname === '/api/pci') {
    return sendJson(res, 200, getPciList());
  }

  if (req.method === 'GET' || req.method === 'HEAD') {
    return serveStatic(req, res, pathname);
  }

  res.writeHead(405);
  res.end();
});

server.listen(PORT, () => {
  console.log(`server running on ${PORT}`);
});
