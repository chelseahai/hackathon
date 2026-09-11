"""Conditional-range sampling. No changes to drafting rules or saved user inputs.

Run: python -B study.py --root /repo --node /node --out /output
Every unique input gets geometry/parity/notch/convergence checks; export audits
remain a separate validation tier. Grid boundaries are refined in both axes.
"""
from __future__ import annotations
import argparse,dataclasses,hashlib,importlib.util,json,math,subprocess,sys
from datetime import datetime,timezone
from pathlib import Path
from shapely.geometry import LineString,Point
from shapely.ops import substring

VERSION='conditional-slices-v1'

def descriptor(coords,outward=1):
    """Chord deviation and signed turn per length; always traverse top to hem."""
    coords=[(outward*x,y) for x,y in coords]
    a,b=coords[0],coords[-1];dx=b[0]-a[0];dy=b[1]-a[1];chord=math.hypot(dx,dy)
    if chord<1e-10: raise ValueError('Degenerate descriptor chord')
    deviations=[(dx*(q[1]-a[1])-dy*(q[0]-a[0]))/chord for q in coords]
    vectors=[(q[0]-p[0],q[1]-p[1]) for p,q in zip(coords,coords[1:]) if math.dist(p,q)>1e-10]
    turn=sum(math.atan2(a[0]*b[1]-a[1]*b[0],a[0]*b[0]+a[1]*b[1]) for a,b in zip(vectors,vectors[1:]))
    length=sum(math.hypot(*v) for v in vectors)
    return dict(deviation_cm=max(map(abs,deviations)),deviation_ratio=max(map(abs,deviations))/chord,
        slope_outward_per_down=dx/-dy if abs(dy)>1e-10 else None,
        chord_cm=chord,signed_turn_rad=turn,mean_signed_curvature_per_cm=turn/length)

def slices():
    def axis(key,label,values,unit='cm',resolution=.025):return dict(key=key,label=label,values=values,unit=unit,resolution=resolution)
    ew=axis('waist_ease','Waist ease',[0,3,6,9,12]);eh=axis('hip_ease','Hip ease',[0,3,4,6,9,12])
    f=axis('hem_fullness','Hem fullness',[0,16,32,48,64,80],resolution=.1)
    return [dict(id='ease',name='Waist × hip ease',x=ew,y=eh),
        dict(id='waist_fullness',name='Waist ease × fullness',x=ew,y=f),
        dict(id='length_fullness',name='Length × fullness',x=axis('dress_length','Waist-to-hem length',[18,18.25,18.5,19,22,35,50,80],resolution=.05),y=f),
        dict(id='side_allocation',name='Side allocation × fullness',x=axis('side_share','Side allocation',[0,.25,.4375,.5,.75,1],'share',.002),y=f),
        dict(id='front_allocation',name='Front allocation × fullness',x=axis('front_share','Front allocation',[0,.25,.5,.5625,.75,1],'share',.002),y=f)]

