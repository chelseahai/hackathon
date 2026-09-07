"""Read-only drafting validation. Writes only to --out; never changes geometry/store.

Requires Python 3.10+, Node.js, and requirements.txt. Exit 1 = engineering check
failure; --strict also exits 1 for open sewing/outline review findings.
"""
from __future__ import annotations

import argparse
import csv
import dataclasses
import hashlib
import html
import importlib.util
import io
import json
import math
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import ezdxf
from ezdxf.path import make_path
from shapely.geometry import LineString, Point, Polygon
from shapely.validation import explain_validity

HERE = Path(__file__).resolve().parent
METRICS = ['back_waist','front_waist','back_hip','front_hip','back_dart','front_dart',
           'back_side_len','front_side_len','side_dart','dress_length']


def camel(s):
    return re.sub(r'_([a-z])', lambda m: m[1].upper(), s)


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


def xy(p):
    return [p.x, p.y]


def seam_data(s):
    return dict(name=s.name, kind=s.kind, points=list(map(xy,s.points)),
                knots=list(map(xy,s.knots)), spans=[list(map(xy,a)) for a in s.spans],
                center=xy(s.center) if s.center is not None else None)


def panel_data(p):
    return dict(name=p.name, outline=list(map(xy,p.outline)), notches=list(map(xy,p.notches)),
                marks=[dict(label=m.label,pt=xy(m.pt)) for m in p.marks],
                seams=list(map(seam_data,p.seams)))


def snapshot(d, draft, render):
    laid = draft.laid_out_panels(d,d.params.seam_allowance)
    return dict(metrics={camel(k):getattr(d,k) for k in METRICS},
                panels=list(map(panel_data,d.panels)), laid=list(map(panel_data,laid)),
                cuts=[list(map(xy,p['cut'] or [])) for p in render.dress_dxf_pieces(d)])


def compare(a,b,tol,path='root'):
    """Report structural differences and numeric error, never silently zip truncation."""
    errors=[]
    maximum=0.0
    def walk(x,y,p):
        nonlocal maximum
        if isinstance(x,(float,int)) and not isinstance(x,bool) and isinstance(y,(float,int)):
            delta=abs(x-y)
            if not math.isfinite(x) or not math.isfinite(y):
                errors.append(p+': non-finite number')
            else:
                maximum=max(maximum,delta)
                if delta>tol: errors.append(f'{p}: {x} != {y}')
        elif isinstance(x,dict) and isinstance(y,dict):
            if x.keys()!=y.keys(): errors.append(p+': keys differ')
            for k in x.keys() & y.keys(): walk(x[k],y[k],p+'.'+k)
        elif isinstance(x,list) and isinstance(y,list):
            if len(x)!=len(y): errors.append(p+': array lengths differ')
            for i,(xx,yy) in enumerate(zip(x,y)): walk(xx,yy,f'{p}[{i}]')
        elif x!=y: errors.append(f'{p}: {x!r} != {y!r}')
    walk(a,b,path)
    return {'pass':not errors,'maximum_numeric_difference_cm':maximum,
            'difference_count':len(errors),'examples':errors[:8]}


def top_down(seam):
    pts=list(map(xy,seam.points))
    return LineString(pts if pts[0][1]>pts[-1][1] else pts[::-1])


def height_distance(line,y):
    """Locate a unique crossing; ambiguity must not silently select a landmark."""
    coords=list(line.coords)
    hits=[]
    walked=0.0
    for a,b in zip(coords,coords[1:]):
        length=math.dist(a,b)
        if abs(b[1]-a[1])>1e-12:
            t=(y-a[1])/(b[1]-a[1])
            if -1e-10<=t<=1+1e-10:
                s=walked+min(1,max(0,t))*length
                if not any(abs(s-h)<1e-7 for h in hits): hits.append(s)
        elif abs(y-a[1])<1e-9:
            raise ValueError(f'Horizontal seam at landmark y={y}')
        walked+=length
    if len(hits)!=1: raise ValueError(f'Expected one crossing at y={y}; got {len(hits)}')
    return hits[0]


