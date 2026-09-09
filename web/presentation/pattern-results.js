/* Clean result plates. All contours and marks come from the drafting engines. */
window.PatternResults=(()=>{
  const V=(x,y)=>({x,y}),NS='http://www.w3.org/2000/svg';
  const close=ps=>[...ps,ps[0]];
  const bounds=ps=>({left:Math.min(...ps.map(p=>p.x)),right:Math.max(...ps.map(p=>p.x)),top:Math.max(...ps.map(p=>p.y)),bottom:Math.min(...ps.map(p=>p.y))});
  // Same vertical grain convention as the drafting/export views. Sleeves use
  // their origin axis, trousers their crease axis; other pieces use mid-width.
  function grain(outline,x){
    const box=bounds(outline);x=x??(box.left+box.right)/2;
    const ring=close(outline),hits=[];
    for(let i=1;i<ring.length;i++){const a=ring[i-1],b=ring[i];if(Math.abs(b.x-a.x)<1e-9)continue;const t=(x-a.x)/(b.x-a.x);if(t>=0&&t<=1)hits.push(a.y+(b.y-a.y)*t);}
    if(hits.length<2)throw Error('No interior grainline');
    const top=Math.max(...hits),bottom=Math.min(...hits),span=top-bottom;
    let inset=Math.min(6,Math.max(4,span*.12));if(inset*2+8>span)inset=span*.18;
    return [V(x,top-inset),V(x,bottom+inset)];
  }
  function build(kind){
    const b=BodyBlock.draftBody({bust:84,backLength:38});let pieces;
    const piece=(name,outline,marks=[],axis)=>({name,outline,marks,grain:grain(outline,axis)});
    if(kind==='body')pieces=[piece('Back bodice',BodyBlock.backOutline(b),[b.notchB]),piece('Front bodice',BodyBlock.frontOutline(b),[b.notchA,b.bp])];
    if(kind==='skirt'){const s=SkirtBlock.draftSkirt({hip:90,waist:68,skirtLength:50});pieces=[piece('Back skirt',SkirtBlock.backOutline(s)),piece('Front skirt',SkirtBlock.frontOutline(s))];}
    if(kind==='sleeve'){const s=SleeveBlock.draftSleeve({frontAh:b.frontArmholeLen,backAh:b.backArmholeLen});pieces=[piece('Sleeve',SleeveBlock.patternOutline(s),[s.peak],0)];}
    if(kind==='trousers'){const t=TrouserBlock.draftTrouser({});pieces=[piece('Front trousers',TrouserBlock.frontOutline(t),t.darts.map(d=>d.apex),t.creaseX),piece('Back trousers',TrouserBlock.backOutline(t),t.backDarts.map(d=>TrouserBlock.mirrorX(d.apex)),-t.creaseX)];}
    if(kind==='dress')pieces=PrincessDress.draftPrincessDress({}).panels.map(p=>piece(p.name,p.outline,p.notches));
    // Separate pieces without altering scale, orientation or local geometry.
    let cursor=0;const gap=8;
    for(const p of pieces){const box=bounds(p.outline),dx=cursor-box.left,dy=-box.top,shift=q=>V(q.x+dx,q.y+dy);p.outline=p.outline.map(shift);p.marks=p.marks.map(shift);p.grain=p.grain.map(shift);p.label=V(cursor+(box.right-box.left)/2,box.bottom-box.top-5);cursor+=box.right-box.left+gap;}
    return pieces;
  }
  function render(svg,kind){
    const pieces=build(kind),box=bounds(pieces.flatMap(p=>[...p.outline,p.label]));
    const font=Math.max(1.45,(box.top-box.bottom)*.022),padding=6;
    svg.setAttribute('viewBox',`${box.left-padding} ${-box.top-padding} ${box.right-box.left+padding*2} ${box.top-box.bottom+padding*2+font}`);
    svg.setAttribute('aria-label',`Finished ${kind==='body'?'bodice':kind} patterns: outlines, unnamed marks, pattern names and grainlines`);
    const node=(tag,attrs={},text)=>{const e=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));if(text)e.textContent=text;return e;};
    const plate=node('g',{class:'result-plate'});svg.append(plate);
    for(const p of pieces){const group=node('g',{'data-pattern':p.name});plate.append(group);
      group.append(node('polyline',{class:'result-outline',points:close(p.outline).map(q=>`${q.x},${-q.y}`).join(' ')}));
      for(const q of p.marks)group.append(node('circle',{class:'result-mark',cx:q.x,cy:-q.y,r:font*.13}));
      const [a,b]=p.grain,head=font*.38;
      group.append(node('path',{class:'result-grain',d:`M${a.x},${-a.y} L${b.x},${-b.y} M${a.x-head},${-a.y+head*1.8} L${a.x},${-a.y} L${a.x+head},${-a.y+head*1.8} M${b.x-head},${-b.y-head*1.8} L${b.x},${-b.y} L${b.x+head},${-b.y-head*1.8}`}));
      group.append(node('text',{class:'result-name',x:p.label.x,y:-p.label.y,'text-anchor':'middle','font-size':font},p.name));
    }
  }
  return {build,render};
})();
