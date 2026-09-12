/* Shared section-one contract. All measurements are in centimetres.
   Gemini integration: MathDressMeasurements.apply({bust,waist,hip,backLength}, 'Gemini').
   A successful update refreshes the player using one measurement snapshot. */
window.MathDressMeasurements=(()=>{
  'use strict';
  const defaults=Object.freeze({bust:94,waist:70,hip:98,backLength:38});
  const key='mathdress.workflow.measurements.v1';
  function validate(values){
    const body={};
    for(const name of Object.keys(defaults)){
      if(typeof values?.[name]!=='number'||!Number.isFinite(values[name])||values[name]<=0)throw Error('Enter a positive number for every measurement, in centimetres.');
      body[name]=values[name];
    }
    const draft=PrincessDress.draftPrincessDress(body);
    if(draft.error)throw Error(draft.error);
    if(!draft.panels?.every(p=>p.outline.every(q=>Number.isFinite(q.x)&&Number.isFinite(q.y))))throw Error('These measurements cannot produce a complete pattern.');
    return body;
  }
  let current={...defaults},source='System defaults';
  try{const saved=JSON.parse(sessionStorage.getItem(key));if(saved&&saved.source!=='System defaults'){current=validate(saved.body);source=typeof saved.source==='string'?saved.source:'Section 1';}}catch{}
  function apply(values,label='Section 1'){
    const body=validate(values);
    // Validate the final plate before replacing a working set of measurements.
    window.PatternResults?.build('dress',body);
    const sequence=window.buildDressSequence?.(body);
    try{sessionStorage.setItem(key,JSON.stringify({body,source:label}));}catch{throw Error('Unable to save measurements in this browser. Please enable session storage and try again.');}
    current=Object.freeze(body);source=label;
    if(sequence){window.DressSequence=sequence;if(window.DraftingNotations)window.DraftingNotations.data.dress=sequence.notations;}
    window.dispatchEvent(new Event('mathdress:measurements-applied'));
  }
  current=Object.freeze(current);
  return Object.freeze({defaults,get current(){return current;},get source(){return source;},validate,apply,reset:()=>apply(defaults,'System defaults')});
})();