def seam_rows(d,policy):
    seams={s.name:s for p in d.panels for s in p.seams}
    pairs=[('back_princess','CB','SB','PrincessSeam'),
           ('front_princess','CF','SF','PrincessSeam'),('side','SB','SF','Side')]
    rows=[]
    issues=[]
    for pair,left,right,suffix in pairs:
        a=top_down(seams[f'SEAM-{left}-{suffix}'])
        b=top_down(seams[f'SEAM-{right}-{suffix}'])
        labels=['shoulder','bust-line notch','waist notch','hip notch','hem']
        if pair=='side':
            labels=['underarm','waist reference (unnotched)','hip reference / SF zipper notch','hem']
            sa=[0,height_distance(a,0),height_distance(a,-d.params.hip_depth),a.length]
            sb=[0,height_distance(b,0),height_distance(b,-d.params.hip_depth),b.length]
        else:
            pa=next(p for p in d.panels if any(s.name==f'SEAM-{left}-{suffix}' for s in p.seams))
            pb=next(p for p in d.panels if any(s.name==f'SEAM-{right}-{suffix}' for s in p.seams))
            sa=[0]; sb=[0]
            # First three notches are princess marks in the current panel contract.
            if len(pa.notches)<3 or len(pb.notches)<3: raise ValueError('Missing princess notches')
            for na,nb in zip(pa.notches[:3],pb.notches[:3]):
                for line,n in [(a,na),(b,nb)]:
                    if line.distance(Point(xy(n)))>1e-6:
                        issues.append(f'{pair}: notch not on exported stitch seam')
                sa.append(a.project(Point(xy(na))))
                sb.append(b.project(Point(xy(nb))))
            sa.append(a.length); sb.append(b.length)
        if any(y<=x for ss in [sa,sb] for x,y in zip(ss,ss[1:])):
            raise ValueError(pair+': landmarks are not ordered along the seam')
        for i in range(len(labels)-1):
            la=sa[i+1]-sa[i]; lb=sb[i+1]-sb[i]
            target=policy['ease'][pair]['target_cm']
            rows.append(dict(pair=pair,segment=labels[i]+' → '+labels[i+1],a=left,b=right,
                             a_cm=la,b_cm=lb,difference_cm=lb-la,target_cm=target,
                             review=abs(lb-la-(target or 0))>policy['seam_review_threshold_cm']))
        rows.append(dict(pair=pair,segment='TOTAL',a=left,b=right,a_cm=a.length,b_cm=b.length,
                         difference_cm=b.length-a.length,target_cm=policy['ease'][pair]['target_cm'],
                         review=abs(b.length-a.length)>policy['seam_review_threshold_cm']))
    return rows,issues


def outline_checks(pieces):
    results=[]
    for p in pieces:
        stitch=[xy(v) for v in p['outline']]
        cut=[xy(v) for v in (p['cut'] or [])]
        poly=Polygon(stitch)
        finite=all(math.isfinite(v) for point in stitch+cut for v in point)
        closed=math.dist(stitch[0],stitch[-1])<1e-8
        result=dict(panel=p['name'],finite=finite,stitch_closed=closed,
                    stitch_valid=poly.is_valid,stitch_reason=explain_validity(poly),
                    stitch_area_cm2=poly.area,cut_present=bool(cut))
        if cut:
            cp=Polygon(cut)
            result.update(cut_closed=math.dist(cut[0],cut[-1])<1e-8,cut_valid=cp.is_valid,
                          cut_reason=explain_validity(cp),cut_area_cm2=cp.area,
                          cut_covers_stitch=cp.covers(poly) if cp.is_valid and poly.is_valid else False)
        result['pass']=finite and closed and poly.is_valid and poly.area>0 and (
            not cut or (result['cut_closed'] and result['cut_valid'] and result['cut_covers_stitch']))
        results.append(result)
    return results


