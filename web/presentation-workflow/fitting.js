(()=>{'use strict';
const $=id=>document.getElementById(id),groups={human:[],clo:[]};let controller;
const read=blob=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('Could not read image.'));r.readAsDataURL(blob);});
function render(kind){const el=$('fit-'+kind+'-previews');el.replaceChildren();groups[kind].forEach((item,i)=>{const figure=document.createElement('figure'),img=document.createElement('img'),button=document.createElement('button');img.src=item.data;img.alt=item.name;button.type='button';button.className='text-link';button.textContent='Remove '+(i+1);button.onclick=()=>{groups[kind].splice(i,1);render(kind);};figure.append(img,button);el.append(figure);});}
function error(e){$('fit-error').textContent=e.message||String(e);}
for(const kind of ['human','clo']){
 $('fit-'+kind).onchange=async e=>{try{const files=[...e.target.files];if(groups[kind].length+files.length>3)throw Error('Use up to three images per input. Remove a photo to replace it.');const items=await Promise.all(files.map(async f=>{if(!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>8*1024*1024)throw Error('Use JPEG, PNG or WebP files, up to 8 MB each.');return {name:f.name,data:await read(f)};}));groups[kind].push(...items);render(kind);$('fit-error').textContent='';}catch(e){error(e);}finally{e.target.value='';}};
}
$('fit-use-current').onclick=async()=>{try{
 const urls=['scan-front-preview','scan-side-preview'].map(id=>$(id)).filter(img=>img&&!img.hidden&&img.getAttribute('src')).map(img=>img.src);
 const load=async(url,name)=>{const res=await fetch(url);if(!res.ok)throw Error('Could not load reference photos.');return {name,data:await read(await res.blob())};};
 const [human,clo]=await Promise.all([Promise.all(urls.map((u,i)=>load(u,'Person reference '+(i+1)))),Promise.all(['front','side','back'].map(v=>load('assets/clo/'+v+'.png','CLO '+v)))]);
 groups.human=human;groups.clo=clo;render('human');render('clo');$('fit-error').textContent='';
 }catch(e){error(e);}};
$('fit-cancel').onclick=()=>controller?.abort();
$('fit-form').onsubmit=async e=>{e.preventDefault();$('fit-error').textContent='';if(!groups.human.length||!groups.clo.length)return error(Error('Add at least one person photo and one CLO render, or use the current workflow images.'));
 controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),190000);$('fit-controls').disabled=true;$('fit-cancel').hidden=false;$('fit-status').textContent='Generating your fitting image. This may take a few minutes…';
 try{const response=await fetch('/api/fitting/generate',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({humanImages:groups.human.map(i=>i.data),cloImages:groups.clo.map(i=>i.data),view:$('fit-view').value,prompt:$('fit-prompt').value,apiKey:$('fit-key').value||$('scan-api-key')?.value||''})});const result=await response.json();if(!response.ok||!result.success)throw Error(result.error||'Generation failed.');const gallery=$('fit-results');gallery.replaceChildren();result.images.forEach((src,i)=>{const figure=document.createElement('figure'),img=document.createElement('img'),link=document.createElement('a');img.src=src;img.alt='Generated '+result.view+' fitting visualization';link.href=src;link.download='dress-me-'+result.view+'-'+(i+1)+(src.startsWith('data:image/jpeg')?'.jpg':src.startsWith('data:image/webp')?'.webp':'.png');link.className='text-link';link.textContent='Download image ↗';figure.append(img,link);gallery.append(figure);});$('fit-output').hidden=false;$('fit-status').textContent='Generated with Gemini · '+result.view+' view. AI visualization; physical fit still requires validation.';$('fit-output').scrollIntoView({behavior:'smooth',block:'start'});
 }catch(e){$('fit-status').textContent='';error(e.name==='AbortError'?Error('Generation stopped. You can try again.'):e);}finally{clearTimeout(timeout);controller=null;$('fit-controls').disabled=false;$('fit-cancel').hidden=true;}
};
})();
