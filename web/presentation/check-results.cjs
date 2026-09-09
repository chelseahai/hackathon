const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=process.argv[2]||path.resolve(__dirname,'..');global.window=global;
for(const name of ['BasicBlock-Bodice','BasicBlock-Skirt','BasicBlock-Sleeve','BasicBlock-Trousers','GarmentDesign-PrincessLineDress'])vm.runInThisContext(fs.readFileSync(path.join(root,name+'.js'),'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(root,'presentation/pattern-results.js'),'utf8'));
for(const [kind,count] of Object.entries({body:2,skirt:2,sleeve:1,trousers:2,dress:4})){
 const pieces=PatternResults.build(kind);assert.equal(pieces.length,count);
 for(const p of pieces){for(const q of [...p.outline,...p.marks,...p.grain,p.label])assert(Number.isFinite(q.x)&&Number.isFinite(q.y),`${kind}: invalid geometry`);assert.equal(p.grain[0].x,p.grain[1].x);assert(p.grain[0].y>p.grain[1].y);assert(p.name);}
 const lengths=pieces.map(p=>p.grain[0].y-p.grain[1].y);assert(lengths.every(n=>Math.abs(n-lengths[0])<1e-8&&n<=12.001));
 for(const p of pieces){for(let i=0;i<=24;i++){const a=p.grain[0],b=p.grain[1];assert(PatternResults.inside({x:a.x,y:a.y+(b.y-a.y)*i/24},p.outline),'Grainline leaves piece');}for(const [a,b] of p.dashes)assert(PatternResults.inside(b,p.outline),'Mark points outward');}
 console.log(kind+': '+pieces.length+' pieces, inward dashes and equal interior grainlines verified');
}
