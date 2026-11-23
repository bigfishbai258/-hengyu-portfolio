import http from 'node:http';
import {createReadStream,statSync,existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'dist');
if(!existsSync(path.join(root,'index.html'))){console.error('网站尚未构建，请运行 npm run build。');process.exit(1)}
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.ttf':'font/ttf','.woff2':'font/woff2','.glb':'model/gltf-binary','.webmanifest':'application/manifest+json','.ogg':'audio/ogg','.pdf':'application/pdf','.txt':'text/plain; charset=utf-8'};
const server=http.createServer((req,res)=>{try{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const file=path.resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 if(!existsSync(file)||!statSync(file).isFile()){res.writeHead(404);res.end('Not found');return;}
 res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Content-Length':statSync(file).size});
 createReadStream(file).pipe(res);
}catch{res.writeHead(400);res.end('Bad request')}});
let port=5189;
server.on('error',e=>{if(e.code==='EADDRINUSE'&&port<5200){port++;server.listen(port,'127.0.0.1')}else{console.error(e.message);process.exit(1)}});
server.on('listening',()=>{const url=`http://127.0.0.1:${port}/`;console.log(`张恒瑀 · 设计档案\n${url}\n关闭此窗口即可停止本地网站。`);if(!process.argv.includes('--no-open')){if(process.platform==='win32')spawn('rundll32',['url.dll,FileProtocolHandler',url],{stdio:'ignore',windowsHide:true});else if(process.platform==='darwin')spawn('open',[url],{stdio:'ignore'});else spawn('xdg-open',[url],{stdio:'ignore'});}});
server.listen(port,'127.0.0.1');
