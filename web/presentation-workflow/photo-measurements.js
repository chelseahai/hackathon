/* Upload/reference/Gemini workflow adapted from GDGAIEvent-main/public/app.js.
   UI remains MathDress; analysis results are reviewed before applying to the draft. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id),photos={front:null,side:null},versions={front:0,side:0};
  const error=$('scan-error'),status=$('scan-status');let controller=null;
  function showError(message){error.textContent=message;error.hidden=false;}
  function clearError(){error.hidden=true;error.textContent='';}
  function busy(on){$('scan-analyze').disabled=on;$('scan-load-demo').disabled=on;$('scan-cancel').hidden=!on;}
  function cancel(){if(controller){controller.abort();controller=null;busy(false);status.textContent='Analysis cancelled.';}}
  function clearPhoto(side){cancel();versions[side]++;photos[side]=null;$( `scan-${side}`).value='';const preview=$(`scan-${side}-preview`);preview.src=preview.dataset.defaultSrc;preview.alt=`Default sample ${side} photograph`;preview.hidden=false;$(`scan-${side}-drop`).querySelector('.scan-empty').hidden=true;$(`scan-${side}-clear`).hidden=true;}
  async function readPhoto(file,side){
    if(!file)return;clearPhoto(side);clearError();const version=versions[side];
    if(!['image/jpeg','image/png','image/webp'].includes(file.type))return showError('Choose a JPEG, PNG or WebP photograph.');
    if(!file.size||file.size>8*1024*1024)return showError('Each photograph must be no larger than 8 MB.');
    try{const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Unable to read this photo.'));reader.readAsDataURL(file);});
      const check=new Image();check.src=data;await check.decode();if(version!==versions[side])return;
      photos[side]=data;const preview=$(`scan-${side}-preview`);preview.src=data;preview.alt=`Selected ${side} photograph`;preview.hidden=false;$(`scan-${side}-drop`).querySelector('.scan-empty').hidden=true;$(`scan-${side}-clear`).hidden=false;status.textContent='Photo ready. Choose the reference object, then estimate measurements.';
    }catch{if(version===versions[side])showError('This file could not be opened as a photograph. Choose another image.');}
  }
  for(const side of ['front','side']){
    $(`scan-${side}`).addEventListener('change',e=>readPhoto(e.target.files[0],side));$(`scan-${side}-clear`).addEventListener('click',()=>clearPhoto(side));
    const zone=$(`scan-${side}-drop`);zone.addEventListener('dragover',e=>{e.preventDefault();zone.classList.add('is-dragging');});zone.addEventListener('dragleave',()=>zone.classList.remove('is-dragging'));zone.addEventListener('drop',e=>{e.preventDefault();zone.classList.remove('is-dragging');readPhoto(e.dataTransfer.files[0],side);});
  }
  $('scan-reference').addEventListener('change',()=>{cancel();$('scan-custom').hidden=$('scan-reference').value!=='CUSTOM';});
  for(const id of ['scan-width','scan-height','scan-api-key'])$(id).addEventListener('input',cancel);
  $('scan-cancel').addEventListener('click',cancel);
  async function request(demo=false){
    clearError();cancel();
    if(!demo&&!photos.front)return showError('Choose a new front photograph with the reference object visible to run Gemini. The sample photos already have supplied measurements.');
    const referenceType=$('scan-reference').value,customWidth=Number($('scan-width').value),customHeight=Number($('scan-height').value);
    if(!demo&&referenceType==='CUSTOM'&&![customWidth,customHeight].every(n=>Number.isFinite(n)&&n>0&&n<=300))return showError('Enter the actual reference width and height, between 0 and 300 cm.');
    const active=new AbortController();controller=active;busy(true);status.textContent=demo?'Loading demo measurements…':'Gemini is estimating your measurements…';
    const timeout=setTimeout(()=>active.abort(),100000);
    try{
      const response=await fetch('/api/measurements/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(demo?{selectedPresetId:$('scan-preset').value}:{frontImage:photos.front,sideImage:photos.side,referenceType,customWidth,customHeight,apiKey:$('scan-api-key').value.trim()}),signal:active.signal});
      const result=await response.json();if(!response.ok||!result.success)throw Error(result.error||'Unable to analyze these photographs.');if(controller!==active)return;
      const d=result.data?.dimensions;
      if(!d||!['chest_circumference_cm','waist_circumference_cm','hip_circumference_cm'].every(k=>typeof d[k]==='number'&&Number.isFinite(d[k])&&d[k]>0))throw Error('The analysis did not return usable measurements. Please try again.');
      if(!['preset','gemini-live'].includes(result.source))throw Error('Unsupported analysis result. Your measurements have not been changed.');
      const form=$('measurement-form');for(const [field,key] of Object.entries({bust:'chest_circumference_cm',waist:'waist_circumference_cm',hip:'hip_circumference_cm'}))form.elements.namedItem(field).value=d[key];
      const hasBack=typeof d.back_length_cm==='number'&&Number.isFinite(d.back_length_cm)&&d.back_length_cm>0;
      if(hasBack)form.elements.namedItem('backLength').value=d.back_length_cm;
      form.dataset.source=demo?'Demo preset':'Gemini estimate';$('measurement-source').textContent=form.dataset.source+' · review before applying';
      const note=$('scan-result-note');note.hidden=false;note.textContent=(demo?'Demo values, not measurements from your photos. ':'Gemini estimates. Review and correct the values before drafting. ')+(hasBack?'':'Back length could not be measured; your current value has been kept. ')+(result.data.notes||'');
      $('measurement-error').hidden=true;status.textContent='Measurements ready for review. Choose “Use these measurements” to update the construction and pattern.';
      window.dispatchEvent(new Event('mathdress:measurement-review'));
    }catch(e){if(controller===active){showError(e.name==='AbortError'?'The request timed out. Please try again.':e.message.includes('JSON')?'The measurement server is unavailable. Start the DRESS ME server and reload.':e.message);status.textContent='Measurements were not applied.';}}
    finally{clearTimeout(timeout);if(controller===active){controller=null;busy(false);}}
  }
  $('scan-analyze').addEventListener('click',()=>request());$('scan-load-demo').addEventListener('click',()=>request(true));
  fetch('/api/measurements/health').then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{$('scan-connection-status').textContent=data.hasEnvKey?'Server key available. You can analyze photos.':'Server ready. Enter a Gemini API key for photo measurement, or use demo data.';}).catch(()=>{$('scan-connection-status').textContent='Measurement server offline. Open this page through the DRESS ME Node server.';});
})();
