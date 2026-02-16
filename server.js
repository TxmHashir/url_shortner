import { readFile, writeFile } from "fs/promises";
import { createServer } from "http";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = 3003;
const Data_File = path.join("data", "links.json");

// ====================== NEW: Bitly-style 7-char code ======================
const generateShortCode = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 7; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

// ====================== NEW: Beautiful Preview Page (exactly like Bitly) ======================
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
            
            <a href="/" class="back">← Back to Leafy Shortner</a>
        </div>
    </div>
</body>
</html>
`;

// ====================== Static File Serving ======================
const servefile = async (res, filepath, contentType = "text/plain") => {
  try {
    const fullPath = path.join(__dirname, filepath);
    const data = await readFile(fullPath);
    
    const ext = path.extname(filepath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.ico': 'image/x-icon',
      '.svg': 'image/svg+xml'
    };
    
    res.writeHead(200, { "Content-Type": mimeTypes[ext] || contentType });
    res.end(data);
  } catch (error) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404: File not found");
  }
};

// ====================== Links Load / Save ======================
const loadlinks = async () => {
  try {
    const data = await readFile(Data_File, "utf-8");
    return JSON.parse(data || "{}");
  } catch (error) {
    if (error.code === "ENOENT") {
      await writeFile(Data_File, JSON.stringify({}));
      return {};
    }
    return {};
  }
};

const saveLinks = async (links) => {
  await writeFile(Data_File, JSON.stringify(links, null, 2));
};

// ====================== Server ======================
const server = createServer(async (req, res) => {
  const links = await loadlinks();
  const urlPath = req.url.slice(1);

  // ==================== GET Requests ====================
  if (req.method === "GET") {

    // Root → serve index.html
    if (req.url === "/") {
      return servefile(res, "public/index.html", "text/html");
    }

    // Static files (logo.png, style.css, etc.)
    if (req.url.includes(".")) {
      const staticPath = path.join("public", urlPath);
      return servefile(res, staticPath);
    }

    // Shortcode → Show Bitly-style preview
    if (urlPath && links[urlPath]) {
      const protocol = "http://";
      const host = `localhost:${PORT}`;
      const shortUrl = `${protocol}${host}/${urlPath}`;

      res.writeHead(200, { "Content-Type": "text/html" });
      return res.end(createPreviewHTML(shortUrl, links[urlPath]));
    }

    // 404 for unknown shortcode
    if (urlPath) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      return res.end("Short link not found");
    }
  }

  // ==================== POST /shorten ====================
  if (req.method === "POST" && req.url === "/shorten") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const { url, shortcode } = JSON.parse(body);

        if (!url) {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: "URL is required" }));
        }

        const finalShortCode = shortcode || generateShortCode();

        if (links[finalShortCode]) {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: "Shortcode already exists" }));
        }

        links[finalShortCode] = url;
        await saveLinks(links);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ shortcode: finalShortCode }));
      } catch (e) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON" }));
      }
    });
    return;
  }

  // Fallback 404
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`🚀 Leafy Shortner running at http://localhost:${PORT}`);
});