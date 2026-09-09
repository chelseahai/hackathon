const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=process.argv[2]||path.resolve(__dirname,'..');global.window=global;
for(const name of ['BasicBlock-Bodice','BasicBlock-Skirt','BasicBlock-Sleeve','BasicBlock-Trousers','GarmentDesign-PrincessLineDress'])vm.runInThisContext(fs.readFileSync(path.join(root,name+'.js'),'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(root,'presentation/pattern-results.js'),'utf8'));
for(const [kind,count] of Object.entries({body:2,skirt:2,sleeve:1,trousers:2,dress:4})){
 const pieces=PatternResults.build(kind);assert.equal(pieces.length,count);
 for(const p of pieces){for(const q of [...p.outline,...p.marks,...p.grain,p.label])assert(Number.isFinite(q.x)&&Number.isFinite(q.y),`${kind}: invalid geometry`);assert.equal(p.grain[0].x,p.grain[1].x);assert(p.grain[0].y>p.grain[1].y);assert(p.name);}
 const lengths=pieces.map(p=>p.grain[0].y-p.grain[1].y);assert(lengths.every(n=>Math.abs(n-lengths[0])<1e-8&&n<=12.001));
 const ref=pieces.find(p=>p.reference)||pieces[0],ys=ref.draftedOutline.map(p=>p.y),middle=(Math.min(...ys)+Math.max(...ys))/2;
 for(const p of pieces){assert(Math.abs((p.grain[0].y+p.grain[1].y)/2-middle)<1e-8,'Wrong reference height');assert(Math.abs(p.grain[0].y-pieces[0].grain[0].y)<1e-8&&Math.abs(p.grain[1].y-pieces[0].grain[1].y)<1e-8,'Grainlines are not level');p.outline.forEach((q,i)=>{assert.equal(q.y,p.draftedOutline[i].y,'Piece moved vertically');assert(Math.abs(q.x-p.draftedOutline[i].x-p.displayShiftX)<1e-8,'Nonuniform horizontal shift');});}
 for(const p of pieces){for(let i=0;i<=24;i++){const a=p.grain[0],b=p.grain[1];assert(PatternResults.inside({x:a.x,y:a.y+(b.y-a.y)*i/24},p.outline),'Grainline leaves piece');}for(const [a,b] of p.dashes)assert(PatternResults.inside(b,p.outline),'Mark points outward');}
 console.log(kind+': '+pieces.length+' pieces, inward dashes and equal interior grainlines verified');
}
// Independent landmark checks: do not substitute a bounding-box/narrowest axis.
const t=TrouserBlock.draftTrouser({}),b=BodyBlock.draftBody({bust:84,backLength:38}),s=SleeveBlock.draftSleeve({frontAh:b.frontArmholeLen,backAh:b.backArmholeLen}),d=PrincessDress.draftPrincessDress({});
const w=i=>d.panels[i].marks.filter(m=>m.label==='W').map(m=>m.pt.x);
const axes={trousers:[(t.hemSide.x+t.hemInseam.x)/2,-(t.backHemSide.x+t.backHemInseam.x)/2],body:[b.underarm.x/2,(b.underarm.x+b.cfX)/2],sleeve:[(s.frontCuff.x+s.backCuff.x)/2],dress:[w(0)[0]/2,(w(1)[0]+w(1)[1])/2,(w(2)[0]+w(2)[1])/2,(w(3)[0]+b.cfX)/2]};
for(const [kind,expected] of Object.entries(axes))PatternResults.build(kind).forEach((p,i)=>assert(Math.abs(p.grain[0].x-p.displayShiftX-expected[i])<1e-7,kind+' uses the wrong horizontal reference'));
