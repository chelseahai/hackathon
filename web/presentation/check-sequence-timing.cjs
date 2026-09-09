const fs=require('fs'),vm=require('vm'),path=require('path');
global.window=global;global.matchMedia=()=>({matches:false});
const repo=path.resolve(__dirname,'..')+'/';
for(const name of ['BasicBlock-Bodice','BasicBlock-Skirt','BasicBlock-Sleeve','BasicBlock-Trousers','GarmentDesign-PrincessLineDress'])vm.runInThisContext(fs.readFileSync(repo+name+'.js','utf8'));
vm.runInThisContext(fs.readFileSync(repo+'presentation/basic-sequences.js','utf8'));
global.document={querySelectorAll:()=>[]};
let source=fs.readFileSync(__dirname+'/drafting-film.js','utf8').replace('  function sequence(root,kind){','  globalThis.layers={body:B,skirt:BasicSequences.skirt.sets,sleeve:BasicSequences.sleeve.sets,trousers:BasicSequences.trousers.sets};\n  function sequence(root,kind){');
vm.runInThisContext(source);
vm.runInThisContext(fs.readFileSync(__dirname+'/sequence-plan.js','utf8'));
vm.runInThisContext(fs.readFileSync(__dirname+'/drafting-notations.js','utf8'));
class Element{
 constructor(tag){this.tag=tag;this.attrs={};this.dataset={};this.style={};this.children=[];}
 setAttribute(k,v){this.attrs[k]=String(v);}getAttribute(k){return this.attrs[k]??null;}
 append(...es){for(const e of es){e.parent=this;this.children.push(e);}}replaceChildren(){this.children=[];}remove(){if(this.parent)this.parent.children=this.parent.children.filter(e=>e!==this);}
 querySelectorAll(selector){return this.targets[selector]||[];}
}
document.createElementNS=(_,tag)=>new Element(tag);
let raf,clock=0;global.requestAnimationFrame=cb=>(raf=cb,1);global.cancelAnimationFrame=()=>{raf=null;};
const assert=(condition,message)=>{if(!condition)throw Error(message);};
let operations=0,frames=0;
for(const [kind,sets] of Object.entries(layers))for(const [index,layer] of sets.entries()){
 const svg=new Element('svg');svg.viewBox={baseVal:{x:-10,y:-60,width:120,height:180}};svg.clientWidth=500;svg.clientHeight=505;
 const lines=layer.lines.map(l=>{const e=new Element('polyline');e.dataset.id=l.id;e.setAttribute('points',l.points.map(p=>`${p.x},${-p.y}`).join(' '));return e;});
 const points=layer.points.map(p=>{const e=new Element('g');e.dataset.pointId=p.id;return e;});
 svg.targets={'.film-line.current':lines,'.film-point.current,.auxiliary-point.current':points};
 const plan=DraftingSequencePlan.build(kind,index,DraftingNotations.data[kind][index],layer);operations+=plan.length;
 for(const line of layer.lines)assert(plan.filter(op=>op.lines.includes(line.id)).length===1,`Missing/duplicate owner ${kind}/${index}/${line.id}`);
 for(const p of layer.points)assert(plan.filter(op=>op.pointIds.includes(p.id)).length===1,`Missing point owner ${p.id}`);
 const player=DraftingNotations.render(svg,kind,index,4500,false,layer),slot=player.duration/plan.length;
 raf(0);
 for(let op=0;op<plan.length;op++)for(const phase of [.05,.3,.6,.7,.95]){
   clock=(op+phase)*slot;raf(clock);frames++;
   for(const e of lines){const owner=Number(e.dataset.revealOperation),expected=clock>(owner+.65)*slot;assert((e.style.visibility==='visible')===expected,`Early/unrelated line ${kind}/${index}/${e.dataset.id} op ${op}`);assert(!/NaN|undefined|Infinity/.test(e.getAttribute('points')),'Invalid geometry');}
   for(const e of points){const owner=Number(e.dataset.revealOperation);assert((e.style.visibility==='visible')===(clock>=(owner+.9)*slot),'Early point');}
 }
 raf(player.duration);assert(lines.every(e=>e.style.visibility==='visible'),'Incomplete ending');
 const state=lines.map(e=>e.getAttribute('points'));player.cancel();assert(lines.every((e,i)=>e.getAttribute('points')===state[i]),'Cancellation resurrected geometry');
}
console.log(JSON.stringify({steps:43,operations,timelineChecks:frames,passed:true}));

