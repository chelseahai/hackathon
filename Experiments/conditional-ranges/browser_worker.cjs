// Actual browser-source geometry in a persistent, DOM-free process.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),readline=require('node:readline');
const root=process.argv[2],context=vm.createContext({});context.window=context;
for(const f of ['BasicBlock-Bodice.js','BasicBlock-Skirt.js','GarmentDesign-PrincessLineDress.js','Export-DXF/dxf.js'])vm.runInContext(fs.readFileSync(path.join(root,'web',f),'utf8'),context,{filename:f});
const api=context.PrincessDress,xy=p=>[p.x,p.y];
const seam=s=>({name:s.name,kind:s.kind,points:s.points.map(xy),knots:(s.knots||[]).map(xy),spans:(s.spans||[]).map(a=>a.map(xy)),center:s.center?xy(s.center):null});
const panel=p=>({name:p.name,outline:p.outline.map(xy),notches:p.notches.map(xy),notch_ids:p.notchIds,marks:p.marks.map(m=>({label:m.label,pt:xy(m.pt)})),seams:p.seams.map(seam)});
const keys=['backWaist','frontWaist','backHip','frontHip','backDart','frontDart','backSideLen','frontSideLen','sideDart','dressLength'];
readline.createInterface({input:process.stdin}).on('line',line=>{try{
 const input=JSON.parse(line),params=Object.fromEntries(Object.entries(input).map(([k,v])=>[k.replace(/_([a-z])/g,(_,a)=>a.toUpperCase()),v]));
 const d=api.draftPrincessDress(params);if(d.error){process.stdout.write(JSON.stringify({error:d.error})+'\n');return;}
 const laid=api.laidOutPanels(d,d.params.seamAllowance),pieces=context.PatternDxf.piecesFromLaid(laid,d.params.seamAllowance,api.offsetClosed,api.closeRing);
 process.stdout.write(JSON.stringify({snapshot:{metrics:Object.fromEntries(keys.map(k=>[k,d[k]])),panels:d.panels.map(panel),laid:laid.map(panel),cuts:pieces.map(p=>(p.cut||[]).map(xy))}})+'\n');
}catch(e){process.stdout.write(JSON.stringify({error:String(e),unexpected:true})+'\n');}});
