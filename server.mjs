import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const hostIndex = args.indexOf('--host');
const port = Number(portIndex >= 0 ? args[portIndex + 1] : process.env.PORT || 5174);
const host = hostIndex >= 0 ? args[hostIndex + 1] : '127.0.0.1';
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json' };

createServer(async (req, res) => {
  try {
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(405, { Allow: 'GET, HEAD' }).end();
      return;
    }
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const allowed = path === '/' || path === '/index.html' || /^\/src\/[a-z-]+\.(js|css)$/.test(path);
    const file = resolve(root, '.' + (path === '/' ? '/index.html' : path));
    if (!allowed || !file.startsWith(root + sep)) {
      res.writeHead(404).end('Not found');
      return;
    }
    const content = await readFile(file);
    res.writeHead(200, { 'Content-Type': `${mime[extname(file)] || 'application/octet-stream'}; charset=utf-8`, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch {
    res.writeHead(404).end('Not found');
  }
}).listen(port, host, () => console.log(`Titravelle is ready at http://${host}:${port}`));
