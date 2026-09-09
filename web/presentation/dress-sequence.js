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
  const steps=[
    ['Begin with two blocks','Use the reference bodice and skirt: bust 84, waist 68, hip 90 and back length 38 cm. The skirt is displayed beside the bodice so their starting geometry can be read separately.',688,705],
    ['Register waist and length','Keep the waist at y = 0. Lift the front bodice by [6.8 / 2 = 3.4 cm] to align its dropped waist. Set hip depth to 18 cm and waist-to-hem length to 50 cm.',766,780],
    ['Open the neck and lower the shoulders','Widen both necklines by 0.5 cm and lower the shoulder tips by 0.5 cm. These settings establish the upper landmarks before the panels are resolved.',725,739],
    ['Reshape the armhole','Inset the back and chest width guides by 0.4 cm. Raise the underarm 0.5 cm, then move it 1 cm inward on each side. Refine the sampled armhole midpoint inward by 0.2 cm.',715,764],
    ['Allocate waist and hip shaping',`Add 3 cm ease to the full waist and 4 cm to the full hip. Back/front waist targets are [(68 + 3) / 4 ∓ 0.75 = ${fmt(d.backWaist)} / ${fmt(d.frontWaist)} cm]; hip targets are [(90 + 4) / 4 ∓ 1 = ${fmt(d.backHip)} / ${fmt(d.frontHip)} cm]. Divide each hip-to-waist difference between the princess intake and side shaping. Reference princess intake is ${fmt(d.backDart)} cm at the back and ${fmt(d.frontDart)} cm at the front.`,785,807],
    ['Locate the back princess line','Begin the back shoulder dart 5.5 cm from the side-neck point, with a 1.5 cm opening. Use the midpoint of the inset back width as the back princess axis, then place its waist and hip landmarks.',865,884],
    ['Balance the front side seam',`Compare front and back side lengths. Their positive difference sets the side-dart intake: [front side − back side = ${fmt(d.sideDart)} cm]. Locate its legs on the front side through the bust-level balance point.`,839,863],
    ['Transfer the dart toward the shoulder','Use BP as the rotation centre. Measure the angle between the side-dart legs, then use it to transfer the opening to the shoulder. The grey pre-transfer contour and the resulting shoulder guide show the recorded construction; the resolved panel contours follow below.',906,929],
    ['Refine the princess controls','Shape the side-front BP by 0.3 cm. The front shoulder refinement uses 1 cm toward the opening and a 0.7 cm tip trim; the side-front shoulder point moves 0.7 cm toward centre front. Place its upper control 7 cm along the shoulder-to-BP guide. Use 0.2 cm back and 0.3 cm front midpoint shaping, plus controls 4 cm above the hip.',930,1008],
    ['Draft the back panels','Connect the established back landmarks into the centre-back and side-back panels. Interpolate the princess seam through its upper and lower controls, then resolve neck, shoulder, armhole, side and centre edges. Each contour is revealed separately.',1009,1080],
    ['Draft the front panels','Use the transferred shoulder opening and refined BP controls to resolve centre-front and side-front contours. Preserve the shaped waist and hip while joining the continuous princess seams.',1081,1111],
    ['Distribute fullness and finish the hem','Total horizontal hem fullness is 32 cm. Allocate it to back side, back princess, front side and front princess groups in [3 : 4 : 4 : 5] shares. Split each princess allocation across its two edges. Raise the side hems 0.5 cm and use the [⅔] hem control to blend the side-panel curves.',951,981],
    ['Place the sewing marks','Mark corresponding upper-princess, waist and hip locations on each paired seam. Side panels also carry side-waist and side-hip marks. These are sewing correspondences; the presentation does not assert that physical fit has been verified.',1112,1255],
    ['Separate the four panels','Lay out centre back, side back, side front and centre front with their sewing marks. These are the actual engine stitch outlines, before seam allowance.',1112,1131]
  ];
  // Locate the hem endpoints before drawing any princess or side contour that
  // depends on them. The actual hem curves are closed after those contours.
  sets.splice(9,0,{lines:[],points:[]});
  notations.splice(9,0,hemNotes);
  steps.splice(9,0,['Locate the hem fullness','Set total horizontal fullness to 32 cm. Distribute it in [3 : 4 : 4 : 5] group shares, then split each princess allocation between its two panel edges. Locate these endpoints before drafting the long princess contours. Side hems rise 0.5 cm and their curve control lies at [⅔] of the fold-to-side hem span.',809,828]);
  steps[12][0]='Close the hem contours';
  steps[12][1]='Use the established fullness endpoints to close the four panel hems. Centre panels join their fold endpoints; side panels blend through the [⅔] control to the side hem raised by 0.5 cm.';
  return {sets,steps,notations};
})();
