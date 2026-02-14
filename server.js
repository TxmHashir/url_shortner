import { readFile } from "fs";
import  { createServer } from "http"
import path from "path";
const server  =  createServer(async(req,res)=> {
    if(req.method === "GET"){
        if(req.url === "/")
            try{
        const data = await readFile(path.join("public","index.html"))
         res.writeHead(200, {"content-type":"text/html"})
        } catch (err){
         res.writeHead(404, {"content-type":"text/html"})
         res.end("404page not found");
        } ;
        
    }

})