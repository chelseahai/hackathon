/* Execute the actual browser geometry/export files, without a DOM or localStorage.
   This verifies browser-source math; it is not a browser UI test. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(process.argv[2]);
const cases = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const context = vm.createContext({});
context.window = context;
for (const file of ['BasicBlock-Bodice.js', 'BasicBlock-Skirt.js',
  'GarmentDesign-PrincessLineDress.js', 'Export-DXF/dxf.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, 'web', file), 'utf8'), context, {filename:file});
}
const api = context.window.PrincessDress;
const xy = p => [p.x,p.y];
const seam = s => ({name:s.name, kind:s.kind, points:s.points.map(xy),
  knots:(s.knots||[]).map(xy), spans:(s.spans||[]).map(a=>a.map(xy)), center:s.center?xy(s.center):null});
const panel = p => ({name:p.name, outline:p.outline.map(xy), notches:p.notches.map(xy),
  marks:p.marks.map(m=>({label:m.label,pt:xy(m.pt)})), seams:p.seams.map(seam)});
const metricKeys = ['backWaist','frontWaist','backHip','frontHip','backDart','frontDart',
  'backSideLen','frontSideLen','sideDart','dressLength'];
const results = cases.map(c => {
  const params = Object.fromEntries(Object.entries(c.params).map(([k,v])=>[k.replace(/_([a-z])/g,(_,a)=>a.toUpperCase()),v]));
  const d = api.draftPrincessDress(params);
  if(d.error) return {id:c.id,error:d.error};
  const laid = api.laidOutPanels(d,d.params.seamAllowance);
  const pieces = context.window.PatternDxf.piecesFromLaid(laid,d.params.seamAllowance,api.offsetClosed,api.closeRing);
  return {id:c.id, snapshot:{metrics:Object.fromEntries(metricKeys.map(k=>[k,d[k]])),
    panels:d.panels.map(panel), laid:laid.map(panel),
    cuts:pieces.map(p=>(p.cut||[]).map(xy))}, dxf:context.window.PatternDxf.fromPieces(pieces)};
});
process.stdout.write(JSON.stringify(results));