def dxf_check(text,pieces,policy):
    """Use an independent CAD reader, then compare physical coordinates and curves."""
    errors=[]
    doc=ezdxf.read(io.StringIO(text))
    audit=doc.audit()
    if audit.errors or audit.fixes: errors.append(f'DXF audit: {len(audit.errors)} errors, {len(audit.fixes)} fixes')
    if doc.header.get('$INSUNITS')!=4: errors.append('DXF is not declared millimetres')
    if doc.dxfversion!='AC1015': errors.append('Unexpected DXF version')
    entities=list(doc.modelspace())
    expected={s['name'].upper():s for p in pieces for s in p['seams']}
    found={}
    max_curve_mm=0.0
    max_length_mm=0.0
    tol=policy['dxf_coordinate_tolerance_mm']
    for e in entities:
        layer=e.dxf.layer
        if layer in expected:
            found.setdefault(layer,[]).append(e)
            s=expected[layer]
            curve=LineString([(v.x,v.y) for v in make_path(e).flattening(distance=.005)])
            source=LineString([(v.x*10,v.y*10) for v in s['points']])
            error=curve.hausdorff_distance(source)
            max_curve_mm=max(max_curve_mm,error)
            max_length_mm=max(max_length_mm,abs(curve.length-source.length))
            # Sampling differs between DXF and screen; 0.5 mm is a review gate,
            # not an exact-coordinate tolerance or sewing acceptance standard.
            if error>.5: errors.append(f'{layer}: exported curve differs by {error:.4f} mm')
        elif layer not in {'CUT','GRAIN','NOTCH','NAME'}:
            errors.append('Unexpected exported layer '+layer)
    if set(found)!=set(expected) or any(len(a)!=1 for a in found.values()):
        errors.append('Named seam entity coverage/count differs')
    for layer, key in [('GRAIN','grain'),('NOTCH','notches')]:
        actual=[e for e in entities if e.dxf.layer==layer]
        desired=[]
        for p in pieces:
            if key=='grain' and p.get(key): desired.append(p[key])
            if key=='notches': desired.extend(p[key])
        if len(actual)!=len(desired): errors.append(layer+': entity count differs')
        for e,seg in zip(actual,desired):
            if e.dxftype()!='LINE': errors.append(layer+': expected LINE'); continue
            observed=[[e.dxf.start.x,e.dxf.start.y],[e.dxf.end.x,e.dxf.end.y]]
            wanted=[[v*10 for v in pt] for pt in seg]
            if not compare(wanted,observed,tol)['pass']: errors.append(layer+': coordinates differ')
    names=[e.dxf.text for e in entities if e.dxf.layer=='NAME' and e.dxftype()=='TEXT']
    if names!=[p['name'].upper() for p in pieces]: errors.append('Piece labels differ')
    cuts=[e for e in entities if e.dxf.layer=='CUT']
    expected_cuts=[p['cut'] for p in pieces if p['cut']]
    if len(cuts)!=len(expected_cuts): errors.append('Cut loop count differs')
    for e,points in zip(cuts,expected_cuts):
        if e.dxftype()!='LWPOLYLINE' or not e.closed:
            errors.append('Cut entity is not a closed LWPOLYLINE'); continue
        actual=[list(p) for p in e.get_points('xy')]
        source=[[p.x*10,p.y*10] for p in points]
        if math.dist(source[0],source[-1])<1e-8: source=source[:-1]
        c=compare(source,actual,tol)
        if not c['pass']: errors.append('Cut vertices differ from cm × 10 source')
    if max_length_mm>.1: errors.append(f'Exported seam length differs by {max_length_mm:.4f} mm')
    return dict(pass_=not errors,errors=errors,version=doc.dxfversion,units='mm',
                named_seams=len(found),cut_loops=len(cuts),max_curve_deviation_mm=max_curve_mm,
                max_seam_length_difference_mm=max_length_mm)


def calibration(draft,exporter,out):
    points=[draft.Vec2(0,0),draft.Vec2(10,0),draft.Vec2(10,10),draft.Vec2(0,10),draft.Vec2(0,0)]
    p=dict(name='CALIBRATION 100 MM X 100 MM',outline=points,cut=points,grain=None,notches=[],seams=[])
    path=out/'calibration-100mm.dxf'
    exporter.write_pattern_dxf([p],path)
    doc=ezdxf.readfile(path)
    e=next(e for e in doc.modelspace() if e.dxf.layer=='CUT')
    coords=list(e.get_points('xy'))
    width=float(max(p[0] for p in coords)-min(p[0] for p in coords))
    height=float(max(p[1] for p in coords)-min(p[1] for p in coords))
    return dict(width_mm=width,height_mm=height,pass_=abs(width-100)<1e-8 and abs(height-100)<1e-8,
                physical_measurement_status='pending user measurement')


