import { kv } from '@vercel/kv';

export default async (req, res) => {
  // ──────────────────────────────────────────────────────────────
  // POST /shorten  →  create short link
  // ──────────────────────────────────────────────────────────────
  if (req.method === 'POST' && req.url === '/shorten') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { url, shortcode } = JSON.parse(body);

        if (!url) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'URL is required' }));
        }

        // generate random code if none given (Bitly-style)
        const finalShortCode = shortcode || Math.random().toString(36).substring(2, 8);

        // check duplicate
        const exists = await kv.get(finalShortCode);
        if (exists) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Shortcode already exists' }));
        }

        await kv.set(finalShortCode, url);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ shortcode: finalShortCode }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // ──────────────────────────────────────────────────────────────
  // GET /:shortcode  →  redirect
  // ──────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const shortcode = req.url.slice(1); // "/abc" → "abc"

    if (!shortcode) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      return res.end('No shortcode provided');
    }

    const longUrl = await kv.get(shortcode);
    if (!longUrl) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Short link not found');
    }

    res.writeHead(302, { Location: longUrl });
    return res.end();
  }

  // fallback
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
};