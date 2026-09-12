/* Run: node web/presentation-workflow/server/start.cjs
 * Node 20+; no installation required. Optional GEMINI_API_KEY, GEMINI_MODEL, PORT.
 * Serves the existing web folder and the migrated measurement API on one origin.
 */
const http=require('http'),fs=require('fs'),path=require('path');
const {analyze,PRESETS}=require('./analysis.cjs');
const {generate}=require('./fitting.cjs');
function createServer({webRoot=path.resolve(__dirname,'../..'),analyzeFn=analyze,generateFn=generate,hasEnvKey=Boolean(process.env.GEMINI_API_KEY)}={}){
  function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
  return http.createServer(async(req,res)=>{
    try{
      if(!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(req.headers.host||''))return json(res,403,{success:false,error:'Use the local website address.'});
      const pathname=new URL(req.url,'http://localhost').pathname;
      if(pathname.startsWith('/api/')){
        if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`)return json(res,403,{success:false,error:'Use the measurement form on this website.'});
        if(pathname==='/api/measurements/health'&&req.method==='GET')return json(res,200,{status:'online',hasEnvKey});
        if(pathname==='/api/measurements/presets'&&req.method==='GET')return json(res,200,{success:true,presets:PRESETS.map(({id,title})=>({id,title}))});
        if(!['/api/measurements/analyze','/api/fitting/generate'].includes(pathname)||req.method!=='POST')return json(res,404,{success:false,error:'Unknown endpoint.'});
        if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return json(res,415,{success:false,error:'Send JSON from the measurement form.'});
        let length=0,chunks=[];for await(const chunk of req){length+=chunk.length;if(length>(pathname.includes("/fitting/")?68:24)*1024*1024){json(res,413,{success:false,error:'The photos are too large. Use files under 8 MB each.'});return;}chunks.push(chunk);}
        let body;try{body=JSON.parse(Buffer.concat(chunks).toString());}catch{return json(res,400,{success:false,error:'Invalid JSON request.'});}
        if(pathname==='/api/fitting/generate'){const controller=new AbortController();res.on('close',()=>{if(!res.writableEnded)controller.abort();});return json(res,200,await generateFn(body,{signal:controller.signal}));}
        return json(res,200,await analyzeFn(body));
      }
      if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
      if(pathname==='/'){res.writeHead(302,{Location:'/web/presentation-workflow/'}).end();return;}
      const decoded=decodeURIComponent(pathname);
      if(!decoded.startsWith('/web/')){res.writeHead(404).end();return;}
      const relative=decoded.slice(5),segments=relative.split(/[\\/]/);
      if(segments.some(s=>s.startsWith('.')||s==='server')){res.writeHead(404).end();return;}
      let file=path.resolve(webRoot,relative);
      if(!file.startsWith(webRoot+path.sep)){res.writeHead(403).end();return;}
      if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');
      const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.dxf':'application/dxf'}[path.extname(file)];
      if(!mime){res.writeHead(404).end();return;}
      res.writeHead(200,{'Content-Type':mime,'X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'});if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);
    }catch(error){if(!res.headersSent)json(res,error.status|| (error.code==='ENOENT'?404:500),{success:false,error:error.status?error.message:'Unable to complete the request.'});else res.end();}
  });
}
if(require.main===module){const port=Number(process.env.PORT||8770);createServer().listen(port,'127.0.0.1',()=>console.log(`MathDress: http://127.0.0.1:${port}/web/presentation-workflow/`));}
module.exports={createServer};
