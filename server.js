import { readFile, writeFile } from "fs/promises";
import { createServer } from "http";
import crypto from "crypto";
import path from "path";

const PORT = 3003;
const Data_File = path.join("data", "links.json");

const servefile = async (res, filepath, contentype) => {
  try {
    const data = await readFile(filepath);
    res.writeHead(200, { "Content-Type": contentype });
    res.end(data);
  } catch (error) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404: Page not found");
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
    // Static Files
    if (req.url === "/") return servefile(res, path.join("public", "index.html"), "text/html");
    if (req.url === "/style.css") return servefile(res, path.join("public", "style.css"), "text/css");

    // REDIRECTION LOGIC: Check if the URL is a shortened code
    if (links[urlPath]) {
      res.writeHead(302, { Location: links[urlPath] });
      return res.end();
    }
    
    // Default 404 for unknown codes
    if (urlPath) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        return res.end("Short link not found");
    }
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