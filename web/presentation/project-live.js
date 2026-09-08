/* Reuse the actual project engines; this file only renders and controls them. */
(() => {
  'use strict';
  const NS='http://www.w3.org/2000/svg';
  function el(tag,attrs={},text){const e=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));if(text!==undefined)e.textContent=text;return e;}
  function drawing(host,lines,labels=[]){
    const pts=lines.flatMap(l=>l.points);
    if(!pts.length || pts.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))throw new Error('This combination cannot be drawn.');
    const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y),x=Math.min(...xs)-4,y=-Math.max(...ys)-4,w=Math.max(...xs)-x+4,h=Math.max(...ys)-Math.min(...ys)+10;
    const svg=el('svg',{viewBox:`${x} ${y} ${w} ${h}`,role:'img','aria-label':host.id==='live-bodice'?'Calculated basic bodice construction':'Calculated princess dress pattern','class':'live-pattern'});
    lines.forEach(line=>svg.append(el('polyline',{points:line.points.map(p=>`${p.x},${-p.y}`).join(' '),class:line.guide?'live-guide':'live-stitch'})));
    labels.forEach(label=>svg.append(el('text',{x:label.x,y:-label.y,class:'live-label'},label.text)));
    host.replaceChildren(svg);
  }
  const controls=[...document.querySelectorAll('[data-dress-param]')],shares={reference:[3/16,4/16,4/16,5/16],princess:[0,.5,0,.5],side:[.5,0,.5,0],equal:[.25,.25,.25,.25]};
  function renderDress(){
    const error=document.querySelector('#dress-error'),host=document.querySelector('#live-dress'),summary=document.querySelector('#dress-summary');
    try{
      const params=Object.fromEntries(controls.map(input=>[input.dataset.dressParam,Number(input.value)]));
      controls.forEach(input=>document.querySelector('#out-'+input.dataset.dressParam).textContent=Number(input.value).toFixed(1)+' cm');
      params.hemDistribution=shares[document.querySelector('#live-distribution').value];params.seamAllowance=0;
      const draft=PrincessDress.draftPrincessDress(params);if(draft.error)throw new Error(draft.error);
      const panels=PrincessDress.laidOutPanels(draft,0);
      drawing(host,panels.map(panel=>({points:PrincessDress.closeRing(panel.outline)})),panels.map(panel=>({x:panel.outline.reduce((n,p)=>n+p.x,0)/panel.outline.length,y:Math.min(...panel.outline.map(p=>p.y))-2,text:panel.name})));
      error.hidden=true;error.textContent='';summary.textContent=`Garment waist ${(2*(draft.backWaist+draft.frontWaist)).toFixed(1)} cm · garment hip ${(2*(draft.backHip+draft.frontHip)).toFixed(1)} cm · four calculated panels`;
    }catch(e){host.replaceChildren();error.textContent=e.message;error.hidden=false;summary.textContent='Unsupported combination. Adjust measurements or ease to continue.';}
  }
  let pending=false;function requestRender(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;renderDress();});}
  controls.forEach(input=>input.addEventListener('input',requestRender));document.querySelector('#live-distribution').addEventListener('change',requestRender);
  document.querySelector('#live-reset').addEventListener('click',()=>{controls.forEach(input=>input.value=input.defaultValue);document.querySelector('#live-distribution').value='reference';renderDress();});renderDress();
})();
