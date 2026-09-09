/* Clean result plates. All contours and marks come from the drafting engines. */
window.PatternResults=(()=>{
  const V=(x,y)=>({x,y}),NS='http://www.w3.org/2000/svg';
  const close=ps=>[...ps,ps[0]];
  const bounds=ps=>({left:Math.min(...ps.map(p=>p.x)),right:Math.max(...ps.map(p=>p.x)),top:Math.max(...ps.map(p=>p.y)),bottom:Math.min(...ps.map(p=>p.y))});
  function inside(q,outline){let yes=false;for(let i=0,j=outline.length-1;i<outline.length;j=i++){const a=outline[i],b=outline[j];if((a.y>q.y)!==(b.y>q.y)&&q.x<(b.x-a.x)*(q.y-a.y)/(b.y-a.y)+a.x)yes=!yes;}return yes;}
  function spans(outline,y){const hits=[],ring=close(outline);for(let i=1;i<ring.length;i++){const a=ring[i-1],b=ring[i];if((a.y>y)===(b.y>y))continue;hits.push(a.x+(b.x-a.x)*(y-a.y)/(b.y-a.y));}hits.sort((a,b)=>a-b);return hits.reduce((out,x,i)=>{if(i%2===0&&hits[i+1]!==undefined)out.push([x,hits[i+1]]);return out;},[]);}
  // Category placement and shared set alignment: see /GRAINLINE-RULES.md.
  function widthCenter(outline,y){const sections=spans(outline,y);if(sections.length!==1)throw Error('Expected one pattern width at the reference level');return (sections[0][0]+sections[0][1])/2;}
  function dash(q,outline){const ring=close(outline);let edge,nearest=Infinity;
    for(let i=1;i<ring.length;i++){const a=ring[i-1],b=ring[i],dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy;if(!den)continue;const t=Math.max(0,Math.min(1,((q.x-a.x)*dx+(q.y-a.y)*dy)/den)),hit=V(a.x+dx*t,a.y+dy*t),dist=Math.hypot(q.x-hit.x,q.y-hit.y);if(dist<nearest){nearest=dist;edge={hit,dx,dy};}}
    const start=nearest<.05?edge.hit:q,base=Math.atan2(edge.dx,-edge.dy);
    for(const offset of [0,Math.PI,Math.PI/4,-Math.PI/4,3*Math.PI/4,-3*Math.PI/4,Math.PI/2,-Math.PI/2]){const a=base+offset,end=V(start.x+.65*Math.cos(a),start.y+.65*Math.sin(a));if([.1,.5,1].every(t=>inside(V(start.x+(end.x-start.x)*t,start.y+(end.y-start.y)*t),outline)))return [start,end];}
    throw Error('No inward mark direction');
  }
  function build(kind){
    const b=BodyBlock.draftBody({bust:84,backLength:38});let pieces;
    const piece=(name,outline,marks=[],grainX,reference=false)=>({name,outline,marks,grainX,reference});
    if(kind==='body')pieces=[piece('Back bodice',BodyBlock.backOutline(b),[b.notchB],widthCenter(BodyBlock.backOutline(b),b.blY)),piece('Front bodice',BodyBlock.frontOutline(b),[b.notchA,b.bp],widthCenter(BodyBlock.frontOutline(b),b.blY),true)];
    if(kind==='skirt'){const s=SkirtBlock.draftSkirt({hip:90,waist:68,skirtLength:50});pieces=[piece('Back skirt',SkirtBlock.backOutline(s),[],(s.cbWaist.x+s.backSideWaist.x)/2),piece('Front skirt',SkirtBlock.frontOutline(s),[],(s.cfWaist.x+s.frontSideWaist.x)/2,true)];}
    if(kind==='sleeve'){const s=SleeveBlock.draftSleeve({frontAh:b.frontArmholeLen,backAh:b.backArmholeLen});pieces=[piece('Sleeve',SleeveBlock.patternOutline(s),[s.peak],(s.frontCuff.x+s.backCuff.x)/2,true)];}
    if(kind==='trousers'){const t=TrouserBlock.draftTrouser({});pieces=[piece('Front trousers',TrouserBlock.frontOutline(t),t.darts.map(d=>d.apex),(t.hemSide.x+t.hemInseam.x)/2,true),piece('Back trousers',TrouserBlock.backOutline(t),t.backDarts.map(d=>TrouserBlock.mirrorX(d.apex)),-(t.backHemSide.x+t.backHemInseam.x)/2)];}
    if(kind==='dress')pieces=PrincessDress.draftPrincessDress({}).panels.map((p,i)=>piece(p.name,p.outline,p.notches,widthCenter(p.outline,0),i===3));
    const reference=pieces.find(p=>p.reference)||pieces[0],referenceBounds=bounds(reference.outline),centerY=(referenceBounds.top+referenceBounds.bottom)/2;
    let grainLength=Math.min(12,...pieces.map(p=>(bounds(p.outline).top-bounds(p.outline).bottom)*.2));
    const fits=length=>pieces.every(p=>Array.from({length:49},(_,i)=>V(p.grainX,centerY-length/2+length*i/48)).every(q=>inside(q,p.outline)));
    if(!fits(0))throw Error('Category grain axis is outside the piece at the shared reference level');
    while(!fits(grainLength)&&grainLength>.5)grainLength*=.9;
    if(!fits(grainLength))throw Error('No usable shared grainline length');
    pieces.forEach(p=>{p.grain=[V(p.grainX,centerY+grainLength/2),V(p.grainX,centerY-grainLength/2)];p.dashes=p.marks.map(q=>dash(q,p.outline));});
    // Separate pieces without altering scale, orientation or local geometry.
    let cursor=0;const gap=8;
    for(const p of pieces){const box=bounds(p.outline),dx=cursor-box.left,shift=q=>V(q.x+dx,q.y);p.displayShiftX=dx;p.draftedOutline=p.outline;p.outline=p.outline.map(shift);p.marks=p.marks.map(shift);p.grain=p.grain.map(shift);p.dashes=p.dashes.map(ps=>ps.map(shift));p.label=V(cursor+(box.right-box.left)/2,box.bottom-5);cursor+=box.right-box.left+gap;}
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
      for(const [a,b] of p.dashes)group.append(node('line',{class:'result-mark',x1:a.x,y1:-a.y,x2:b.x,y2:-b.y}));
      const [a,b]=p.grain;
      group.append(node('line',{class:'result-grain',x1:a.x,y1:-a.y,x2:b.x,y2:-b.y}));
      group.append(node('text',{class:'result-name',x:p.label.x,y:-p.label.y,'text-anchor':'middle','font-size':font},p.name));
    }
  }
  return {build,render,inside};
})();
