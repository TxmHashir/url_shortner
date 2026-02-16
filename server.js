import { readFile, writeFile } from "fs/promises";
import { createServer } from "http";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url"; // For ES modules path handling

const __dirname = path.dirname(fileURLToPath(import.meta.url)); // ES module equivalent of __dirname
const PORT = 3003;
const Data_File = path.join("data", "links.json");

// Helper: Serve any static file from /public
const servefile = async (res, filepath, contentType = "text/plain") => {
  try {
    const fullPath = path.join(__dirname, filepath);
    const data = await readFile(fullPath);
    
    // Set proper Content-Type based on extension
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
    const type = mimeTypes[ext] || contentType;
    
    res.writeHead(200, { "Content-Type": type });
    res.end(data);
  } catch (error) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404: File not found");
  }
};

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

const server = createServer(async (req, res) => {
  const links = await loadlinks();
  const urlPath = req.url.slice(1); // Remove the leading "/"

  if (req.method === "GET") {
    // Static Files: Serve ANY file from /public (new: catch-all for logo.png, favicon, etc.)
    if (urlPath && !urlPath.includes('.')) { // Skip if no extension (treat as potential shortcode)
      // Don't serve static if it's a potential shortcode (no dot)
    } else {
      const staticPath = path.join("public", urlPath || "index.html");
      return servefile(res, staticPath, urlPath.endsWith('.html') ? 'text/html' : undefined);
    }

    // REDIRECTION LOGIC: Check if the URL is a shortened code (no extension)
    if (urlPath && !urlPath.includes('.') && links[urlPath]) {
      res.writeHead(302, { Location: links[urlPath] });
      return res.end();
    }
    
    // Default 404 for unknown codes/files
    if (urlPath) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      return res.end("Short link not found");
    }
    
    // Root: Serve index.html
    return servefile(res, "public/index.html", "text/html");
  }

  if (req.method === "POST" && req.url === "/shorten") {
    let body = "";
    req.on("data", (chunks) => (body += chunks));
    req.on("end", async () => {
      try {
        const { url, shortcode } = JSON.parse(body);
        if (!url) {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: "URL is required" }));
        }

        // Generate code if none provided (Bitly behavior)
        const finalShortCode = shortcode || crypto.randomBytes(3).toString("hex");

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
  }
});

server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));