def report_html(report):
    esc=html.escape
    blocks=[]
    failures=[c['id'] for c in report['cases'] if not c['engineering_pass']]
    overview=('Engineering failures: '+', '.join(failures)) if failures else 'All engineering checks pass.'
    if not report['served_exporter_matches_source']: overview+=' Exporter copies differ.'
    for c in report['cases']:
        if 'expected_rejection' in c:
            blocks.append(f'<details><summary>{esc(c["id"])} — expected rejection: {c["expected_rejection"]}</summary></details>')
            continue
        rows=''.join('<tr>'+''.join(f'<td>{esc(str(v))}</td>' for v in [r['pair'],r['segment'],
            f'{r["a_cm"]:.3f}',f'{r["b_cm"]:.3f}',f'{r["difference_cm"]:+.3f}',
            'unspecified' if r['target_cm'] is None else f'{r["target_cm"]:.3f}',
            'REVIEW' if r['review'] else 'within numerical review threshold'])+'</tr>' for r in c.get('seams',[]))
        details=esc(json.dumps({k:v for k,v in c.items() if k not in ['seams']},indent=2))
        topology=''.join(f'<li>{esc(p["panel"])}: {esc(p.get("cut_reason",p["stitch_reason"]))}; '
                         f'cut contains stitch: {p.get("cut_covers_stitch", "not applicable")}</li>'
                         for p in c.get('outlines',[]) if not p['pass'])
        blocks.append(f'<details {"open" if c["id"]=="reference" else ""}><summary>{esc(c["id"])} — '
            f'{"engineering checks pass" if c["engineering_pass"] else "engineering failure"}; '
            f'{c["review_count"]} review flags</summary>'+(f'<p>Do not cut this measurement set:</p><ul>{topology}</ul>' if topology else '')+
            '<p>Lengths follow stitch seams top to bottom. '
            'Difference = second piece minus first: SB−CB, SF−CF, SF−SB. All values in cm.</p>'
            '<div class="scroll"><table><thead><tr><th>Pair</th><th>Interval</th><th>First (cm)</th>'
            '<th>Second (cm)</th><th>Difference (cm)</th><th>Target (cm)</th><th>Status</th></tr></thead>'
            f'<tbody>{rows}</tbody></table></div><details><summary>Geometry, DXF, parity and inputs</summary><pre>{details}</pre></details></details>')
    return ('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width">'
      '<title>Princess dress validation</title><style>body{font:15px/1.6 system-ui;margin:32px auto;max-width:1200px;padding:0 20px;color:#eee;background:#111}'
      'h1{font-size:24px;font-weight:400}summary{cursor:pointer;padding:14px 0}details{border-top:1px solid #555;margin:18px 0}'
      'table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums}td,th{text-align:left;padding:8px;border-bottom:1px solid #444;font-weight:400}'
      '.scroll{overflow:auto}pre{white-space:pre-wrap;font-size:12px}a{color:inherit}</style>'
      '<h1>Princess-line dress: validation baseline</h1>'
      f'<p><strong>{esc(overview)}</strong> Expand the affected case below for details. '
      'Even passing cases require sewing-ease and physical checks.</p>'
      f'<p>Generated {esc(report["generated_utc"])}. Baseline {esc(report["baseline_commit"][:7])}. '
      'Reference: bust 84, waist 68, hip 90, back length 38, waist-to-hem 50 cm; allowance 1 cm.</p>'
      '<p><strong>Physical scale and fit remain unverified.</strong> The current pattern is an inspection export, '
      'not a sewing-approved release. A small numerical difference is not proof of fit. Unspecified ease needs a fitting decision.</p>'
      '<p>Review gate: absolute interval difference above 0.1 cm (1 mm); this is a diagnostic setting, not an industry standard. '
      'Side references are not paired exported notches. Front princess upper notches use back BL height, not front BP.</p>'
      '<p><a href="reference-python.dxf">Reference DXF</a> · <a href="calibration-100mm.dxf">100 mm calibration DXF</a> · '
      '<a href="report.json">Full JSON</a> · <a href="seams.csv">Seam measurements CSV</a></p>'+''.join(blocks)+'</html>')


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo',type=Path,default=HERE.parent)
    parser.add_argument('--out',type=Path)
    parser.add_argument('--node',default='node')
    parser.add_argument('--strict',action='store_true')
    args=parser.parse_args()
    root=args.repo.resolve(); out=(args.out or root/'output'/'validation').resolve()
    out.mkdir(parents=True,exist_ok=True)
    policy=json.loads((HERE/'policy.json').read_text())
    cases=json.loads((HERE/'cases.json').read_text())
    sys.dont_write_bytecode=True
    draft=load_module('draft',root/'GarmentDesign-PrincessLineDress'/'draft.py')
    render=load_module('dress_validation_render',root/'GarmentDesign-PrincessLineDress'/'render.py')
    js=json.loads(subprocess.run([args.node,str(HERE/'browser_snapshot.cjs'),str(root),str(HERE/'cases.json')],
                                 capture_output=True,text=True,encoding='utf-8',check=True).stdout)
    report=dict(generated_utc=datetime.now(timezone.utc).isoformat(),baseline_commit=policy['baseline_commit'],
                policy=policy,cases=[],source_sha256={})
    paths=[*root.glob('BasicBlock-*/draft.py'),root/'GarmentDesign-PrincessLineDress/draft.py',
           root/'GarmentDesign-PrincessLineDress/render.py',root/'Export-DXF/dxf.py',root/'Export-DXF/dxf.js',
           *root.glob('web/*.js'),root/'web/Export-DXF/dxf.js']
    for path in sorted(paths): report['source_sha256'][path.relative_to(root).as_posix()]=hashlib.sha256(path.read_bytes()).hexdigest()
    report['served_exporter_matches_source']=(root/'Export-DXF/dxf.js').read_bytes()==(root/'web/Export-DXF/dxf.js').read_bytes()
    for case,web in zip(cases,js):
        if case['id']!=web['id']: raise ValueError('Case order differs')
        c=dict(id=case['id'],inputs=case['params'])
        try:
            d=draft.draft_princess_dress(draft.DressParams(**case['params']))
        except ValueError as e:
            c.update(expected_rejection=bool(case.get('expect_error') and web.get('error')),
                     python_error=str(e),javascript_error=web.get('error'))
            c['engineering_pass']=c['expected_rejection']; report['cases'].append(c); continue
        c['inputs']=dataclasses.asdict(d.params)
        if web.get('error') or case.get('expect_error'):
            c.update(engineering_pass=False,review_count=1,error='Unexpected acceptance/rejection mismatch')
            report['cases'].append(c); continue
        snap=snapshot(d,draft,render)
        c['parity']=compare(snap,web['snapshot'],policy['numeric_tolerance_cm'])
        c['seams'],c['notch_issues']=seam_rows(d,policy)
        dense=draft.draft_princess_dress(dataclasses.replace(d.params,spline_samples=128))
        dense_rows,_=seam_rows(dense,policy)
        c['sampling_max_interval_change_cm']=max(abs(r[k]-rr[k]) for r,rr in zip(c['seams'],dense_rows) for k in ['a_cm','b_cm'])
        pieces=render.dress_dxf_pieces(d)
        c['outlines']=outline_checks(pieces)
        py_dxf=render._dxf.pattern_dxf(pieces)
        c['python_dxf']=dxf_check(py_dxf,pieces,policy)
        c['javascript_dxf']=dxf_check(web['dxf'],pieces,policy)
        c['engineering_pass']=all([c['parity']['pass'],c['python_dxf']['pass_'],c['javascript_dxf']['pass_'],
            all(p['pass'] for p in c['outlines']),
            not c['notch_issues'],c['sampling_max_interval_change_cm']<=policy['sampling_review_threshold_cm']])
        c['review_count']=sum(r['review'] for r in c['seams'])+sum(not p['pass'] for p in c['outlines'])
        if case['id']=='reference':
            (out/'reference-python.dxf').write_text(py_dxf,encoding='utf-8')
            (out/'reference-browser.dxf').write_text(web['dxf'],encoding='utf-8')
            (out/'reference-snapshot.json').write_text(json.dumps(snap,indent=2),encoding='utf-8')
            render.write_svg(d,out/'reference-preview.svg')
            report['calibration']=calibration(draft,render._dxf,out)
        report['cases'].append(c)
        print(f'{case["id"]}: engineering={c["engineering_pass"]}, review flags={c["review_count"]}',flush=True)
    report['engineering_pass']=all(c['engineering_pass'] for c in report['cases']) and report['served_exporter_matches_source'] and report['calibration']['pass_']
    report['physical_status']='Pending CAD/plot measurement, cutting-plan review, toile and fitting observations'
    (out/'report.json').write_text(json.dumps(report,indent=2,ensure_ascii=False,allow_nan=False),encoding='utf-8')
    (out/'report.html').write_text(report_html(report),encoding='utf-8')
    with (out/'seams.csv').open('w',newline='',encoding='utf-8-sig') as f:
        keys=['case','pair','segment','a','b','a_cm','b_cm','difference_cm','target_cm','review']
        writer=csv.DictWriter(f,fieldnames=keys); writer.writeheader()
        for c in report['cases']:
            for row in c.get('seams',[]): writer.writerow({'case':c['id'],**row})
    print('Report:',out/'report.html')
    return 0 if report['engineering_pass'] and (not args.strict or not any(c.get('review_count',0) for c in report['cases'])) else 1


if __name__=='__main__':
    raise SystemExit(main())
