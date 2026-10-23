import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { securityHeaders } from './security-headers.mjs';
export { securityHeaders } from './security-headers.mjs';

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };

export function createSecureServer({ directory = resolve('dist'), supabaseOrigin = process.env.SUPABASE_ORIGIN } = {}) {
  const root = resolve(directory);
  const built = JSON.parse(readFileSync(resolve(root, 'security-config.json'), 'utf8'));
  const headers = built.headers ?? securityHeaders(built.supabaseOrigin);
  if (supabaseOrigin && new URL(supabaseOrigin).origin !== built.supabaseOrigin) {
    throw new Error('SUPABASE_ORIGIN differs from the build. Rebuild with VITE_SUPABASE_URL.');
  }
  return createServer(async (req, res) => {
    for (const [name, value] of Object.entries(headers)) res.setHeader(name, value);
    res.setHeader('Cache-Control', 'no-cache');
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(405, { Allow: 'GET, HEAD' }); res.end(); return;
    }
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const file = resolve(root, `.${pathname}`);
      if (file !== root && !file.startsWith(root + sep)) { res.writeHead(400); res.end(); return; }
      let target = file;
      try { if (!(await stat(target)).isFile()) target = resolve(root, 'index.html'); }
      catch { target = extname(pathname) ? null : resolve(root, 'index.html'); }
      if (!target) { res.writeHead(404); res.end(); return; }
      const body = await readFile(target);
      res.writeHead(200, { 'Content-Type': types[extname(target)] || 'application/octet-stream' });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch { res.writeHead(400); res.end(); }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  createSecureServer().listen(Number(process.env.PORT || 8080), process.env.HOST || '127.0.0.1', () => {
    console.log('Secure production server listening');
  });
}
