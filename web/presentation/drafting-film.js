/* Animated explanatory layers from the existing engines. No pattern rules are mutated. */
(() => {
  'use strict';
  const NS='http://www.w3.org/2000/svg', V=(x,y)=>({x,y});
  const body=BodyBlock.draftBody({bust:84,backLength:38});
  const skirt=SkirtBlock.draftSkirt({hip:90,waist:68,skirtLength:50});
  const dress=PrincessDress.draftPrincessDress({});
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  function node(tag,attrs={},text){const e=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));if(text!==undefined)e.textContent=text;return e;}
  function layer(){return {lines:[],points:[]};}
  function line(l,id,points,guide=false){l.lines.push({id,points,guide});}
  function point(l,id,p,label=id){l.points.push({id,p,label});}
  const B=Array.from({length:16},layer),d=body,p=d.params;
  const box=(x1,y1,x2,y2)=>[V(x1,y1),V(x2,y1),V(x2,y2),V(x1,y2),V(x1,y1)];
  line(B[0],'back-length',[V(0,0),V(0,d.topY)],true);point(B[0],'O',V(0,0));point(B[0],'T',V(0,d.topY));
  line(B[1],'frame',box(0,0,d.cfX,d.topY),true);point(B[1],'CF',V(d.cfX,0));
  line(B[2],'bust-level',[V(0,d.blY),V(d.cfX,d.blY)],true);point(B[2],'BL',V(0,d.blY));
  line(B[3],'back-width',[V(d.backWidthX,d.blY),V(d.backWidthX,d.topY)],true);point(B[3],'BW',V(d.backWidthX,d.blY));
  line(B[4],'chest-width',[V(d.chestWidthX,d.blY),V(d.chestWidthX,d.topY)],true);point(B[4],'CW',V(d.chestWidthX,d.blY));
  line(B[5],'side-mid',[V(d.sideX,d.blY),V(d.sideX,0)],true);point(B[5],'UA',d.underarm);
  line(B[6],'back-neck-box',box(0,d.topY,d.backNeckWidth,d.backSnp.y),true);line(B[6],'back-neck',d.backNeck);point(B[6],'B-SNP',d.backSnp);
  const nc=V(d.cfX-d.frontNeckWidth,d.topY-d.frontNeckDepth);
  line(B[7],'front-neck-box',box(nc.x,nc.y,d.cfX,d.topY),true);line(B[7],'neck-bisector',[nc,d.frontNeckOffset],true);line(B[7],'neck-width-mid',[V(nc.x+d.frontNeckWidth/2,nc.y),V(nc.x+d.frontNeckWidth/2,d.topY)],true);line(B[7],'front-neck',d.frontNeck);point(B[7],'F-SNP',d.frontSnp);point(B[7],'N45',d.frontNeckOffset);point(B[7],'F-N',d.cfNeck);
  line(B[8],'back-shoulder-guide',[V(d.backWidthX,d.topY),V(d.backWidthX,d.backShoulder.y),d.backShoulder],true);line(B[8],'back-shoulder',[d.backSnp,d.backShoulder]);point(B[8],'B-SH',d.backShoulder);
  line(B[9],'front-shoulder-guide',[V(d.chestWidthX,d.topY),V(d.chestWidthX,d.frontShoulder.y),d.frontShoulder],true);line(B[9],'front-shoulder',[d.frontSnp,d.frontShoulder]);point(B[9],'F-SH',d.frontShoulder);
  const mid=d.topY-d.armholeDepth/2,bc=V(d.backWidthX,d.blY),fc=V(d.chestWidthX,d.blY);
  line(B[10],'back-half-depth',[V(d.backWidthX,mid),V(d.sideX,mid)],true);line(B[10],'back-half-width',[V((d.backWidthX+d.sideX)/2,d.blY),V((d.backWidthX+d.sideX)/2,mid)],true);line(B[10],'back-45',[bc,d.backAhBisector],true);line(B[10],'back-ah',d.backArmhole);point(B[10],'B½',d.backAhMid);point(B[10],'B45',d.backAhBisector);
  line(B[11],'front-half-depth',[V(d.sideX,mid),V(d.chestWidthX,mid)],true);line(B[11],'front-half-width',[V((d.chestWidthX+d.sideX)/2,d.blY),V((d.chestWidthX+d.sideX)/2,mid)],true);line(B[11],'front-45',[fc,d.frontAhBisector],true);line(B[11],'front-ah',d.frontArmhole);point(B[11],'F½',d.frontAhMid);point(B[11],'F45',d.frontAhBisector);
  line(B[12],'back-fold',[d.cbWaist,d.cbNeck]);line(B[12],'back-waist',[d.cbWaist,d.sideWaist]);line(B[12],'side-seam',[d.underarm,d.sideWaist]);line(B[12],'side-waist-shift',[V(d.sideX,0),d.sideWaist],true);point(B[12],'SW',d.sideWaist);
  const chestMid=(d.chestWidthX+d.cfX)/2;
  line(B[13],'bp-projection',[V(chestMid,d.blY),V(d.bp.x,d.blY),d.bp],true);line(B[13],'bp-vertical',[V(d.bp.x,d.blY),V(d.bp.x,d.cfHem.y)],true);point(B[13],'BP',d.bp);
  line(B[14],'hem-drop',[V(d.cfX,0),d.cfHem],true);line(B[14],'front-hem',d.hem);line(B[14],'front-fold',[d.cfNeck,d.cfHem]);point(B[14],'F-HEM',d.cfHem);point(B[14],'BP-HEM',d.hemAtBp);
  point(B[15],'Notch-B',d.notchB);point(B[15],'Notch-A',d.notchA);point(B[15],'B-arc½',d.backAhHalf);point(B[15],'F-arc½',d.frontAhHalf);
  const bodySteps=[
    ['Back length','Draw the centre-back reference: 38 cm from waist to top.',459,461],
    ['Construction rectangle','B/2 + 5 = 47 cm. Close the back/front frame.',451,451],
    ['Scye depth / BL','Measure B/6 + 7 = 21 cm down from the top. BL is 17 cm above WL.',452,452],
    ['Back width','B/6 + 4.5 = 18.5 cm from centre back. Project the width line.',453,453],
    ['Chest width','B/6 + 3 = 17 cm from centre front. Project the front width line.',454,454],
    ['Underarm division','Bisect the space between back-width and chest-width lines. Project to WL.',465,467],
    ['Back neck','Width B/12 = 7 cm. Rise one third of that width; draw the neckline.',469,475],
    ['Front neck','Width 6.8 cm; depth 8 cm; SNP drop 0.5 cm. Use the 45° guide with the 0.3 cm reduction.',479,489],
    ['Back shoulder','Drop one neck height on the back-width line, extend 2 cm outward, then connect.',476,477],
    ['Front shoulder','Drop two neck heights. Locate the endpoint using back shoulder length minus 1.8 cm.',478,496],
    ['Back armhole','Half-depth and half-width guides locate the 45° point: half back armhole width + 0.5 cm.',506,528],
    ['Front armhole','Use the front half-depth and half the BACK armhole width for the front bisector, for the front curve.',509,531],
    ['Side-waist correction','Move the waist endpoint 2 cm toward centre back. Join it to the underarm.',498,500],
    ['Bust point','Start at half chest width, shift 0.7 cm toward the armhole, then move 4 cm below BL.',502,502],
    ['Front hem balance','Lower the front hem by half the front neck width (3.4 cm) and project through BP.',503,504],
    ['Notch conventions','Measure half the armhole arc plus 3 cm toward the underarm.',534,537]
  ];
  bodySteps.forEach((step,i)=>step[1]=BasicSequences.bodyRules[i]);
  [[461,464],[451,451],[452,462],[453,453],[454,454],[465,468],[470,476],[472,489],[477,478],[479,496],[506,528],[509,531],[498,500],[502,502],[503,504],[534,537]].forEach((range,i)=>{bodySteps[i][2]=range[0];bodySteps[i][3]=range[1];});
  bodySteps[15][0]='Sleeve notches';
  const D=DressSequence.sets,dressSteps=DressSequence.steps;
  function sequence(root,kind){
    const basic=true, names={body:'Bodice',skirt:'Skirt',sleeve:'Sleeve',trousers:'Trousers',dress:'Dress'};
    const sets=kind==='dress'?D:kind==='body'?B:BasicSequences[kind].sets,steps=kind==='dress'?dressSteps:kind==='body'?bodySteps:BasicSequences[kind].steps,src=SequenceSource[kind];
    let index=-1,playing=!reduced.matches,visible=false,timer=null,tempo=4500,notation=null,stepDuration=4500,motionPaused=false;
    const host=root.querySelector('.film-svg'),svg=node('svg',{viewBox:kind==='body'?'-6 -47 61 58':'-6 -48 120 108',role:'img','aria-label':kind==='body'?'Bodice construction animation':'Princess dress construction animation'});
    if(basic){const pts=sets.flatMap(l=>[...l.lines.flatMap(s=>s.points),...l.points.map(s=>s.p)]);const xs=pts.map(p=>p.x),ys=pts.map(p=>-p.y);svg.setAttribute('viewBox',`${Math.min(...xs)-5} ${Math.min(...ys)-5} ${Math.max(...xs)-Math.min(...xs)+10} ${Math.max(...ys)-Math.min(...ys)+10}`);svg.setAttribute('aria-label',names[kind]+' construction animation');}
    host.append(svg);const shapes=node('g'),dots=node('g');svg.append(shapes,dots);
    const code=root.querySelector('code'),windowEl=root.querySelector('.code-window');
    src.lines.forEach((text,i)=>{const row=document.createElement('span');row.className='source-line';row.dataset.line=src.start+i;const n=document.createElement('i');n.textContent=src.start+i;row.append(n,document.createTextNode(text));code.append(row);});
    const nav=root.querySelector('.film-step-nav');
    const rules=root.querySelector('.film-rules');
    if(basic){
      steps.forEach((s,i)=>{const item=document.createElement('section');item.className='film-rule';const title=document.createElement('h3');title.textContent=String(i+1).padStart(2,'0')+' / '+s[0];const text=document.createElement('p');
        s[1].split(/(\[[^\]]+\])/g).forEach(part=>{if(part.startsWith('[')){const calc=document.createElement('span');calc.className='calculation';calc.textContent=part.slice(1,-1);text.append(calc);}else text.append(document.createTextNode(part));});
        item.append(title,text);rules.append(item);
      });
    }else steps.forEach((s,i)=>{const b=document.createElement('button');b.textContent=String(i+1).padStart(2,'0');b.setAttribute('aria-label',`Dress step ${i+1}: ${s[0]}`);b.addEventListener('click',()=>{playing=false;show(i);});nav.append(b);});
    function schedule(){clearTimeout(timer);if(playing&&visible&&!document.hidden&&!root.hidden){if(basic){notation?.onComplete(()=>show((index+1)%steps.length));}else timer=setTimeout(()=>show((index+1)%steps.length),stepDuration);}else if(basic)notation?.onComplete(null);}
    function show(next){
      notation?.cancel();notation=null;
      const previous=index;motionPaused=false;index=next;const step=steps[index];
      root.querySelector('.film-number').textContent=String(index+1).padStart(2,'0');root.querySelector('.film-step-label').textContent=`${basic?names[kind]+' rule':'Conversion'} ${index+1} / ${steps.length}`;root.querySelector('.film-step-title').textContent=step[0];root.querySelector('.film-step-copy').textContent=step[1];root.querySelector('.film-counter').textContent=`${String(index+1).padStart(2,'0')} / ${steps.length}`;
      root.querySelector('[data-action=play]').textContent=playing?'Pause':'Play';root.querySelector('[data-action=play]').setAttribute('aria-label',`${playing?'Pause':'Play'} ${names[kind].toLowerCase()} animation`);
      root.querySelectorAll('.film-step-nav button').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));
      root.querySelector('.film-note').textContent=basic?'All dimensions in centimetres · calculations in red':'Reference geometry · construction reveal';
      if(basic){[...rules.children].forEach((el,i)=>{el.classList.toggle('active',i===index);if(i===index)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});const item=rules.children[index];rules.scrollTo({top:Math.max(0,item.offsetTop-12),behavior:reduced.matches?'instant':'smooth'});}
      const active=[];code.querySelectorAll('.source-line').forEach(row=>{const n=Number(row.dataset.line),on=n>=step[2]&&n<=step[3];row.classList.toggle('highlight',on);if(on)active.push(row);});
      if(active.length)windowEl.scrollTo({top:Math.max(0,active[0].offsetTop-code.offsetTop-windowEl.clientHeight*.25),behavior:reduced.matches?'instant':'smooth'});
      root.querySelector('.code-citation').textContent=`${src.path} · L${step[2]}–${step[3]}`;
      let selected=sets.slice(0,index+1);
      if(kind==='dress')selected=index===0?[sets[0]]:index===sets.length-1?[sets.at(-1)]:sets.slice(1,index+1).filter((_,i)=>!(index>7&&i+1===7));
      if(kind==='dress'){const pts=selected.flatMap(l=>l.lines.flatMap(s=>s.points));const xs=pts.map(p=>p.x);const ys=pts.map(p=>-p.y);svg.setAttribute('viewBox',`${Math.min(...xs)-7} ${Math.min(...ys)-7} ${Math.max(...xs)-Math.min(...xs)+14} ${Math.max(...ys)-Math.min(...ys)+14}`);}const wanted=new Set();
      selected.forEach(l=>l.lines.forEach(item=>{wanted.add(item.id);let e=[...shapes.children].find(e=>e.dataset.id===item.id);if(!e){e=node('polyline',{points:item.points.map(p=>`${p.x},${-p.y}`).join(' '),pathLength:100});e.dataset.id=item.id;shapes.append(e);e.classList.add('arriving');}e.setAttribute('points',item.points.map(p=>`${p.x},${-p.y}`).join(' '));e.style.visibility='visible';e.setAttribute('class',`film-line ${item.guide?'guide':''} ${sets[index].lines.includes(item)?'current':''} ${index!==previous&&sets[index].lines.includes(item)?'arriving':''}`);}));
      [...shapes.children].forEach(e=>{if(!wanted.has(e.dataset.id))e.remove();});dots.replaceChildren();
      const used=new Set();selected.forEach(l=>l.points.forEach(item=>{const key=`${item.p.x.toFixed(3)},${item.p.y.toFixed(3)},${item.label}`;if(used.has(key))return;used.add(key);const g=node('g',{class:`film-point ${sets[index].points.includes(item)?'current':''}`});g.dataset.pointId=item.id;g.append(node('circle',{cx:item.p.x,cy:-item.p.y,r:kind==='body'?.22:.25}));if(item.label){const left=/Notch-B|B-arc/.test(item.id);const dy=/Notch-/.test(item.id)?1.4:-.55;g.append(node('text',{x:item.p.x+(left?-1:.55),y:-item.p.y+dy,'text-anchor':left?'end':'start'},item.label));}dots.append(g);}));
      // Also expose every corner/end of the auxiliary construction guides.
      const named=new Set(selected.flatMap(l=>l.points.map(item=>`${item.p.x.toFixed(3)},${item.p.y.toFixed(3)}`)));
      selected.forEach(l=>l.lines.filter(item=>item.guide).forEach(item=>item.points.forEach(p=>{const key=`${p.x.toFixed(3)},${p.y.toFixed(3)}`;if(named.has(key))return;named.add(key);dots.append(node('circle',{cx:p.x,cy:-p.y,r:.16,fill:'#999',class:sets[index].lines.includes(item)?'current auxiliary-point':'auxiliary-point','data-line-id':item.id}));})));
      if(basic){notation=DraftingNotations.render(svg,kind,index,tempo,reduced.matches,sets[index]);stepDuration=notation.duration;}
      notation?.pause(motionPaused||root.hidden||document.hidden||!visible);
      schedule();
    }
    root.querySelector('[data-action=play]').addEventListener('click',()=>{playing=!playing;motionPaused=!playing;notation?.pause(motionPaused);root.querySelector('[data-action=play]').textContent=playing?'Pause':'Play';root.querySelector('[data-action=play]').setAttribute('aria-label',(playing?'Pause ':'Play ')+names[kind].toLowerCase()+' animation');schedule();});
    root.querySelector('[data-action=next]').addEventListener('click',()=>{playing=false;show((index+1)%steps.length);});
    root.querySelector('[data-action=previous]').addEventListener('click',()=>{playing=false;show((index+steps.length-1)%steps.length);});
    root.querySelector('[data-action=restart]').addEventListener('click',()=>show(0));root.querySelector('select').addEventListener('change',e=>{tempo=Number(e.target.value);show(index);});
    function pauseReading(){playing=false;motionPaused=true;notation?.pause(true);root.querySelector('[data-action=play]').textContent='Play';root.querySelector('[data-action=play]').setAttribute('aria-label','Play '+names[kind].toLowerCase()+' animation');schedule();}
    if(rules){rules.addEventListener('wheel',pauseReading,{passive:true});rules.addEventListener('touchstart',pauseReading,{passive:true});rules.addEventListener('keydown',pauseReading);}
    windowEl.addEventListener('keydown',pauseReading);windowEl.addEventListener('touchstart',pauseReading,{passive:true});
    windowEl.addEventListener('wheel',()=>{playing=false;motionPaused=true;notation?.pause(true);root.querySelector('[data-action=play]').textContent='Play';root.querySelector('[data-action=play]').setAttribute('aria-label','Play '+kind+' animation');schedule();},{passive:true});
    new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;notation?.pause(motionPaused||!visible||root.hidden||document.hidden);schedule();},{threshold:.2}).observe(root);
    document.addEventListener('visibilitychange',()=>{notation?.pause(motionPaused||document.hidden||root.hidden||!visible);schedule();});
    root.addEventListener('block-visibility',()=>{notation?.pause(root.hidden);if(!root.hidden&&basic)show(index);});reduced.addEventListener('change',()=>{if(reduced.matches){playing=false;show(index);}});show(0);
  }
  document.querySelectorAll('[data-block]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-block]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));document.querySelectorAll('#blocks [data-sequence]').forEach(root=>{root.hidden=root.dataset.sequence!==button.dataset.block;root.dispatchEvent(new Event('block-visibility'));});document.querySelector('#blocks .text-link').href='../BasicBlock-'+({body:'Bodice',skirt:'Skirt',sleeve:'Sleeve',trousers:'Trousers'}[button.dataset.block])+'.html';}));
  document.querySelectorAll('[data-sequence]').forEach(root=>sequence(root,root.dataset.sequence));
})();
