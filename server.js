import { readFile } from "fs/promises";
import  { createServer } from "http"
import path from "path";
const PORT = 3003


const servefile  = async (res,filepath, contentype) => {
   try{
    const data =  await readFile(filepath);
    res.writeHead(200, {"Content-Type": contentype})
    res.end(data)
   } catch(error){
     res.writeHead(404, {"Content-Type":contentype})
         res.end("404page not found");
   }
}

const server = createServer(async (req, res) => {
  if (req.method === "GET") {
    if (req.url === "/") {
      return servefile(res, path.join("public", "index.html"), "text/html");
    }

    if (req.url === "/style.css") {
      return servefile(res, path.join("public", "style.css"), "text/css");
    }
  }
  if (req.method === "POST" && req.url ===  "/shorten"){
    const body = "";
    req.on("data",(chunks)=> {
           body+=chunks
    })
    req.on("end",()=>{
        console.log(body);
        const{url,shortcode} = JSON.parse(body);
        if (!url){
            res.writeHead(400,{"Content-Type":"text/plain"})
            return res.end("url required")
        }
    })
  }
});
server.listen(PORT,()=> {
    console.log(`server running at http://localhost:${PORT}`)
})