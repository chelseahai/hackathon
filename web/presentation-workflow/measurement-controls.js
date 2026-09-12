(() => {
  'use strict';
  const state=MathDressMeasurements,form=document.querySelector('#measurement-form'),error=document.querySelector('#measurement-error');
  function attempt(action){try{error.hidden=true;action();}catch(e){error.textContent=e.message;error.hidden=false;}}
  form.addEventListener('submit',event=>{event.preventDefault();attempt(()=>state.apply(Object.fromEntries(Object.keys(state.defaults).map(name=>[name,Number(form.elements.namedItem(name).value)])),form.dataset.source||'Section 1'));});
  form.addEventListener('input',()=>{form.dataset.source='Section 1 · reviewed measurements';});
  document.querySelector('#measurement-reset').addEventListener('click',()=>attempt(()=>state.reset()));
  function refresh(){
  for(const [name,value] of Object.entries(state.current))form.elements.namedItem(name).value=value;
  form.dataset.source=state.source;
  document.querySelector('#measurement-source').textContent=(state.source==='System defaults'?'Sample measurements':state.source)+' · applied to the pattern';
  const summary=`Bust ${state.current.bust} · waist ${state.current.waist} · hip ${state.current.hip} · back length ${state.current.backLength} cm`;
  document.querySelector('#finished-measurements').textContent=summary;
  const svg=document.querySelector('#finished-pattern-image');svg.replaceChildren();
  try{PatternResults.render(svg,'dress');}catch(e){document.querySelector('#finished-measurements').textContent='Unable to draw this pattern: '+e.message;}
  const status=document.querySelector('#scan-status');if(status)status.textContent=state.source==='System defaults'?'Sample photos use the supplied measurements: 94 / 70 / 98 / 38 cm.':'Measurements applied. The construction player and finished pattern are updated.';
  if(state.source==='System defaults'){const note=document.querySelector('#scan-result-note');if(note)note.hidden=true;}
  }
  window.addEventListener('mathdress:measurements-applied',refresh);refresh();
})();
