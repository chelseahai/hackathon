/* Explicit links from a measurement operation to the geometry it constructs.
   Unassigned construction helpers get their own explanatory operation. */
window.DraftingSequencePlan = (() => {
  const links={
    body:[
      [['back-length']], [['frame']], [['bust-level']], [['back-width']], [['chest-width']], [['side-mid']],
      [[],['back-neck-box'],['back-neck']],
      [[],['front-neck-box'],[],['neck-bisector'],[]],
      [[],['back-shoulder-guide']], [[],['front-shoulder-guide','front-shoulder']],
      [['back-half-depth'],[],['back-45']], [['front-half-depth'],[],['front-45']],
      [['side-waist-shift']], [[],[],['bp-projection']], [['hem-drop'],[]], [[],[]]
    ],
    skirt:[
      [[],['skirt-frame']], [['hip-line'],[],['side-axis']], [['back-waist-measure'],['front-waist-measure']],
      [['back-side-take'],['front-side-take'],['back-side-rise'],['cb-drop']], [['back-waist'],['front-waist']], [['side-controls'],['back-side'],['front-side']], [[],['hem']]
    ],
    sleeve:[
      [[]], [['front-diagonal'],['back-diagonal'],['underarm']], [['sleeve-axis'],['elbow','cuff-guide']],
      [[],['front-offset0'],['front-offset1'],[]], [[],[],['back-offset0'],['back-offset1']],
      [['back-cap'],['front-cap']], [['front-seam'],['back-seam']], [[],['cuff-offset0'],['cuff-offset1'],['cuff-offset2']]
    ],
    trousers:[
      [[],['crotch-level'],['front-frame']], [[],['crotch-width']], [['crease'],['knee-level'],['leg-guides']],
      [['rise-thirds','hip-level'],['centre-front']], [[],['bisector'],['front-crotch']],
      [['waist-guide'],[],[],['front-waist']], [['front-side'],['front-inseam'],['front-hem']],
      [[],['back-extension'],[],['back-rise']], [['back-hip'],['back-waist-guide'],['back-leg']],
      [[],['back-crotch','back-cb']], [[],[],['back-waist']], [[],['back-inseam'],['back-hem']]
    ]
  };
  const names={frame:'Complete the construction rectangle','skirt-frame':'Complete the skirt rectangle','front-frame':'Complete the front rectangle','back-frame':'Set out the back construction rectangle','back-neck-box':'Complete the back-neck construction box','front-neck-box':'Complete the front-neck construction box','neck-width-mid':'Project the half-neck-width guide','back-shoulder':'Join the back shoulder points','back-half-width':'Project the half-width armhole guide','front-half-width':'Project the half-width armhole guide','back-ah':'Draw the back armhole through its controls','front-ah':'Draw the front armhole through its controls','back-fold':'Complete the centre-back outline','back-waist':'Join the back waist points','side-seam':'Join underarm to the corrected side waist','bp-vertical':'Project the bust-point vertical','front-hem':'Join the front hem through the BP projection','front-fold':'Complete the centre-front outline','back-side':'Draw the back side through its shaping points','cuff':'Draw the cuff through the balance points','crotch-triangle':'Join the hip and crotch construction points'};
  const same=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)<.005;
  function build(kind,index,specs,layer){
    const known=new Map(layer.lines.map(l=>[l.id,l]));
    const operations=specs.map((spec,i)=>({...spec,lines:(links[kind][index][i]||[]).filter(id=>{
      const line=known.get(id);if(!line)return false;
      if(line.guide)return line.points.length===2;
      return spec.points&&((same(spec.points[0],line.points[0])&&same(spec.points.at(-1),line.points.at(-1)))||(same(spec.points.at(-1),line.points[0])&&same(spec.points[0],line.points.at(-1))));
    }),pointIds:[]}));
    const assigned=new Set(operations.flatMap(op=>op.lines));
    const helpers=[],outcomes=[];
    for(const line of layer.lines){if(assigned.has(line.id))continue;
      (line.guide?helpers:outcomes).push({points:line.points,label:names[line.id]||`${line.guide?'Construct':'Draw'} ${line.id.replaceAll('-',' ')}`,lines:[line.id],pointIds:[]});
    }
    const firstOutline=operations.findIndex(op=>op.lines.some(id=>!known.get(id).guide));
    operations.splice(firstOutline<0?operations.length:firstOutline,0,...helpers);
    operations.push(...outcomes);
    // Named prerequisite constructions belong immediately after the measurements
    // that establish them, before dependent angles, offsets or curve operations.
    const before={
      body:{1:{frame:1},6:{'back-neck-box':2},7:{'front-neck-box':2},8:{'back-shoulder-guide':2},9:{'front-shoulder-guide':1},10:{'back-half-width':1},11:{'front-half-width':1}},
      skirt:{0:{'skirt-frame':2},3:{'waist-corrections':4},5:{'side-controls':1}},
      sleeve:{1:{underarm:2}},
      trousers:{0:{'front-frame':3},2:{'leg-guides':3},3:{'rise-thirds':1},4:{'crotch-triangle':0},7:{'back-frame':0,'back-extension':2,'back-rise':4}}
    }[kind]?.[index]||{};
    for(const [id,originalIndex] of Object.entries(before)){
      const pos=operations.findIndex(op=>op.lines.includes(id));if(pos<0)continue;
      const [helper]=operations.splice(pos,1),anchor=specs[originalIndex];
      const dest=anchor?operations.findIndex(op=>op.label===anchor.label):-1;
      operations.splice(dest<0?operations.length:dest,0,helper);
    }
    // This diagonal is the prerequisite for the bisector intersection, so it
    // must be constructed before measuring the angle and its divisions.
    const triangle=operations.findIndex(op=>op.lines.includes('crotch-triangle'));
    if(triangle>=0)operations.unshift(...operations.splice(triangle,1));
    // A located point appears only after its measurement, or after the line that
    // defines it. Never reveal all of a step's points at step entry.
    for(const item of layer.points){
      let i=operations.findIndex(op=>op.points?.some(p=>same(p,item.p)));
      if(i<0)i=operations.findIndex(op=>op.lines.some(id=>known.get(id).points.some(p=>same(p,item.p))));
      if(i<0){i=operations.length;operations.push({points:[item.p,item.p],label:`Locate ${item.label||item.id}`,lines:[],pointIds:[]});}
      operations[i].pointIds.push(item.id);
    }
    return operations;
  }
  return {build};
})();
