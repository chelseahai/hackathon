/* Actual source blocks, engine landmarks and resolved princess-dress seams. */
window.DressSequence=(()=>{
  const V=(x,y)=>({x,y}),move=(ps,x=0,y=0)=>ps.map(p=>V(p.x+x,p.y+y)),fmt=n=>Number(n.toFixed(2));
  const b=BodyBlock.draftBody({bust:84,backLength:38}),s=SkirtBlock.draftSkirt({hip:90,waist:68,skirtLength:50}),d=PrincessDress.draftPrincessDress({}),p=d.params,lift=-b.cfHem.y;
  const sets=Array.from({length:14},()=>({lines:[],points:[]})),notations=sets.map(()=>[]);
  function line(i,id,points,label,guide=true){sets[i].lines.push({id,points,guide,label});return id;}
  function mark(i,id,pt,label=id){sets[i].points.push({id,p:pt,label});}
  function measure(i,a,z,label,ids=[]){notations[i].push({points:[a,z],label,lines:ids});}
  function trace(i,id,ps,label,guide=false){line(i,id,ps,label,guide);notations[i].push({points:ps,label,curve:ps.length>2,lines:[id]});}
  function m(panel,label,n=0){return d.panels[panel].marks.filter(p=>p.label===label)[n].pt;}
  [BodyBlock.backOutline(b),BodyBlock.frontOutline(b)].forEach((ps,i)=>trace(0,'source-bodice-'+i,BodyBlock.closeRing(ps),['Back bodice block','Front bodice block'][i],true));
  [SkirtBlock.backOutline(s),SkirtBlock.frontOutline(s)].forEach((ps,i)=>trace(0,'source-skirt-'+i,move(SkirtBlock.closeRing(ps),60,35),['Back skirt block','Front skirt block'][i],true));
  trace(1,'registered-back',BodyBlock.closeRing(BodyBlock.backOutline(b)),'Register the back bodice at the waist',true);
  measure(1,b.cfHem,V(b.cfHem.x,0),`Front lift · ${fmt(lift)} cm`);
  trace(1,'registered-front',move(BodyBlock.closeRing(BodyBlock.frontOutline(b)),0,lift),'Lift the front bodice to align its waist',true);
  [SkirtBlock.backOutline(s),SkirtBlock.frontOutline(s)].forEach((ps,i)=>trace(1,'registered-skirt-'+i,SkirtBlock.closeRing(ps),'Align '+(i?'front':'back')+' skirt at the waist',true));
  const levels=[0,-p.hipDepth,-p.dressLength];
  levels.forEach((y,i)=>{const id=line(1,'dress-level-'+i,[V(0,y),V(b.cfX,y)],['Waist reference','Hip reference','Hem reference'][i]);measure(1,V(0,0),V(0,y),['Waist origin · y = 0',`Hip depth · ${p.hipDepth} cm`,`Waist to hem · ${p.dressLength} cm`][i],[id]);});
  const backSnp=V(b.backSnp.x+p.neckWiden,b.backSnp.y),frontSnp=V(b.frontSnp.x-p.neckWiden,b.frontSnp.y+lift);
  measure(2,b.backSnp,backSnp,`Back neck wider · ${p.neckWiden} cm`);
  measure(2,V(b.frontSnp.x,b.frontSnp.y+lift),frontSnp,`Front neck wider · ${p.neckWiden} cm`);
  measure(2,b.backShoulder,V(b.backShoulder.x,b.backShoulder.y-p.shoulderDrop),`Back shoulder drop · ${p.shoulderDrop} cm`);
  measure(2,V(b.frontShoulder.x,b.frontShoulder.y+lift),V(b.frontShoulder.x,b.frontShoulder.y+lift-p.shoulderDrop),`Front shoulder drop · ${p.shoulderDrop} cm`);
  [backSnp,frontSnp].forEach((q,i)=>mark(2,'neck-'+i,q,i?'F-SNP':'B-SNP'));
  measure(3,V(b.backWidthX,b.blY),V(b.backWidthX-p.widthIndent,b.blY),`Back-width inset · ${p.widthIndent} cm`);
  measure(3,V(b.chestWidthX,b.blY+lift),V(b.chestWidthX+p.widthIndent,b.blY+lift),`Chest-width inset · ${p.widthIndent} cm`);
  const bu=V(b.underarm.x-p.sideShave,b.underarm.y+p.armholeRaise),fu=V(b.underarm.x+p.sideShave,b.underarm.y+p.armholeRaise+lift);
  measure(3,b.underarm,V(b.underarm.x,bu.y),`Underarm rise · ${p.armholeRaise} cm`);
  measure(3,V(b.underarm.x,bu.y),bu,`Back underarm inward · ${p.sideShave} cm`);
  measure(3,V(b.underarm.x,fu.y),fu,`Front underarm inward · ${p.sideShave} cm`);
  mark(3,'back-UA',bu,'B-UA');mark(3,'front-UA',fu,'F-UA');
  measure(4,V(0,0),V(d.backWaist,0),`Back waist · (W + ${p.waistEase}) / 4 − 0.75 = ${fmt(d.backWaist)} cm`);
  measure(4,V(b.cfX,0),V(b.cfX-d.frontWaist,0),`Front waist · (W + ${p.waistEase}) / 4 + 0.75 = ${fmt(d.frontWaist)} cm`);
  measure(4,V(0,-p.hipDepth),V(d.backHip,-p.hipDepth),`Back hip · (H + ${p.hipEase}) / 4 − 1 = ${fmt(d.backHip)} cm`);
  measure(4,V(b.cfX,-p.hipDepth),V(b.cfX-d.frontHip,-p.hipDepth),`Front hip · (H + ${p.hipEase}) / 4 + 1 = ${fmt(d.frontHip)} cm`);
  measure(4,m(0,'W'),m(1,'W'),`Back princess intake · ${fmt(d.backDart)} cm`);
  measure(4,m(3,'W'),m(2,'W'),`Front princess intake · ${fmt(d.frontDart)} cm`);
  measure(5,backSnp,m(0,'SH'),`Back dart position · ${p.backDartFromSnp} cm`);
  measure(5,m(0,'SH'),m(1,'SH'),`Back shoulder dart · ${p.backShoulderDart} cm`);
  trace(5,'back-axis',[m(0,'SH'),m(0,'BL'),m(0,'W'),m(0,'H')],'Connect back shoulder, bust level, waist and hip',true);
  [0,1].forEach(i=>['SH','W','H'].forEach(label=>mark(5,'back-'+i+'-'+label,m(i,label),label)));
  const sf=d.panels[2],bp=m(3,'BP');
  const dart=sf.construction.find(ps=>ps.length===3);
  if(dart){measure(6,dart[0],dart[2],`Front side-dart intake · ${fmt(d.sideDart)} cm`);trace(6,'side-dart',dart,'Locate the side dart around the bust point',true);}
  else measure(6,bp,m(2,'A'),'Bust point → side balance point');
  mark(6,'bust-point',bp,'BP');
  sf.preRotation.forEach((ps,i)=>trace(7,'pre-rotation-'+i,ps,'Side-front contour before dart transfer',true));
  if(dart){const a=dart[0],z=dart[2],start=Math.atan2(a.y-bp.y,a.x-bp.x);let delta=Math.atan2(z.y-bp.y,z.x-bp.x)-start;while(delta>Math.PI)delta-=2*Math.PI;while(delta< -Math.PI)delta+=2*Math.PI;notations[7].push({angle:{o:bp,start,delta},label:`Dart transfer angle · ${fmt(Math.abs(delta)*180/Math.PI)}°`,lines:[]});}
  trace(7,'front-axis',[m(2,'SH'),bp],'Locate the transferred shoulder opening from BP',true);
  [0,1].forEach(i=>{measure(8,V(m(i,'4').x,-p.hipDepth),m(i,'4'),`Above hip · ${p.princessAboveHip} cm`);mark(8,'back-control-'+i,m(i,'6'),'6');});
  [2,3].forEach(i=>{mark(8,'front-control-'+i,m(i,'0.3'),'0.3');mark(8,'front-waist-'+i,m(i,'W'),'W');});
  measure(8,bp,m(2,'BP'),`Side-front BP shaping · ${p.bpSideShave} cm`);
  measure(8,m(2,'SH'),m(2,'7'),`Side-front shoulder control · ${p.sfCtrlFromSh} cm along its guide`);
  // Reveal resolved seams only after their landmark and transfer operations.
  d.panels.forEach((panel,i)=>panel.seams.forEach((seam,j)=>{
    const step=/Hem$/.test(seam.name)?11:i<2?9:10;
    trace(step,'resolved-'+i+'-'+j,seam.points,`${panel.name} · ${seam.name.split('-').at(-1).replace('PrincessSeam','princess seam').toLowerCase()}`);
  }));
  // Fullness dimensions precede hem contour construction.
  const hemNotes=[];
  [0,1,2,3].forEach((i)=>{const q=m(i,'HEM'),base=V(m(i,'H').x,-p.dressLength);hemNotes.push({points:[base,q],label:`${d.panels[i].name} princess hem · ${fmt(Math.abs(q.x-base.x))} cm horizontal flare`,lines:[]});});
  [1,2].forEach(i=>{const q=m(i,'HEM',1),base=V(i===1?d.backHip:b.cfX-d.frontHip,-p.dressLength),flat=V(q.x,-p.dressLength),fold=V(i===1?0:b.cfX,-p.dressLength);hemNotes.push(
    {points:[base,flat],label:`${i===1?'Back':'Front'} side hem · ${fmt(Math.abs(flat.x-base.x))} cm flare`,lines:[]},
    {points:[flat,q],label:`Side hem raised · ${p.sideHemRaise} cm`,lines:[]},
    {points:[fold,flat],fractions:[2/3],label:`${i===1?'Back':'Front'} side hem · ⅔ curve control`,lines:[]}
  );});
  d.panels.forEach((panel,i)=>panel.notches.forEach((q,j)=>{mark(12,'sewing-'+i+'-'+j,q,panel.notchIds[j]);measure(12,q,q,`${panel.name} · ${panel.notchIds[j].replaceAll('_',' ').replaceAll('.',' / ')}`);}));
  PrincessDress.laidOutPanels(d,0).forEach((panel,i)=>{trace(13,'cut-panel-'+i,PrincessDress.closeRing(panel.outline),panel.name+' · complete stitch outline');panel.notches.forEach((q,j)=>{mark(13,'final-notch-'+i+'-'+j,q,'');measure(13,q,q,`${panel.name} · ${d.panels[i].notchIds[j].replaceAll('_',' ').replaceAll('.',' / ')} mark`);});});
  // Assemble pedagogical phases explicitly: every back dependency is resolved
  // before introducing the front. Source-block comparison is intentionally omitted.
  const ordered=[],notes=[],steps=[];
  function phase(title,copy,start,end,selections){
    const layer={lines:[],points:[]},ns=[];
    for(const [source,indices,pointIds=[]] of selections){
      const chosen=indices.map(i=>notations[source][i]);ns.push(...chosen);
      const ids=new Set(chosen.flatMap(n=>n.lines||[]));
      layer.lines.push(...sets[source].lines.filter(l=>ids.has(l.id)));
      layer.points.push(...sets[source].points.filter(q=>pointIds.includes(q.id)));
    }
    ordered.push(layer);notes.push(ns);steps.push([title,copy,start,end]);return ordered.length-1;
  }
  const all=i=>notations[i].map((_,j)=>j);
  phase('Back · align waist and length','Keep the back waist at y = 0. Align the back skirt with the bodice; locate the hip [18 cm] below the waist and the hem [50 cm] below it.',766,780,[[1,[0,3,5,6,7]]]);
  // The shared level guides stop at the back side; no front geometry appears yet.
  ordered[0].lines=ordered[0].lines.map(l=>l.id.startsWith('dress-level')?{...l,points:[l.points[0],V(b.sideX,l.points[0].y)]}:l);
  phase('Back · neck and shoulder','Widen the back neck by [0.5 cm]. Lower the shoulder tip by [0.5 cm] to establish its new slope.',725,739,[[2,[0,2],['neck-0']]]);
  phase('Back · armhole landmarks','Inset the back-width guide [0.4 cm]. Raise the underarm [0.5 cm], then move it [1 cm] toward centre back. The armhole midpoint receives a further [0.2 cm] inward refinement.',715,764,[[3,[0,2,3],['back-UA']]]);
  phase('Back · waist and hip',`Set the waist to [(68 + 3) / 4 − 0.75 = ${fmt(d.backWaist)} cm] and hip to [(90 + 4) / 4 − 1 = ${fmt(d.backHip)} cm]. Allocate [${fmt(d.backDart)} cm] to the princess intake; the remaining reduction shapes the side.`,785,807,[[4,[0,2,4]]]);
  phase('Back · shoulder dart and princess axis','Measure [5.5 cm] along the shoulder from the widened neck; open a [1.5 cm] shoulder dart. Locate the princess axis through the midpoint of the inset back width, then establish its waist and hip points.',865,884,[[5,all(5),sets[5].points.map(q=>q.id)]]);
  phase('Back · princess controls','Locate each upper control by travelling [6 cm] toward the shoulder along its provisional princess seam, starting at the BP-height intersection. Shape the bust-to-waist midpoint inward [0.2 cm] on each edge and locate the lower controls [4 cm] above the hip.',930,1008,[[8,[0,1],['back-control-0','back-control-1']]]);
  phase('Back · hem endpoints','Of the [32 cm] total fullness, allocate [32 × 3 / 16 = 6 cm] to the back side and [32 × 4 / 16 = 8 cm] across all back princess edges of the full garment. On this half-pattern the side flare is [3 cm] and each princess edge adds [2 cm]. Raise the side hem [0.5 cm] and locate its curve control at [⅔] of the fold-to-side span.',809,828,[]);
  notes.at(-1).push(...[0,1,4,5,6].map(i=>hemNotes[i]));
  phase('Back · resolve both panels','Join the established landmarks to draw centre-back and side-back neck, shoulder, armhole, side and princess contours. Each edge is drawn separately after its notation.',1009,1080,[[9,all(9)]]);
  phase('Back · close hems and mark seams','Close the two back hems using their established endpoints. Add corresponding princess, waist and hip marks; the side back also receives side-seam balance marks.',1112,1255,[[11,[0,1]],[12,all(12).slice(0,d.panels[0].notches.length+d.panels[1].notches.length),sets[12].points.filter(q=>/^sewing-[01]-/.test(q.id)).map(q=>q.id)]]);
  phase('Front · align the waist','Lift the front bodice [6.8 / 2 = 3.4 cm] to bring its dropped waist to y = 0. Align the front skirt to the same waist, hip and hem levels as the completed back.',766,780,[[1,[1,2,4]]]);
  phase('Front · neck and shoulder','Widen the front neck [0.5 cm] toward the shoulder and lower the shoulder tip [0.5 cm], measured from the lifted front block.',725,739,[[2,[1,3],['neck-1']]]);
  phase('Front · armhole landmarks','Inset the chest-width guide [0.4 cm]. From the lifted underarm, rise [0.5 cm] and move [1 cm] toward centre front. Refine the armhole midpoint inward [0.2 cm].',715,764,[[3,[1,4],['front-UA']]]);
  notes.at(-1).splice(1,0,{points:[V(b.underarm.x,b.underarm.y+lift),V(b.underarm.x,fu.y)],label:'Front underarm rise · 0.5 cm',lines:[]});
  phase('Front · waist and hip',`Set the waist to [(68 + 3) / 4 + 0.75 = ${fmt(d.frontWaist)} cm] and hip to [(90 + 4) / 4 + 1 = ${fmt(d.frontHip)} cm]. Allocate [${fmt(d.frontDart)} cm] to the princess intake.`,785,807,[[4,[1,3,5]]]);
  phase('Front · hem endpoints','Allocate [32 × 4 / 16 = 8 cm] to the front side and [32 × 5 / 16 = 10 cm] across all front princess edges of the full garment. On this half-pattern the side flare is [4 cm] and each princess edge adds [2.5 cm]. Raise the side hem [0.5 cm] and locate its [⅔] curve control.',809,828,[]);
  notes.at(-1).push(...[2,3,7,8,9].map(i=>hemNotes[i]));
  phase('Front · balance against the back',`Compare the front side with the established back side. The excess [front side − back side = ${fmt(d.sideDart)} cm] forms the side dart. Locate BP and both dart legs before opening the shoulder.`,839,863,[[6,all(6),['bust-point']]]);
  const transfer=d.dartTransfer;
  const prep=phase('Front · prepare the shoulder opening','Locate the shoulder opening [5.5 cm] from the front side-neck point. Join it to BP. The upper side-front region can now turn about BP while the lower region stays fixed.',906,916,[]);
  const add=(id,ps,label,guide=true)=>{ordered.at(-1).lines.push({id,points:ps,label,guide});notes.at(-1).push({points:ps,label,lines:[id],curve:ps.length>2});};
  notes.at(-1).push({points:[frontSnp,transfer.shoulder],label:'Front shoulder opening · 5.5 cm',lines:[]});
  add('transfer-upper-start',transfer.upperBefore,'Outline the upper side-front region');
  add('transfer-lower-fixed',transfer.lowerSide,'Keep the lower side front stationary');
  const turn=phase('Front · rotate around BP',`Keep BP fixed. Turn the upper side front through [${fmt(Math.abs(transfer.angle)*180/Math.PI)}°] to align the side-dart directions and transfer the opening to the shoulder. The upper region moves as one rigid piece; the lower side stays in place.`,917,929,[]);
  ordered[prep].hideAfter=turn;
  // Keep the grey starting contour and fixed lower side as reference while the
  // blue upper piece rotates; remove these temporary guides after transfer.
  const rotation={pivot:transfer.pivot,angle:transfer.angle,from:transfer.upperBefore};
  ordered[turn].lines.push({id:'side-front-upper-rotation',points:transfer.upperAfter,guide:false,rotation});
  notes[turn].push({angle:{o:bp,start:Math.atan2(transfer.dartUpper.y-bp.y,transfer.dartUpper.x-bp.x),delta:transfer.angle},label:`Rotate upper side front around BP · ${fmt(Math.abs(transfer.angle)*180/Math.PI)}°`,lines:['side-front-upper-rotation'],rotation:true});
  ordered[turn].hideAfter=turn;
  ordered[turn].points.push({id:'rotation-pivot',p:bp,label:'BP · fixed'});
  phase('Front · refine transferred controls','After transfer, shape BP [0.3 cm] toward the side. Refine the centre-front shoulder opening [1 cm] toward the dart, trim the side-front tip [0.7 cm], and move its princess shoulder point [0.7 cm] toward centre front. Set the upper control [7 cm] along the shoulder-to-BP guide and midpoint shaping [0.3 cm].',930,1008,[[8,[2,3],['front-control-2','front-control-3','front-waist-2','front-waist-3']]]);
  phase('Front · resolve both panels','Draw the centre-front and side-front contours through the transferred and refined landmarks. Connect their waist and hip shaping into continuous princess seams; reveal each edge separately.',1081,1111,[[10,all(10)]]);
  phase('Front · close hems and mark seams','Close the front hems through their established fullness endpoints. Add the paired princess, waist and hip marks, plus the side-front balance marks.',1112,1255,[[11,[2,3]],[12,all(12).slice(d.panels[0].notches.length+d.panels[1].notches.length),sets[12].points.filter(q=>/^sewing-[23]-/.test(q.id)).map(q=>q.id)]]);
  phase('Separate the four panels','Lay out centre back, side back, side front and centre front with their sewing marks. These are the actual engine stitch outlines, before seam allowance.',1112,1131,[[13,all(13),sets[13].points.map(q=>q.id)]]);
  // Highlight only the relevant back/front expressions, even where the engine
  // calculates the two sides together in the same source function.
  const ranges=[
    [[707,709]], [[725,728]], [[716,716],[718,720],[741,741],[745,750],[755,757]],
    [[785,785],[787,787],[789,789],[802,804],[806,806]], [[865,884]], [[879,902]],
    [[809,819],[874,876]], [[1023,1052]], [[1028,1028],[1045,1045],[1085,1095],[1214,1237]],
    [[766,780]], [[730,739],[770,774]], [[717,717],[721,723],[742,744],[746,746],[751,754],[758,764],[775,778]],
    [[786,786],[788,788],[790,790],[803,803],[805,805],[807,807]], [[820,828],[951,966]],
    [[839,863]], [[906,916]], [[917,929]], [[930,998]], [[1053,1083]],
    [[1063,1063],[1075,1075],[1085,1093],[1096,1097],[1214,1237]], [[1112,1212]]
  ];
  steps.forEach((step,i)=>step[4]=ranges[i]);
  return {sets:ordered,steps,notations:notes};
})();
