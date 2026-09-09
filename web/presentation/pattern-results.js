/* Clean result plates. All contours and marks come from the drafting engines. */
window.PatternResults=(()=>{
  const V=(x,y)=>({x,y}),NS='http://www.w3.org/2000/svg';
  const close=ps=>[...ps,ps[0]];
  const bounds=ps=>({left:Math.min(...ps.map(p=>p.x)),right:Math.max(...ps.map(p=>p.x)),top:Math.max(...ps.map(p=>p.y)),bottom:Math.min(...ps.map(p=>p.y))});
  function inside(q,outline){let yes=false;for(let i=0,j=outline.length-1;i<outline.length;j=i++){const a=outline[i],b=outline[j];if((a.y>q.y)!==(b.y>q.y)&&q.x<(b.x-a.x)*(q.y-a.y)/(b.y-a.y)+a.x)yes=!yes;}return yes;}
  function spans(outline,y){const hits=[],ring=close(outline);for(let i=1;i<ring.length;i++){const a=ring[i-1],b=ring[i];if((a.y>y)===(b.y>y))continue;hits.push(a.x+(b.x-a.x)*(y-a.y)/(b.y-a.y));}hits.sort((a,b)=>a-b);return hits.reduce((out,x,i)=>{if(i%2===0&&hits[i+1]!==undefined)out.push([x,hits[i+1]]);return out;},[]);}
  // Search the narrowest usable cross-section. A tip of zero width cannot hold
  // a grainline: require the entire short vertical line to remain inside.
  function grain(outline,length,ceiling=Infinity){const box=bounds(outline);box.top=Math.min(box.top,ceiling);let best;
    for(let i=0;i<=240;i++){const y=box.bottom+length/2+1+(box.top-box.bottom-length-2)*i/240;
      for(const [left,right] of spans(outline,y)){const x=(left+right)/2,width=right-left;
        if(width<2||best&&width>=best.width)continue;
        if(Array.from({length:25},(_,j)=>V(x,y-length/2+length*j/24)).every(q=>inside(q,outline))){best={x,y,width};}
      }
    }
    if(!best)throw Error('No interior grainline');
    return [V(best.x,best.y+length/2),V(best.x,best.y-length/2)];
  }
  function dash(q,outline){const ring=close(outline);let edge,nearest=Infinity;
    for(let i=1;i<ring.length;i++){const a=ring[i-1],b=ring[i],dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy;if(!den)continue;const t=Math.max(0,Math.min(1,((q.x-a.x)*dx+(q.y-a.y)*dy)/den)),hit=V(a.x+dx*t,a.y+dy*t),dist=Math.hypot(q.x-hit.x,q.y-hit.y);if(dist<nearest){nearest=dist;edge={hit,dx,dy};}}
    const start=nearest<.05?edge.hit:q,base=Math.atan2(edge.dx,-edge.dy);
    for(const offset of [0,Math.PI,Math.PI/4,-Math.PI/4,3*Math.PI/4,-3*Math.PI/4,Math.PI/2,-Math.PI/2]){const a=base+offset,end=V(start.x+.65*Math.cos(a),start.y+.65*Math.sin(a));if([.1,.5,1].every(t=>inside(V(start.x+(end.x-start.x)*t,start.y+(end.y-start.y)*t),outline)))return [start,end];}
    throw Error('No inward mark direction');
  }
  function build(kind){
    const b=BodyBlock.draftBody({bust:84,backLength:38});let pieces;
    const piece=(name,outline,marks=[])=>({name,outline,marks});
    if(kind==='body')pieces=[piece('Back bodice',BodyBlock.backOutline(b),[b.notchB]),piece('Front bodice',BodyBlock.frontOutline(b),[b.notchA,b.bp])];
    if(kind==='skirt'){const s=SkirtBlock.draftSkirt({hip:90,waist:68,skirtLength:50});pieces=[piece('Back skirt',SkirtBlock.backOutline(s)),piece('Front skirt',SkirtBlock.frontOutline(s))];}
    if(kind==='sleeve'){const s=SleeveBlock.draftSleeve({frontAh:b.frontArmholeLen,backAh:b.backArmholeLen});pieces=[piece('Sleeve',SleeveBlock.patternOutline(s),[s.peak],0)];}
    if(kind==='trousers'){const t=TrouserBlock.draftTrouser({});pieces=[piece('Front trousers',TrouserBlock.frontOutline(t),t.darts.map(d=>d.apex),t.creaseX),piece('Back trousers',TrouserBlock.backOutline(t),t.backDarts.map(d=>TrouserBlock.mirrorX(d.apex)),-t.creaseX)];}
    if(kind==='dress')pieces=PrincessDress.draftPrincessDress({}).panels.map(p=>piece(p.name,p.outline,p.notches));
    const grainLength=Math.min(12,...pieces.map(p=>(bounds(p.outline).top-bounds(p.outline).bottom)*.2));
    // Exclude neckline/armhole tips and sleeve caps: center the line in the
    // usable body of the piece, rather than a narrow shoulder sliver.
    const ceiling=kind==='dress'||kind==='body'?b.blY:kind==='sleeve'?0:Infinity;
    pieces.forEach(p=>{p.grain=grain(p.outline,grainLength,ceiling);p.dashes=p.marks.map(q=>dash(q,p.outline));});
    // Separate pieces without altering scale, orientation or local geometry.
    let cursor=0;const gap=8;
    for(const p of pieces){const box=bounds(p.outline),dx=cursor-box.left,dy=-box.top,shift=q=>V(q.x+dx,q.y+dy);p.outline=p.outline.map(shift);p.marks=p.marks.map(shift);p.grain=p.grain.map(shift);p.dashes=p.dashes.map(ps=>ps.map(shift));p.label=V(cursor+(box.right-box.left)/2,box.bottom-box.top-5);cursor+=box.right-box.left+gap;}
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