def inputs_for(base,s,x,y):
    p=dict(base)
    for a,value in [(s['x'],x),(s['y'],y)]:
        if a['key']=='side_share':
            # Preserve back/front ratio independently inside side and princess groups.
            p['hem_distribution']=[value*3/7,(1-value)*4/9,value*4/7,(1-value)*5/9]
        elif a['key']=='front_share':
            # Preserve side/princess ratio independently within each body half.
            p['hem_distribution']=[(1-value)*3/7,(1-value)*4/7,value*4/9,value*5/9]
        else:p[a['key']]=value
    return p

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--root',type=Path,required=True);parser.add_argument('--out',type=Path,required=True);parser.add_argument('--node',required=True);args=parser.parse_args()
    root=args.root;out=args.out;out.mkdir(parents=True,exist_ok=True);sys.dont_write_bytecode=True
    spec=importlib.util.spec_from_file_location('range_validation',root/'Validation/run.py');v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)
    draft=v.load_module('draft',root/'GarmentDesign-PrincessLineDress/draft.py');render=v.load_module('range_render',root/'GarmentDesign-PrincessLineDress/render.py')
    base=json.loads((root/'web/experiments/data.json').read_text(encoding='utf-8'))['cases'][0]['validation']['inputs']
    policy=json.loads((root/'Validation/policy.json').read_text(encoding='utf-8'))
    worker=subprocess.Popen([args.node,str(Path(__file__).with_name('browser_worker.cjs')),str(root)],stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True,encoding='utf-8')
    cache={};records=[]
    def sample(p):
        key=json.dumps(p,sort_keys=True,separators=(',',':'))
        if key in cache:return cache[key]
        rec=dict(id=f'r{len(records):04d}',inputs=p,failures=[],preview=[],seams=[],shape={},branch=None)
        cache[key]=rec;records.append(rec)
        worker.stdin.write(key+'\n');worker.stdin.flush();line=worker.stdout.readline()
        if not line:raise RuntimeError('Browser geometry worker exited')
        web=json.loads(line)
        try:d=draft.draft_princess_dress(draft.DressParams(**p))
        except (ValueError,ZeroDivisionError,OverflowError,IndexError) as e:
            guarded=isinstance(e,ValueError)
            rec.update(status='rejected' if guarded else 'failed',failures=[type(e).__name__+': '+str(e)],javascript_error=web.get('error'),parity_rejection=bool(web.get('error') and not web.get('unexpected')) if guarded else None,construction_error=not guarded)
            if guarded and not rec['parity_rejection']:rec['failures'].append('Python/browser rejection mismatch')
            return rec
        rec['inputs']=dataclasses.asdict(d.params)
        rec['branch']=d.side_dart>.08;rec['side_excess_cm']=d.side_dart
        rec['intake_cm']={'back':d.back_hip-d.back_waist,'front':d.front_hip-d.front_waist}
        try:
            snap=v.snapshot(d,draft,render)
            rec['geometry_sha256']=hashlib.sha256(json.dumps(snap,sort_keys=True).encode()).hexdigest()
            rec['parity']=v.compare(snap,web['snapshot'],policy['numeric_tolerance_cm']) if 'snapshot' in web else {'pass':False,'error':web.get('error')}
            if not rec['parity']['pass']:rec['failures'].append('Python/browser geometry mismatch')
            rec['outlines']=v.outline_checks(render.dress_dxf_pieces(d))
            rec['failures'] += [f'{p["panel"]}: '+('; '.join(k for k in ('finite','stitch_closed','stitch_valid','cut_closed','cut_valid','cut_covers_stitch') if p.get(k) is False)) for p in rec['outlines'] if not p['pass']]
            # Simplified outlines are preview-only. Inputs and geometry hash reproduce exact results.
            for panel in d.panels:
                pts=list(LineString([v.xy(q) for q in panel.outline]).simplify(.025).coords)
                rec['preview'].append(dict(name=panel.name,points=pts))
            rows,issues=v.seam_rows(d,policy);rec['seams']=rows;rec['failures']+=issues
            rec['review_count']=sum(row['review'] for row in rows)
            dense=draft.draft_princess_dress(dataclasses.replace(d.params,spline_samples=128))
            dense_rows,dense_issues=v.seam_rows(dense,policy)
            if [(r['pair'],r['segment']) for r in rows]!=[(r['pair'],r['segment']) for r in dense_rows]:raise ValueError('Dense seam identities differ')
            rec['convergence_cm']=max(abs(a[k]-b[k]) for a,b in zip(rows,dense_rows) for k in ('a_cm','b_cm'))
            if rec['convergence_cm']>policy['sampling_review_threshold_cm']:rec['failures'].append('Seam sampling convergence exceeds policy')
            rec['failures']+=dense_issues
        except (ValueError,KeyError,IndexError,ZeroDivisionError) as e:rec['failures'].append(type(e).__name__+': '+str(e))
        for piece,sign in [('SB',1),('SF',-1)]:
            try:
                panel=next(p for p in d.panels if any(s.name==f'SEAM-{piece}-Side' for s in p.seams))
                seam=next(s for s in panel.seams if s.name==f'SEAM-{piece}-Side');line=v.top_down(seam);notches=dict(zip(panel.notch_ids,panel.notches))
                w=line.project(Point(v.xy(notches['side.waist'])));h=line.project(Point(v.xy(notches['side.hip'])))
                rec['shape'][piece]={k:descriptor(substring(line,a,b).coords,sign) for k,a,b in [('waist_hip',w,h),('hip_hem',h,line.length),('whole',0,line.length)]}
            except (ValueError,KeyError,StopIteration,AttributeError) as e:rec.setdefault('descriptor_errors',[]).append(piece+': '+str(e))
        rec['status']='pass' if not rec['failures'] else 'failed'
        if len(records)%25==0:print(f'{len(records)} unique samples',flush=True)
        return rec
    study_slices=slices();brackets=[]
    try:
        for s in study_slices:
            print('Sampling '+s['name'],flush=True);s['grid']=[]
            for y in s['y']['values']:
                for x in s['x']['values']:s['grid'].append(dict(x=x,y=y,record=sample(inputs_for(base,s,x,y))['id']))
            # Refine every observed status/transfer transition on original grid edges.
            # No inference about hidden transitions between equal-status endpoints.
            for axis in ('x','y'):
                other='y' if axis=='x' else 'x';vals=s[axis]['values']
                for fixed in s[other]['values']:
                    def at(t):return sample(inputs_for(base,s,t,fixed) if axis=='x' else inputs_for(base,s,fixed,t))
                    for lo0,hi0 in zip(vals,vals[1:]):
                        left,right=at(lo0),at(hi0)
                        for kind in ('status','branch'):
                            if left.get(kind)==right.get(kind) or (kind=='branch' and (left['branch'] is None or right['branch'] is None)):continue
                            lo,hi=lo0,hi0;a,b=left,right
                            for _ in range(12):
                                if hi-lo<=s[axis]['resolution']:break
                                mid=(lo+hi)/2;c=at(mid)
                                if c.get(kind)==a.get(kind):lo,a=mid,c
                                else:hi,b=mid,c
                            brackets.append(dict(slice=s['id'],axis=axis,fixed=fixed,kind=kind,low=lo,high=hi,width=hi-lo,low_record=a['id'],high_record=b['id']))
        # Explicit probes verify existing guards rather than silently clipping them.
        probes=[]
        for field,value in [('waist_ease',-.01),('waist_ease',12.01),('hip_ease',-.01),('hip_ease',12.01),('hem_fullness',-.01),('hem_fullness',80.01),('dress_length',18)]:
            probes.append(sample({**base,field:value})['id'])
    finally:worker.stdin.close();worker.wait(timeout=30)
    paths=[*root.glob('BasicBlock-*/draft.py'),root/'GarmentDesign-PrincessLineDress/draft.py',root/'GarmentDesign-PrincessLineDress/render.py',root/'Validation/run.py',root/'Validation/policy.json',root/'Export-DXF/dxf.py',*[(root/'web'/p) for p in ('BasicBlock-Bodice.js','BasicBlock-Skirt.js','GarmentDesign-PrincessLineDress.js','Export-DXF/dxf.js')]]
    report=dict(version=VERSION,generated_utc=datetime.now(timezone.utc).isoformat(),base=base,policy=policy,
        source_sha256={p.relative_to(root).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in paths},
        sampler_sha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),slices=study_slices,brackets=brackets,guard_probes=probes,records=records,
        scope='Sampled geometry, browser-source parity, notch correspondence and seam convergence. No export audit or physical fit certification in this sampling tier.',
        normalization='No continuous safe interval assigned. Allocation coordinates express algebraic budgets, not fitted safety.',
        summary={s:sum(r['status']==s for r in records) for s in ('pass','failed','rejected')})
    (out/'ranges.json').write_text(json.dumps(report,ensure_ascii=False,allow_nan=False,separators=(',',':')),encoding='utf-8')
    print(json.dumps(report['summary']),f'; {len(brackets)} refined brackets',flush=True)

if __name__=='__main__':main()
