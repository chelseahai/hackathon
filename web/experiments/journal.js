'use strict';
const $=s=>document.querySelector(s),NS='http://www.w3.org/2000/svg';
const fmt=(n,d=2)=>Number(n).toFixed(d),signed=n=>(n>0?'+':'')+fmt(n);
let data,selected,mode='overlay';
const labels={baseline:'Reference',dress_length:'Length',waist_ease:'Waist ease',hip_ease:'Hip ease',hem_fullness:'Fullness',hem_distribution:'Distribution',combined:'Combined'};
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
function svgEl(tag,attrs,text){const e=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);if(text)e.textContent=text;return e;}
function bounds(ps){return {left:Math.min(...ps.map(p=>p[0])),right:Math.max(...ps.map(p=>p[0])),top:Math.max(...ps.map(p=>p[1])),bottom:Math.min(...ps.map(p=>p[1]))};}
function inside(q,ps){let yes=false;for(let i=0,j=ps.length-1;i<ps.length;j=i++){const a=ps[i],b=ps[j];if((a[1]>q[1])!==(b[1]>q[1])&&q[0]<(b[0]-a[0])*(q[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
function inward(q,ps){for(let i=0;i<32;i++){const a=i*Math.PI/16,end=[q[0]+.65*Math.cos(a),q[1]+.65*Math.sin(a)];if([.1,.5,1].every(t=>inside([q[0]+(end[0]-q[0])*t,q[1]+(end[1]-q[1])*t],ps)))return end;}return q;}
function draw(svg,record,compare=false,mini=false){
 svg.replaceChildren();if(!record.panels.length){svg.append(svgEl('text',{x:10,y:25},'Geometry unavailable; see validation results.'));return;}
 const reference=data.cases[0],all=[],group=svgEl('g',{});svg.append(group);let cursor=0;
 const cf=bounds(record.panels[3].outline),cy=(cf.top+cf.bottom)/2,len=Math.min(12,...record.panels.map(p=>{const b=bounds(p.outline);return (b.top-b.bottom)*.2;}));
 record.panels.forEach((p,i)=>{const r=reference.panels[i],b=bounds([...p.outline,...(compare?r.outline:[])]),dx=cursor-b.left;cursor+=b.right-b.left+8;
   function outline(panel,cls){const ps=[...panel.outline,panel.outline[0]];all.push(...ps.map(q=>[q[0]+dx,q[1]]));group.append(svgEl('polyline',{class:'outline '+cls,points:ps.map(q=>`${q[0]+dx},${-q[1]}`).join(' ')}));}
   if(compare)outline(r,'reference');outline(p,compare?'':'filled');
   if(!compare){const ws=p.marks.filter(m=>m.label==='W').map(m=>m.pt[0]);const x=((i===0?0:i===3?record.panels[3].outline.reduce((n,q)=>Math.max(n,q[0]),-Infinity):ws[1])+ws[0])/2;
     group.append(svgEl('line',{class:'grain',x1:x+dx,x2:x+dx,y1:-(cy+len/2),y2:-(cy-len/2)}));
     p.notches.forEach(q=>{const end=inward(q,p.outline);group.append(svgEl('line',{class:'mark',x1:q[0]+dx,y1:-q[1],x2:end[0]+dx,y2:-end[1]}));});
   }
   const textY=b.bottom-5;all.push([cursor-8,textY-3]);group.append(svgEl('text',{class:'pattern-name',x:(b.left+b.right)/2+dx,y:-textY,'font-size':mini?2.7:2.3,'text-anchor':'middle'},p.name));
 });const b=bounds(all);svg.setAttribute('viewBox',`${b.left-5} ${-b.top-5} ${b.right-b.left+10} ${b.top-b.bottom+10}`);
}
function render(){
 const c=selected,v=c.validation,base=data.cases[0].validation.inputs;$('#case-select').value=c.id;$('#case-title').textContent=c.name;$('#case-description').textContent=c.description;
 $('#values').replaceChildren();for(const key of ['dress_length','waist_ease','hip_ease','hem_fullness','hem_distribution']){const row=el('div');row.classList.toggle('changed',JSON.stringify(v.inputs[key])!==JSON.stringify(base[key]));row.append(el('dt',labels[key]),el('dd',Array.isArray(v.inputs[key])?v.inputs[key].map(x=>fmt(x*100,2)).join(' / ')+' %':v.inputs[key]+' cm'));$('#values').append(row);}
 $('#filters').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.group===c.group)));
 $('#figure-status').textContent=c.id==='reference'?'REFERENCE':mode==='overlay'?'REFERENCE / SELECTED':'SELECTED / STITCH OUTLINES';draw($('#pattern'),c,mode==='overlay');
 $('#metrics').replaceChildren();for(const [value,label] of [[v.engineering_pass?'Pass':'Review','Engineering checks'],[String(v.review_count??0),'Seam / outline review flags'],[signed(c.area_delta_cm2||0)+' cm²','Four-panel area change'],[fmt(c.upper_max_shift_cm||0,3)+' cm','Maximum upper-knot movement']]){const div=el('div');div.append(el('strong',value),el('span',label));$('#metrics').append(div);}
 $('#checks').replaceChildren();for(const [label,pass] of [['Python / browser geometry',v.parity?.pass],['Stitch and cutting outlines',v.outlines?.every(p=>p.pass)],['Notch correspondence',v.notch_issues?.length===0],['Python DXF audit',v.python_dxf?.pass_],['Browser DXF audit',v.javascript_dxf?.pass_],['Sampling convergence',v.sampling_max_interval_change_cm<=data.policy.sampling_review_threshold_cm]])$('#checks').append(el('li',(pass?'✓ ':'↗ ')+label,pass?'pass':'review'));
 $('#seams').replaceChildren();for(const pair of [...new Set((v.seams||[]).map(r=>r.pair))]){const block=el('div',undefined,'seam-pair');block.append(el('h3',pair.replaceAll('_',' ')));const head=el('div',undefined,'seam-row seam-head');['Interval','First / cm','Second / cm','Δ / cm'].forEach(t=>head.append(el('span',t)));block.append(head);for(const r of v.seams.filter(r=>r.pair===pair)){const row=el('div',undefined,'seam-row'+(r.review?' review':''));[r.segment,fmt(r.a_cm),fmt(r.b_cm),signed(r.difference_cm)+(r.review?' ↗':'')].forEach(t=>row.append(el('span',t)));block.append(row);}$('#seams').append(block);}
 $('#downloads').replaceChildren();for(const [label,file] of [['Python DXF',c.id+'-python.dxf'],['Browser DXF',c.id+'-browser.dxf'],['Full geometry',c.id+'-snapshot.json'],['All seam measurements','seams.csv'],['Validation report','report.html']]){const a=el('a',label+' ↗');a.href='../../output/experiments/step-04/'+file;$('#downloads').append(a);}
 $('#provenance').textContent=JSON.stringify({configuration:c.id,inputs:v.inputs,generated:data.generated_utc,rule_commit:data.rule_commit,source_sha256:data.source_sha256,policy:data.policy},null,2);
 const url=new URL(location.href);url.searchParams.set('case',c.id);history.replaceState(null,'',url);
}
function choose(id,scroll=false){selected=data.cases.find(c=>c.id===id)||data.cases[0];render();if(scroll)$('#study').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
async function init(){
 const response=await fetch('data.json');if(!response.ok)throw Error('Experiment record could not be loaded');data=await response.json();
 for(const [group,label] of Object.entries(labels)){const cases=data.cases.filter(c=>c.group===group);if(!cases.length)continue;const opt=el('optgroup');opt.label=label;cases.forEach(c=>{const o=el('option',c.name);o.value=c.id;opt.append(o);});$('#case-select').append(opt);const button=el('button',label);button.dataset.group=group;button.addEventListener('click',()=>choose(cases[0].id));$('#filters').append(button);}
 $('#case-select').addEventListener('change',e=>choose(e.target.value));for(const m of ['overlay','single'])$('#'+m).addEventListener('click',()=>{mode=m;$('#overlay').setAttribute('aria-pressed',String(m==='overlay'));$('#single').setAttribute('aria-pressed',String(m==='single'));render();});
 for(const c of data.cases.filter(c=>c.group==='combined')){const card=el('button',undefined,'card');card.setAttribute('aria-label','Inspect '+c.name);const svg=svgEl('svg',{'aria-hidden':'true'});draw(svg,c,false,true);card.append(svg,el('h3',c.name+' ↗'),el('p',c.description),el('p',`${c.validation.engineering_pass?'Engineering pass':'Engineering review'} · ${c.validation.review_count} review flags`,'note'));card.addEventListener('click',()=>choose(c.id,true));$('#cards').append(card);}
 const fullest=data.cases.find(c=>c.id==='fullness_64'),passes=data.cases.filter(c=>c.validation.engineering_pass).length,flags=data.cases.map(c=>c.validation.review_count);
 const observations=[['The numerical checks hold.',`${passes} of ${data.cases.length} saved configurations pass the engineering checks. Every body measurement stays fixed; only the intended design fields change.`],['Lower changes reach upward.',`Doubling hem fullness moves at least one above-waist seam knot by ${fmt(fullest.upper_max_shift_cm,3)} cm. The engine couples side-seam balancing and front dart transfer, so these controls are not geometrically independent.`],['Sewing decisions remain.',`The configurations retain ${Math.min(...flags)}–${Math.max(...flags)} review flags each. None of these mismatches has been approved as sewing ease. Plot scale, closure treatment and fitting still need physical evidence.`]];
 for(const [title,copy] of observations){const article=el('article');article.append(el('h3',title),el('p',copy));$('#observations').append(article);}
 $('#run-info').textContent=`Run ${data.generated_utc.slice(0,10)} · Rule commit ${data.rule_commit.slice(0,7)} · 15 saved configurations · Full provenance in each record.`;
 choose(new URLSearchParams(location.search).get('case')||'reference');
}
init().catch(error=>{const box=$('#load-error');box.hidden=false;box.textContent=error.message+'. Regenerate with Experiments/step-04/publish.py if needed.';});
