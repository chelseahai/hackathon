/* Presentation layers use the existing block engines; all dimensions are centimetres. */
window.BasicSequences = (() => {
  const V=(x,y)=>({x,y}), lerp=(a,b,t)=>V(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t);
  const fmt=n=>Number(n.toFixed(2)).toString();
  const layer=()=>({lines:[],points:[]});
  const line=(l,id,points,guide=false)=>l.lines.push({id,points,guide});
  const point=(l,id,p,label=id)=>l.points.push({id,p,label});
  const box=(x,y,w,h)=>[V(x,y),V(x+w,y),V(x+w,y+h),V(x,y+h),V(x,y)];
  const bodyRules=[
    'Back length is a body input: 38 cm. Set the waist at y = 0 and the top at y = 38; the centre-back axis is a construction guide.',
    'Bust B is 84 cm. [B / 2 + 5 = 47 cm] gives the half-body frame width; 5 cm is the width-ease setting added to this half-body construction.',
    'The depth adjustment is 7 cm. [B / 6 + 7 = 21 cm] sets the armhole depth; [38 − 21 = 17 cm] locates the bust line above the waist.',
    'The back-width adjustment is 4.5 cm. [B / 6 + 4.5 = 18.5 cm] places the vertical back-width guide from centre back.',
    'The chest-width adjustment is 3 cm. [B / 6 + 3 = 17 cm] is measured from centre front; [47 − 17 = 30 cm] gives its x coordinate.',
    'Bisect the space between the width guides: [(18.5 + 30) / 2 = 24.25 cm]. Its intersection with the bust line is the shared underarm point.',
    'Use [B / 12 = 7 cm] for the back-neck width and [7 / 3 ≈ 2.33 cm] for its rise above the top line. Draw the back-neck arc with a horizontal tangent at centre back.',
    'The width reduction is 0.2 cm: [7 − 0.2 = 6.8 cm]. The depth addition is 1 cm: [7 + 1 = 8 cm]. Drop the side-neck point 0.5 cm. On the 45° guide use [6.8 / 2 − 0.3 = 3.1 cm]; 0.3 cm is the curve adjustment.',
    'Drop one back-neck height: [7 / 3 ≈ 2.33 cm] on the back-width guide. Extend 2 cm outward, the shoulder-extension setting, and join to the back side-neck point.',
    'Drop two neck heights: [2 × 7 / 3 ≈ 4.67 cm]. Set the front shoulder length to [back shoulder length − 1.8 cm]; 1.8 cm is the shoulder-length difference. Find its endpoint on the drop line.',
    'Half the armhole depth is [21 / 2 = 10.5 cm]. The back armhole width is [24.25 − 18.5 = 5.75 cm]. Its 45° distance is [5.75 / 2 + 0.5 = 3.375 cm]; 0.5 cm adds curve fullness. Interpolate shoulder, midpoint, bisector point and underarm.',
    'Use the same half-depth level and the back armhole width for the front 45° distance: [5.75 / 2 = 2.875 cm]. Interpolate underarm, bisector point, front midpoint and shoulder.',
    'The waist shift is 2 cm toward centre back: [24.25 − 2 = 22.25 cm]. Connect the corrected waist point to the underarm and centre-back waist. Trace the centre-back outline up to the neck.',
    'The chest midpoint is [(30 + 47) / 2 = 38.5 cm]. Shift 0.7 cm toward the armhole: [38.5 − 0.7 = 37.8 cm]. Drop 4 cm below the bust line: [17 − 4 = 13 cm]. These two shaping offsets locate BP.',
    'Use half the front-neck width for balance: [6.8 / 2 = 3.4 cm]. Lower the centre-front hem by this amount, project horizontally to the BP vertical, then connect the hem through to the corrected side waist.',
    'Measure each armhole along its curve from the shoulder. Place each sleeve notch at [armhole arc length / 2 + 3 cm], limited to the curve length. The 3 cm setting advances the notch from the arc midpoint toward the underarm.'
  ];
  const s=SkirtBlock.draftSkirt({hip:90,waist:68,skirtLength:50}), S=Array.from({length:7},layer);
  line(S[0],'skirt-frame',box(0,0,s.cfX,s.hemY),true);point(S[0],'CB',V(0,0));point(S[0],'CF',V(s.cfX,0));
  line(S[1],'hip-line',[V(0,s.hlY),V(s.cfX,s.hlY)],true);line(S[1],'side-axis',[V(s.sideX,0),s.sideHem],true);point(S[1],'HL',s.hip);
  line(S[2],'back-waist-measure',[V(0,0),s.backWaistMark],true);line(S[2],'front-waist-measure',[V(s.cfX,0),s.frontWaistMark],true);point(S[2],'B-W',s.backWaistMark);point(S[2],'F-W',s.frontWaistMark);
  line(S[3],'cb-drop',[V(0,0),s.cbWaist],true);
  line(S[3],'back-side-take',[V(s.sideX,0),V(s.backSideWaist.x,0)],true);
  line(S[3],'front-side-take',[V(s.sideX,0),V(s.frontSideWaist.x,0)],true);
  line(S[3],'back-side-rise',[V(s.backSideWaist.x,0),s.backSideWaist],true);
  line(S[3],'front-side-rise',[V(s.frontSideWaist.x,0),s.frontSideWaist],true);
  point(S[3],'B-SW',s.backSideWaist);point(S[3],'F-SW',s.frontSideWaist);
  line(S[4],'back-waist',s.backWaistCurve);line(S[4],'front-waist',s.frontWaistCurve);
  const hipCtrl=V(s.sideX,s.hlY+18/3);line(S[5],'side-controls',[s.backSideWaist,hipCtrl,s.frontSideWaist],true);point(S[5],'HC',hipCtrl);line(S[5],'back-side',s.backSide);line(S[5],'front-side',s.frontSide);
  line(S[6],'back-fold',[s.cbWaist,s.cbHem]);line(S[6],'front-fold',[s.cfWaist,s.cfHem]);line(S[6],'hem',[s.cbHem,s.sideHem,s.cfHem]);
  const skirtSteps=[
    ['Length and frame','Hip H = 90 cm and waist W = 68 cm are body inputs. Length is set to 50 cm. [H / 2 + 2 = 47 cm] gives the half-skirt width; 2 cm is the half-skirt hip-ease setting.',389,392],
    ['Hip and side guides','Hip depth is set to 18 cm below the waist. Shift the side 1 cm toward the back: [47 / 2 − 1 = 22.5 cm]. The front hip width is [47 − 22.5 = 24.5 cm].',393,395],
    ['Waist allocation','The quarter waist is [68 / 4 = 17 cm]. Use the 1 cm side shift and 0.5 cm waist ease: back [17 − 1 + 0.5 = 16.5 cm], front [17 + 1 + 0.5 = 18.5 cm]. Mark these target widths on the waist guide.',390,400],
    ['Waist balance','Both hip-to-waist differences are 6 cm: [22.5 − 16.5 = 6] and [24.5 − 18.5 = 6]. Take one third at each side: [6 / 3 = 2 cm]. Raise the side waist 0.7 cm and lower centre back 1 cm; both are balance settings.',414,419],
    ['Waist curves','Keep the initial [1 / 3] of the back waist straight and [2 / 3] of the front waist straight, then blend to the raised side points. These fractions are curve-shape settings.',425,427],
    ['Side shaping','Set the hip control one third of the depth above HL: [−18 + 18 / 3 = −12 cm]. Interpolate each side from its waist point through this control to the hip, then continue to the hem.',429,435],
    ['Complete the outlines','Close each piece with the centre fold and hem. The current block resolves side shaping and records target waist marks; the remaining [6 − 2 = 4 cm] per piece is not converted into skirt darts in this engine.',420,435]
  ];
  const b=BodyBlock.draftBody({bust:84,backLength:38});
  const sl=SleeveBlock.draftSleeve({frontAh:b.frontArmholeLen,backAh:b.backArmholeLen}), L=Array.from({length:8},layer);
  const ah=b.frontArmholeLen+b.backArmholeLen;
  line(L[0],'sleeve-axis',[sl.peak,V(0,sl.cuffY)],true);point(L[0],'P',sl.peak);point(L[0],'O',V(0,0));
  line(L[1],'front-diagonal',[sl.peak,sl.frontUnderarm],true);line(L[1],'back-diagonal',[sl.peak,sl.backUnderarm],true);line(L[1],'underarm',[sl.backUnderarm,sl.frontUnderarm],true);point(L[1],'F-UA',sl.frontUnderarm);point(L[1],'B-UA',sl.backUnderarm);
  line(L[2],'elbow',[V(sl.backUnderarm.x,sl.elbowY),V(sl.frontUnderarm.x,sl.elbowY)],true);line(L[2],'cuff-guide',[sl.backCuff,sl.frontCuff],true);
  [[.25,sl.frontOffsetUpper],[.75,sl.frontOffsetLower]].forEach(([t,p],i)=>{line(L[3],'front-offset'+i,[lerp(sl.peak,sl.frontUnderarm,t),p],true);point(L[3],'F'+(i+1),p);});
  const lt=.5+2.5/(b.backArmholeLen+1);
  [[.25,sl.backOffsetUpper],[(lt+1)/2,sl.backOffsetLower]].forEach(([t,p],i)=>{line(L[4],'back-offset'+i,[lerp(sl.peak,sl.backUnderarm,t),p],true);point(L[4],'B'+(i+1),p);});point(L[4],'Locator',sl.backLocator);
  line(L[5],'back-cap',sl.backCap);line(L[5],'front-cap',sl.frontCap);line(L[6],'front-seam',sl.frontSeam);line(L[6],'back-seam',sl.backSeam);
  [sl.cuffBackMid,sl.cuffCenter,sl.cuffFrontMid].forEach((p,i)=>{line(L[7],'cuff-offset'+i,[V(p.x,sl.cuffY),p],true);point(L[7],'C'+(i+1),p);});line(L[7],'cuff',sl.cuff);
  const sleeveSteps=[
    ['Armhole to cap height',`Use the bodice curve lengths: front ${fmt(b.frontArmholeLen)} cm and back ${fmt(b.backArmholeLen)} cm. [AH = front + back = ${fmt(ah)} cm]. Cap height is [AH / 3 − 1 = ${fmt(sl.capHeight)} cm]; 1 cm is the cap-height reduction.`,348,354],
    ['Diagonal framework',`Front diagonal equals the front armhole arc. Back diagonal adds 1 cm ease: [${fmt(b.backArmholeLen)} + 1 = ${fmt(b.backArmholeLen+1)} cm]. Solve each horizontal run with [√(diagonal² − cap height²)], back to the left and front to the right.`,360,373],
    ['Length and elbow','Sleeve length is set to 52 cm from cap peak. Locate the elbow [52 / 2 + 2.5 = 28.5 cm] below the peak; 2.5 cm is the elbow extension. Cuff height is [cap height − 52 cm].',356,380],
    ['Front cap controls','Divide the front diagonal into quarters. At [1 / 4] move 1.8 cm outward perpendicular to it; at [3 / 4] move 1.5 cm inward. The two offsets are cap-shape settings.',382,384],
    ['Back cap controls','At [1 / 4] move 1.5 cm outward. Locate a point 2.5 cm past the diagonal midpoint; halfway from that locator to the underarm, move 0.5 cm inward. These distances control the back cap fullness.',386,400],
    ['Interpolate the cap','Draw the continuous cap through back underarm, back lower and upper controls, peak, front upper and lower controls, then front underarm. Split the curve at the peak for front and back arc measurements.',402,417],
    ['Underarm seams','Extend each underarm vertically to the cuff level. Seam length is [52 − cap height]; no additional taper is applied to these two straight edges.',374,377],
    ['Cuff balance','At each half-width, lower the back cuff 1 cm and raise the front 0.5 cm. Lower the centre 0.3 cm. These three cuff-balance settings define the curve between the seam ends.',419,425]
  ];
  const t=TrouserBlock.draftTrouser({}), T=Array.from({length:12},layer), shift=p=>V(p.x+39,p.y);
  const bl=(i,id,ps,guide=false)=>line(T[i],id,ps.map(shift),guide), bp=(i,id,p)=>point(T[i],id,shift(p));
  line(T[0],'front-frame',box(0,0,t.frontHip,t.hemY),true);line(T[0],'crotch-level',[V(0,t.clY),V(34,t.clY)],true);point(T[0],'WL',V(0,0));point(T[0],'CL',V(0,t.clY));
  line(T[1],'crotch-width',[t.point4,t.crotchCorner,t.point5],true);point(T[1],'4',t.point4);point(T[1],'5',t.point5);
  line(T[2],'crease',[V(t.creaseX,0),V(t.creaseX,t.hemY)],true);line(T[2],'knee-level',[V(0,t.klY),V(34,t.klY)],true);line(T[2],'leg-guides',[t.waistCorner,t.point4,t.hemSide,t.hemInseam,t.point5],true);point(T[2],'K-S',t.kneeSide);point(T[2],'K-I',t.kneeInseam);
  line(T[3],'hip-level',[t.hlSide,t.hip11],true);line(T[3],'rise-thirds',t.riseThirds,true);t.riseThirds.forEach((p,i)=>point(T[3],'R'+i,p));line(T[3],'centre-front',[t.cfWaist,t.hip11]);point(T[3],'CF',t.cfWaist);
  line(T[4],'crotch-triangle',[t.hip11,t.point5,t.crotchCorner,t.hip11],true);line(T[4],'bisector',t.crotchThirds,true);t.crotchThirds.forEach((p,i)=>point(T[4],'⅓-'+i,p));line(T[4],'front-crotch',t.crotch);
  line(T[5],'waist-guide',t.waistGuide,true);line(T[5],'front-waist',t.waist);point(T[5],'D1',t.dartCfApex);point(T[5],'D2',t.dartSideApex);
  line(T[6],'front-side',t.side);line(T[6],'front-inseam',t.inseam);line(T[6],'front-hem',t.hem);point(T[6],'H',t.hemMid);
  bl(7,'back-frame',box(0,0,t.frontHip,t.hemY),true);bl(7,'back-rise',[t.backBase,t.backCbMark,t.backCbWaist],true);bl(7,'back-extension',[t.backBase,t.backCrotchOnCl,t.backCrotchTip],true);bp(7,'CB',t.backCbWaist);bp(7,'B-TIP',t.backCrotchTip);
  bl(8,'back-hip',[t.backCbHl,t.backHlSide],true);bl(8,'back-leg',[t.backKneeSide,t.backHemSide,t.backHemInseam,t.backKneeInseam],true);bl(8,'back-waist-guide',t.backWaistGuide,true);bp(8,'B-SW',t.backSideWaist);
  bl(9,'back-crotch',t.backCrotch);bl(9,'back-cb',t.backCb);bp(9,'B-CTRL',t.backCrotchCtrl);
  bl(10,'back-waist',t.backWaist);bp(10,'D3',t.backDartApex);
  bl(11,'back-side',t.backSide);bl(11,'back-inseam',t.backInseam);bl(11,'back-hem',t.backHem);[t.backWaistHipOut,t.backCrotchKneeIn,t.backInseamUpper,t.backInseamLower,t.backHemMid].forEach((p,i)=>bp(11,'B'+i,p));
  const trouserSteps=[
    ['Front rectangle','Hip H = 90 cm and waist W = 68 cm are body inputs. Length is set to 98 cm, rise to 26 cm. [H / 4 + 1.5 = 24 cm] sets front hip width; 1.5 cm is front hip ease.',639,646],
    ['Crotch extension','Indent the side 0.5 cm at the crotch level. Front extension is [24 / 4 − 1 = 5 cm]; 1 cm is the extension reduction. The tip lies at [24 + 5 = 29 cm].',648,656],
    ['Crease, knee and hem','Crease x is [(0.5 + 29) / 2 = 14.75 cm]. Knee y is [(−26 − 98) / 2 + 4 = −58 cm]; 4 cm raises the midpoint. Split the 19 cm hem equally: [19 / 2 = 9.5 cm]. Inset the side knee 1 cm from its auxiliary line.',658,674],
    ['Hip level and centre front','Divide the rise into thirds: [26 / 3 ≈ 8.67 cm]. HL is [−26 + 26 / 3 ≈ −17.33 cm]. Inset centre front 0.7 cm from the frame: [24 − 0.7 = 23.3 cm].',676,685],
    ['Front crotch curve','Intersect the 45° corner bisector with the diagonal from hip to crotch tip. Use [2 / 3] of that bisector as the curve control. Preserve a vertical tangent at the hip and a horizontal tangent at the tip.',687,698],
    ['Front waist and darts','Allow two 2.5 cm darts: [W / 4 + 2 × 2.5 = 22 cm]. Raise the side waist 0.5 cm. Centre the first dart on the crease, and the second in the remaining waist span. Dart lengths are set to 11 and 10 cm.',700,743],
    ['Front leg contours','Shape the side through hip, crotch and knee with a 0.2 cm hollow above the knee. Shape the inseam with a 0.3 cm hollow. Lift the hem centre 0.5 cm. These are the contour settings.',745,760],
    ['Back rise and extension','The back is displayed alongside the front. Add 4 cm to front extension: [5 + 4 = 9 cm], then drop the tip 1 cm. Inset the back waist mark 5 cm and extend its sloping rise axis 1.5 cm upward.',762,773],
    ['Back widths','Back hip width is [90 / 4 + 1.5 = 24 cm]. Back waist includes one 3 cm dart: [68 / 4 + 3 = 20 cm]. Solve the horizontal waist span from that length and the rise difference. Add 1 cm at each knee and hem edge.',774,787],
    ['Back crotch and rise','Move the front crotch control 0.7 cm inward. Interpolate the back curve with a tangent aligned to the sloping centre back at the hip, and a horizontal tangent at the lowered crotch tip.',797,808],
    ['Back dart','Centre the 3 cm dart along the back waist guide: [waist arc / 2 − 3 / 2] locates its first leg. Place the apex 12 cm inward perpendicular to the local waist direction.',810,839],
    ['Back leg contours','Use 0.3 cm outward shaping above the hip and 0.4 cm inward shaping above the knee. At [1 / 3] and [2 / 3] of the upper inseam, hollow 1.3 and 1 cm. Lower the hem centre 0.5 cm to finish.',789,864]
  ];
  return {bodyRules,skirt:{sets:S,steps:skirtSteps},sleeve:{sets:L,steps:sleeveSteps},trousers:{sets:T,steps:trouserSteps}};
})();
