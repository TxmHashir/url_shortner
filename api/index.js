import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_TOKEN,
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
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Leafy Shortner</title>
    <link rel="icon" href="/logo.png">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        body {
            font-family: 'Inter', sans-serif;
            background: #0f2a22;
            color: #ecfdf5;
            margin: 0;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
        }
        .preview {
            background: #1e3a2f;
            max-width: 520px;
            width: 100%;
            margin: 20px;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0,0,0,0.5);
            border: 1px solid #34d39933;
        }
        .header {
            background: #0a211a;
            padding: 20px;
            text-align: center;
            border-bottom: 1px solid #34d39922;
        }
        .logo {
            height: 48px;
            margin-bottom: 8px;
        }
        .title {
            font-size: 1.6rem;
            font-weight: 700;
            color: #6ee7b7;
        }
        .content {
            padding: 40px 30px;
            text-align: center;
        }
        .short-url {
            font-size: 1.4rem;
            font-weight: 600;
            background: #0f2a22;
            padding: 14px 20px;
            border-radius: 12px;
            margin: 20px 0;
            word-break: break-all;
            color: #34d399;
        }
        .destination {
            color: #a7f3d0;
            font-size: 1.05rem;
            margin: 30px 0 10px;
        }
        .long-url {
            background: #0f2a22;
            padding: 16px;
            border-radius: 12px;
            font-size: 0.95rem;
            word-break: break-all;
            color: #d1fae5;
        }
        button {
            background: #34d399;
            color: #0f2a22;
            border: none;
            padding: 16px 40px;
            font-size: 1.1rem;
            font-weight: 700;
            border-radius: 12px;
            cursor: pointer;
            margin-top: 30px;
            transition: all 0.3s;
        }
        button:hover {
            background: #6ee7b7;
            transform: translateY(-3px);
        }
        .back {
            color: #a7f3d0;
            margin-top: 25px;
            display: inline-block;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="preview">
        <div class="header">
            <img src="/logo.png" class="logo" alt="Leafy">
            <div class="title">Leafy Shortner</div>
        </div>
        <div class="content">
            <p style="color:#a7f3d0; margin-bottom:8px;">You're about to visit</p>
            
            <div class="short-url">${shortUrl}</div>
            
            <div class="destination">This link leads to:</div>
            <div class="long-url">${longUrl}</div>

            <button onclick="window.location.href='${longUrl}'">Continue to website</button>
            
            <a href="/" class="back">Back to Leafy Shortner</a>
        </div>
    </div>
</body>
</html>
`;

export default async function handler(req, res) {
  // Handle POST /shorten
  if (req.method === 'POST') {
    try {
      const { url, shortcode } = req.body;
      if (!url) {
        return res.status(400).json({ error: 'URL is required' });
      }

      const finalShortCode = shortcode || generateShortCode();

      const existing = await redis.get(finalShortCode);
      if (existing) {
        return res.status(400).json({ error: 'Shortcode already exists' });
      }

      await redis.set(finalShortCode, url);
      return res.status(200).json({ shortcode: finalShortCode });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Invalid request' });
    }
  }

  // Handle GET /{shortcode}
  if (req.method === 'GET') {
    const urlPath = req.url.split('?')[0].slice(1); // Fixed extraction ignoring query params
    if (!urlPath) {
      return res.status(404).send('Not found');
    }

    try {
      const longUrl = await redis.get(urlPath);
      if (!longUrl) {
        // Debug logs
        console.log('DEBUG GET SHORTCODE');
        console.log(`Full req url: ${req.url}`);
        console.log(`Extracted shortcode: ${urlPath}`);
        console.log(`longUrl from Redis: ${longUrl}`);

        return res.status(404).send('Short link not found');
      }

      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const shortUrl = `${protocol}://${req.headers.host}/${urlPath}`;

      res.status(200).setHeader('Content-Type', 'text/html');
      return res.send(createPreviewHTML(shortUrl, longUrl));
    } catch (e) {
      console.error(e);
      return res.status(500).send('Server error');
    }
  }

  // Fallback
  res.status(404).send('Not found');
};