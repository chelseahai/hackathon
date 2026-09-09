/* Dimension annotations only. The block engines remain the geometry authority. */
window.DraftingNotations = (() => {
  const NS='http://www.w3.org/2000/svg', V=(x,y)=>({x,y}), mix=(a,b,t)=>V(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t);
  const distance=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y), fmt=n=>Number(n.toFixed(2));
  const length=ps=>ps.slice(1).reduce((sum,p,i)=>sum+distance(ps[i],p),0);
  const dim=(a,b,label)=>({points:[a,b],label:label||`${fmt(distance(a,b))} cm`});
  const divide=(a,b,fractions,label)=>({points:[a,b],fractions,label});
  const arc=(points,label,fractions)=>({points,label:label||`Arc ${fmt(length(points))} cm`,fractions,curve:true});
  const angle=(o,a,b)=>{let start=Math.atan2(a.y-o.y,a.x-o.x),end=Math.atan2(b.y-o.y,b.x-o.x),delta=end-start;while(delta>Math.PI)delta-=Math.PI*2;while(delta< -Math.PI)delta+=Math.PI*2;return {angle:{o,start,delta},label:`${fmt(Math.abs(delta)*180/Math.PI)}°`};};
  function at(ps,t){const total=length(ps),target=total*t;let sum=0;for(let i=1;i<ps.length;i++){const n=distance(ps[i-1],ps[i]);if(sum+n>=target)return mix(ps[i-1],ps[i],n?(target-sum)/n:0);sum+=n;}return ps.at(-1);}
  function trim(ps,t){const target=length(ps)*t,out=[ps[0]];let sum=0;for(let i=1;i<ps.length;i++){const n=distance(ps[i-1],ps[i]);if(sum+n>=target){out.push(mix(ps[i-1],ps[i],n?(target-sum)/n:0));return out;}out.push(ps[i]);sum+=n;}return out;}
  const b=BodyBlock.draftBody({bust:84,backLength:38}),s=SkirtBlock.draftSkirt({hip:90,waist:68,skirtLength:50}),l=SleeveBlock.draftSleeve({frontAh:b.frontArmholeLen,backAh:b.backArmholeLen}),t=TrouserBlock.draftTrouser({});
  const bp=V(b.backWidthX,b.blY),fp=V(b.chestWidthX,b.blY),nc=V(b.cfX-b.frontNeckWidth,b.topY-b.frontNeckDepth),cm=(b.chestWidthX+b.cfX)/2;
  const body=[
    [dim(V(0,0),V(0,b.topY),'Back length · 38 cm')],
    [dim(V(0,b.topY),V(b.cfX,b.topY),'B / 2 + 5 = 47 cm'),angle(V(0,b.topY),V(b.cfX,b.topY),V(0,0))],
    [dim(V(0,b.topY),V(0,b.blY),'B / 6 + 7 = 21 cm')],
    [dim(V(0,b.blY),bp,'B / 6 + 4.5 = 18.5 cm')],
    [dim(V(b.cfX,b.blY),fp,'B / 6 + 3 = 17 cm')],
    [divide(bp,fp,[.5],'½ width gap → underarm')],
    [dim(b.cbNeck,V(b.backSnp.x,b.topY),'B / 12 = 7 cm'),dim(V(b.backSnp.x,b.topY),b.backSnp,'7 / 3 = 2.33 cm'),arc(b.backNeck,'Horizontal tangent → neckline')],
    [dim(V(b.cfX,b.topY),V(nc.x,b.topY),'7 − 0.2 = 6.8 cm'),dim(V(b.cfX,b.topY),b.cfNeck,'7 + 1 = 8 cm'),angle(nc,V(nc.x+5,nc.y),b.frontNeckOffset),dim(nc,b.frontNeckOffset,'6.8 / 2 − 0.3 = 3.1 cm'),dim(V(b.frontSnp.x,b.topY),b.frontSnp,'Side-neck drop · 0.5 cm')],
    [dim(V(b.backWidthX,b.topY),V(b.backWidthX,b.backShoulder.y),'Neck height · 2.33 cm'),dim(V(b.backWidthX,b.backShoulder.y),b.backShoulder,'Outward · 2 cm')],
    [dim(V(b.chestWidthX,b.topY),V(b.chestWidthX,b.frontShoulder.y),'2 × neck height = 4.67 cm'),dim(b.frontSnp,b.frontShoulder,`Back shoulder − 1.8 = ${fmt(distance(b.frontSnp,b.frontShoulder))} cm`)],
    [divide(V(b.backWidthX,b.topY),bp,[.5],'½ armhole depth = 10.5 cm'),angle(bp,V(bp.x+4,bp.y),b.backAhBisector),dim(bp,b.backAhBisector,'5.75 / 2 + 0.5 = 3.375 cm')],
    [divide(V(b.chestWidthX,b.topY),fp,[.5],'½ armhole depth = 10.5 cm'),angle(fp,V(fp.x-4,fp.y),b.frontAhBisector),dim(fp,b.frontAhBisector,'5.75 / 2 = 2.875 cm')],
    [dim(V(b.sideX,0),b.sideWaist,'Toward centre back · 2 cm')],
    [divide(fp,V(b.cfX,b.blY),[.5],'½ chest width'),dim(V(cm,b.blY),V(b.bp.x,b.blY),'Toward armhole · 0.7 cm'),dim(V(b.bp.x,b.blY),b.bp,'Below bust line · 4 cm')],
    [dim(V(b.cfX,0),b.cfHem,'6.8 / 2 = 3.4 cm'),dim(b.cfHem,b.hemAtBp,'Horizontal projection → BP')],
    [arc(trim(b.backArmhole,Math.min(1,.5+3/b.backArmholeLen)),`Back arc / 2 + 3 = ${fmt(Math.min(b.backArmholeLen,b.backArmholeLen/2+3))} cm`,[b.backArmholeLen/2/Math.min(b.backArmholeLen,b.backArmholeLen/2+3)]),arc(trim([...b.frontArmhole].reverse(),Math.min(1,.5+3/b.frontArmholeLen)),`Front arc / 2 + 3 = ${fmt(Math.min(b.frontArmholeLen,b.frontArmholeLen/2+3))} cm`,[b.frontArmholeLen/2/Math.min(b.frontArmholeLen,b.frontArmholeLen/2+3)])]
  ];
  const skirt=[
    [dim(V(0,0),V(s.cfX,0),'H / 2 + 2 = 47 cm'),dim(V(0,0),s.cbHem,'Length · 50 cm')],
    [dim(V(0,0),V(0,s.hlY),'Hip depth · 18 cm'),divide(V(0,0),V(s.cfX,0),[.5],'½ width = 23.5 cm'),dim(V(s.cfX/2,0),V(s.sideX,0),'Side shift · 1 cm')],
    [dim(V(0,0),s.backWaistMark,'W / 4 − 1 + 0.5 = 16.5 cm'),dim(s.cfWaist,s.frontWaistMark,'W / 4 + 1 + 0.5 = 18.5 cm')],
    [dim(V(s.sideX,0),V(s.backSideWaist.x,0),'Back takeout · 6 / 3 = 2 cm'),dim(V(s.sideX,0),V(s.frontSideWaist.x,0),'Front takeout · 6 / 3 = 2 cm'),dim(V(s.backSideWaist.x,0),s.backSideWaist,'Side rise · 0.7 cm'),dim(V(0,0),s.cbWaist,'Centre-back drop · 1 cm')],
    [divide(s.cbWaist,V(s.backSideWaist.x,s.cbWaist.y),[1/3],'Back · ⅓ horizontal span, then blend'),divide(s.cfWaist,V(s.frontSideWaist.x,s.cfWaist.y),[2/3],'Front · ⅔ horizontal span, then blend')],
    [divide(s.hip,V(s.sideX,0),[1/3],'⅓ hip depth = 6 cm above HL'),arc(s.backSide,'Back side → hip → hem'),arc(s.frontSide,'Front side → hip → hem')],
    [dim(s.cbHem,s.sideHem,`Back hem · ${fmt(distance(s.cbHem,s.sideHem))} cm`),dim(s.sideHem,s.cfHem,`Front hem · ${fmt(distance(s.sideHem,s.cfHem))} cm`)]
  ];
  const locator=.5+2.5/(b.backArmholeLen+1);
  const sleeve=[
    [dim(V(0,0),l.peak,`AH / 3 − 1 = ${fmt(l.capHeight)} cm`)],
    [dim(l.peak,l.frontUnderarm,`Front AH = ${fmt(b.frontArmholeLen)} cm`),dim(l.peak,l.backUnderarm,`Back AH + 1 = ${fmt(b.backArmholeLen+1)} cm`),angle(V(0,0),l.peak,l.frontUnderarm)],
    [dim(l.peak,V(0,l.cuffY),'Sleeve length · 52 cm'),dim(l.peak,V(0,l.elbowY),'52 / 2 + 2.5 = 28.5 cm')],
    [divide(l.peak,l.frontUnderarm,[.25,.5,.75],'Divide the front diagonal into quarters'),dim(mix(l.peak,l.frontUnderarm,.25),l.frontOffsetUpper,'¼ point · 1.8 cm outward'),dim(mix(l.peak,l.frontUnderarm,.75),l.frontOffsetLower,'¾ point · 1.5 cm inward'),angle(mix(l.peak,l.frontUnderarm,.25),l.peak,l.frontOffsetUpper)],
    [divide(l.peak,l.backUnderarm,[.25,.5],'Back diagonal · ¼ and ½'),dim(mix(l.peak,l.backUnderarm,.5),l.backLocator,'Past midpoint · 2.5 cm'),dim(mix(l.peak,l.backUnderarm,.25),l.backOffsetUpper,'¼ point · 1.5 cm outward'),dim(mix(l.peak,l.backUnderarm,(locator+1)/2),l.backOffsetLower,'Lower midpoint · 0.5 cm inward')],
    [arc(l.backCap,`Back cap · ${fmt(length(l.backCap))} cm`),arc(l.frontCap,`Front cap · ${fmt(length(l.frontCap))} cm`)],
    [dim(l.frontUnderarm,l.frontCuff,`52 − cap height = ${fmt(distance(l.frontUnderarm,l.frontCuff))} cm`),dim(l.backUnderarm,l.backCuff,`Back seam · ${fmt(distance(l.backUnderarm,l.backCuff))} cm`)],
    [divide(l.backCuff,V(0,l.cuffY),[.5],'½ back cuff width'),dim(V(l.cuffBackMid.x,l.cuffY),l.cuffBackMid,'Back drop · 1 cm'),dim(V(0,l.cuffY),l.cuffCenter,'Centre drop · 0.3 cm'),dim(V(l.cuffFrontMid.x,l.cuffY),l.cuffFrontMid,'Front rise · 0.5 cm')]
  ];
  const sh=p=>V(p.x+39,p.y),backDim=(a,b,label)=>dim(sh(a),sh(b),label),backArc=(ps,label)=>arc(ps.map(sh),label);
  const trousers=[
    [dim(V(0,0),V(t.frontHip,0),'H / 4 + 1.5 = 24 cm'),dim(V(0,0),V(0,t.clY),'Rise · 26 cm'),dim(V(0,0),V(0,t.hemY),'Length · 98 cm')],
    [dim(V(0,t.clY),t.point4,'Side indent · 0.5 cm'),dim(t.crotchCorner,t.point5,'24 / 4 − 1 = 5 cm')],
    [divide(t.point4,t.point5,[.5],'½ crotch span → crease'),dim(V(t.creaseX,(t.clY+t.hemY)/2),V(t.creaseX,t.klY),'Knee raised · 4 cm'),divide(t.hemSide,t.hemInseam,[.5],'Hem · 19 / 2 = 9.5 cm each side')],
    [divide(V(t.cfBoxX,0),t.crotchCorner,[1/3,2/3],'Rise thirds · 26 / 3 = 8.67 cm'),dim(V(t.cfBoxX,0),t.cfWaist,'Centre-front inset · 0.7 cm')],
    [angle(t.crotchCorner,V(t.cfBoxX+4,t.clY),t.bisectorHit),divide(t.crotchCorner,t.bisectorHit,[1/3,2/3],'Use the second third → curve control'),arc(t.crotch,'Vertical tangent → horizontal tangent')],
    [dim(t.cfWaist,t.sideWaist,'Waist horizontal allocation · 22 cm',),dim(t.dartCfLeft,t.dartCfRight,'Dart width · 2.5 cm'),dim(t.dartCfMid,t.dartCfApex,'First dart depth · 11 cm'),dim(t.dartSideMid,t.dartSideApex,'Second dart depth · 10 cm')],
    [arc(t.side,'Side contour · 0.2 cm hollow'),arc(t.inseam,'Inseam contour · 0.3 cm hollow'),dim(V(t.creaseX,t.hemY),t.hemMid,'Hem lift · 0.5 cm')],
    [backDim(t.backBase,t.backCrotchOnCl,'5 + 4 = 9 cm'),backDim(t.backCrotchOnCl,t.backCrotchTip,'Back crotch drop · 1 cm'),backDim(V(t.cfBoxX,0),t.backCbMark,'Centre-back inset · 5 cm'),backDim(t.backCbMark,t.backCbWaist,'Rise extension · 1.5 cm')],
    [backDim(t.backCbHl,t.backHlSide,'H / 4 + 1.5 = 24 cm'),backDim(t.backCbWaist,t.backSideWaist,'W / 4 + 3 = 20 cm'),backDim(t.kneeSide,t.backKneeSide,'Back leg addition · 1 cm')],
    [backDim(t.crotchThirds[2],t.backCrotchCtrl,'Control inset · 0.7 cm'),backArc(t.backCrotch,'Sloping rise tangent → horizontal tip')],
    [divide(sh(t.backCbWaist),sh(t.backSideWaist),[.5],'½ waist → dart centre'),backDim(t.backDartLeft,t.backDartRight,'Back dart width · 3 cm'),backDim(t.backDartMid,t.backDartApex,'Perpendicular dart depth · 12 cm')],
    [backDim(mix(t.backCrotchTip,t.backKneeInseam,1/3),t.backInseamUpper,'⅓ upper inseam · 1.3 cm inward'),backDim(mix(t.backCrotchTip,t.backKneeInseam,2/3),t.backInseamLower,'⅔ upper inseam · 1 cm inward'),backDim(V(t.creaseX,t.hemY),t.backHemMid,'Back hem drop · 0.5 cm')]
  ];
  // Waist allowance is a horizontal allocation, not the sloping seam length.
  trousers[5][0]=dim(V(t.cfWaist.x,t.sideWaist.y),t.sideWaist,'W / 4 + 2 × 2.5 = 22 cm');
  const data={body,skirt,sleeve,trousers,dress:DressSequence.notations};
  const node=(tag,attrs={},text)=>{const e=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;return e;};
  function render(svg,kind,index,tempo,reduced,layer){
    const specs=DraftingSequencePlan.build(kind,index,data[kind][index],layer),vb=svg.viewBox.baseVal,unit=Math.max(vb.width/(svg.clientWidth||500),vb.height/(svg.clientHeight||505));
    const group=node('g',{class:'draft-notations','aria-label':'Current drafting dimensions'});svg.append(group);
    const outlines=[...svg.querySelectorAll('.film-line.current')].map(e=>({e,original:e.getAttribute('points'),points:e.getAttribute('points').split(' ').map(pair=>{const [x,y]=pair.split(',').map(Number);return V(x,-y);})}));
    const slot=Math.max(2400,tempo/Math.max(1,data[kind][index].length)),duration=slot*specs.length;
    const points=[...svg.querySelectorAll('.film-point.current,.auxiliary-point.current')];
    const lineOperation=new Map(specs.flatMap((op,i)=>op.lines.map(id=>[id,i])));
    const pointOperation=new Map(specs.flatMap((op,i)=>op.pointIds.map(id=>[id,i])));
    let completeCallback=null,completionSent=false;
    for(const {e} of outlines)e.style.visibility='hidden';
    for(const e of points)e.style.visibility='hidden';
    let frame,elapsed=0,last=null,paused=false,current=-1,draw;
    function setup(spec){
      group.replaceChildren();const pts=spec.angle?Array.from({length:33},(_,i)=>{const a=spec.angle.start+spec.angle.delta*i/32,r=19*unit;return V(spec.angle.o.x+Math.cos(a)*r,spec.angle.o.y+Math.sin(a)*r);}):spec.points;
      const mid=at(pts,.5),start=pts[0],end=pts.at(-1),len=distance(start,end)||1;
      let nx=-(end.y-start.y)/len,ny=(end.x-start.x)/len;
      const center=V(vb.x+vb.width/2,-vb.y-vb.height/2);if(nx*(mid.x-center.x)+ny*(mid.y-center.y)<0){nx=-nx;ny=-ny;}
      const offset=spec.angle?0:12*unit,shift=p=>V(p.x+nx*offset,p.y+ny*offset),route=pts.map(shift);
      const poly=node('polyline',{class:'notation-route',fill:'none'});group.append(poly);
      if(spec.angle){[pts[0],pts.at(-1)].forEach(p=>group.append(node('line',{class:'notation-extension',x1:spec.angle.o.x,y1:-spec.angle.o.y,x2:p.x,y2:-p.y})));}
      if(spec.curve&&/tangent/i.test(spec.label)){
        [[pts[0],pts[1]],[pts.at(-1),pts.at(-2)]].forEach(([p,q])=>{const n=distance(p,q)||1,dx=(q.x-p.x)/n*15*unit,dy=(q.y-p.y)/n*15*unit;group.append(node('line',{class:'notation-tangent',x1:p.x-dx,y1:-p.y+dy,x2:p.x+dx,y2:-p.y-dy}));});
      }
      if(!spec.angle){[start,end].forEach(p=>{const q=shift(p);group.append(node('line',{class:'notation-extension',x1:p.x,y1:-p.y,x2:q.x+nx*4*unit,y2:-q.y-ny*4*unit}));});}
      const dot=node('circle',{r:2.4*unit,class:'notation-marker'});group.append(dot);
      const ticks=[];for(const f of [0,...(spec.fractions||[]),1]){const q=at(route,f),prev=at(route,Math.max(0,f-.01)),next=at(route,Math.min(1,f+.01)),d=distance(prev,next)||1,tx=-(next.y-prev.y)/d,ty=(next.x-prev.x)/d;const tick=node('line',{class:'notation-tick',x1:q.x-tx*3*unit,y1:-q.y+ty*3*unit,x2:q.x+tx*3*unit,y2:-q.y-ty*3*unit});group.append(tick);let label;if(f>0&&f<1){const fraction=spec.curve?'½ arc':({[.25]:'¼',[.5]:'½',[.75]:'¾',[1/3]:'⅓',[2/3]:'⅔'}[f]||fmt(f));label=node('text',{class:'notation-fraction',x:q.x+nx*10*unit,y:-q.y-ny*10*unit,'text-anchor':'middle','font-size':10*unit},fraction);group.append(label);}ticks.push({f,tick,label});}
      // Keep the label just outside the dimension; clamp it inside the SVG frame.
      const textWidth=Math.min(vb.width-12*unit,spec.label.length*5.7*unit),tx=Math.max(vb.x+textWidth/2+unit,Math.min(vb.x+vb.width-textWidth/2-unit,mid.x+nx*29*unit)),ty=Math.max(vb.y+9*unit,Math.min(vb.y+vb.height-9*unit,-mid.y-ny*29*unit));
      group.append(node('line',{class:'notation-extension',x1:at(route,.5).x,y1:-at(route,.5).y,x2:tx,y2:ty}));
      const text=node('text',{class:'notation-label',x:tx,y:ty,'text-anchor':'middle','dominant-baseline':'middle','font-size':11*unit},spec.label);group.append(text);
      draw=progress=>{const eased=1-Math.pow(1-progress,3),part=trim(route,eased),q=part.at(-1);poly.setAttribute('points',part.map(p=>`${p.x},${-p.y}`).join(' '));dot.setAttribute('cx',q.x);dot.setAttribute('cy',-q.y);ticks.forEach(({f,tick,label})=>{tick.style.opacity=eased>=f?1:0;if(label)label.style.opacity=eased>=f?1:0;});text.style.opacity=1;};
    }
    function paint(){
      const i=Math.min(specs.length-1,Math.floor(elapsed/slot));
      if(i!==current){current=i;setup(specs[i]);group.dataset.operation=String(i);group.dataset.targets=specs[i].lines.join(' ');}
      const local=elapsed-i*slot;
      draw(reduced?1:Math.max(0,Math.min(1,(local-slot*.12)/(slot*.43))));
      group.dataset.phase=local<slot*.12?'explain':local<slot*.65?'measure':'construct';
      for(const {e,points:route} of outlines){
        const owner=lineOperation.get(e.dataset.id);
        const progress=reduced?1:Math.max(0,Math.min(1,(elapsed-owner*slot-slot*.65)/(slot*.25)));
        e.style.visibility=progress>0?'visible':'hidden';e.dataset.constructionState=progress>=1?'complete':'drafting';e.dataset.revealOperation=String(owner);
        e.setAttribute('points',trim(route,progress).map(p=>`${p.x},${-p.y}`).join(' '));
      }
      for(const e of points){const owner=e.dataset.pointId?pointOperation.get(e.dataset.pointId):lineOperation.get(e.dataset.lineId);e.dataset.revealOperation=String(owner);e.style.visibility=reduced||elapsed>=(owner+.9)*slot?'visible':'hidden';}
    }
    function finish(){if(elapsed>=duration&&!completionSent&&completeCallback){completionSent=true;queueMicrotask(()=>completeCallback?.());}}
    function tick(now){if(last!==null&&!paused)elapsed+=now-last;last=now;paint();if(elapsed<duration&&!paused)frame=requestAnimationFrame(tick);else finish();}
    paint();if(reduced){elapsed=duration;paint();}else frame=requestAnimationFrame(tick);
    return {duration,
      onComplete(callback){completeCallback=callback;if(!callback)completionSent=false;else finish();},
      pause(value){if(paused===value)return;paused=value;cancelAnimationFrame(frame);last=null;if(!paused&&elapsed<duration&&!reduced)frame=requestAnimationFrame(tick);},
      cancel(){completeCallback=null;cancelAnimationFrame(frame);group.remove();}
    };
  }
  return {data,render};
})();
