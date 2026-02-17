

import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

const generateShortCode = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 7; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

const createPreviewHTML = (shortUrl, longUrl) => `

Leafy Shortner Leafy Shortner

You're about to visit

${shortUrl}

This link leads to:

${longUrl}

Continue to website [← Back to Leafy Shortner](/)

`;

export default async (req, res) => {
  if (req.method === 'POST' && req.url === '/shorten') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { url, shortcode } = JSON.parse(body);
        if (!url) return res.status(400).json({ error: 'URL is required' });

        const finalShortCode = shortcode || generateShortCode();

        if (await redis.get(finalShortCode)) {
          return res.status(400).json({ error: 'Shortcode already exists' });
        }

        await redis.set(finalShortCode, url);
        return res.status(200).json({ shortcode: finalShortCode });
      } catch (e) {
        console.error(e);
        return res.status(500).json({ error: 'Invalid request' });
      }
    });
    return;
  }

  if (req.method === 'GET') {
    const shortcode = req.url.slice(1);

    console.log('=== DEBUG GET SHORTCODE ===');
    console.log('Full req.url:', req.url);
    console.log('Extracted shortcode:', shortcode);

    if (!shortcode) return res.status(404).send('Not found');

    try {
      const longUrl = await redis.get(shortcode);
      console.log('longUrl from Redis:', longUrl);

      if (!longUrl) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('Short link not found');
      }

      const protocol = req.headers['x-forwarded-proto'] ? `${req.headers['x-forwarded-proto']}://` : 'https://';
      const host = req.headers.host;
      const shortUrl = `${protocol}${host}/${shortcode}`;

      res.writeHead(200, { 'Content-Type': 'text/html' });
      return res.end(createPreviewHTML(shortUrl, longUrl));
    } catch (e) {
      console.error(e);
      return res.status(500).send('Server error');
    }
  }

  res.status(404).send('Not found');
};