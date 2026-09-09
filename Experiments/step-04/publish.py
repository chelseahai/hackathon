"""Reproduce step 4 and publish its audited reference-body experiment journal."""
import argparse,json,subprocess,sys
from pathlib import Path
root=Path(__file__).resolve().parents[2]
parser=argparse.ArgumentParser();parser.add_argument('--node',default='node');parser.add_argument('--skip-validation',action='store_true');args=parser.parse_args()
out=root/'output/experiments/step-04';cases_path=root/'Experiments/step-04/cases.json'
if not args.skip_validation:
    result=subprocess.run([sys.executable,'-B',str(root/'Validation/run.py'),'--cases',str(cases_path),'--snapshots','--out',str(out),'--node',args.node])
    if result.returncode not in (0,1):raise SystemExit(result.returncode)
report=json.loads((out/'report.json').read_text(encoding='utf-8'));specs=json.loads(cases_path.read_text())
byid={c['id']:c for c in report['cases']};base=json.loads((out/'reference-snapshot.json').read_text())
def area(ps):return abs(sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(ps,ps[1:]+ps[:1])))/2
records=[]
for spec in specs:
    c=byid[spec['id']];snap_path=out/(spec['id']+'-snapshot.json');snap=json.loads(snap_path.read_text()) if snap_path.exists() else None
    record={**spec,'validation':c,'panels':snap['panels'] if snap else [],'metrics':snap['metrics'] if snap else {}}
    if snap:
        record['area_cm2']=sum(area(p['outline']) for p in snap['panels'])
        record['area_delta_cm2']=record['area_cm2']-sum(area(p['outline']) for p in base['panels'])
        record['upper_max_shift_cm']=max(((a[0]-b[0])**2+(a[1]-b[1])**2)**.5 for pa,pb in zip(snap['panels'],base['panels']) for sa,sb in zip(pa['seams'],pb['seams']) for a,b in zip(sa['knots'],sb['knots']) if b[1]>0)
    records.append(record)
data={'title':'One body. Fifteen configurations.','generated_utc':report['generated_utc'],'rule_commit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),'source_sha256':report['source_sha256'],'policy':report['policy'],'engineering_pass':report['engineering_pass'],'exporter_match':report['served_exporter_matches_source'],'calibration':report['calibration'],'cases':records}
target=root/'web/experiments/data.json';target.write_text(json.dumps(data,ensure_ascii=False,allow_nan=False,separators=(',',':')),encoding='utf-8')
lines=['# Step 4 — fixed-body design experiment','',f'Generated: {report["generated_utc"]}',f'Rule commit: {data["rule_commit"]}','','Reference body: bust 84, waist 68, hip 90, back length 38 cm.','Construction settings are fixed; single-control cases differ in exactly one design field.','Distribution is treated as one normalized vector control; total fullness stays 32 cm.','','## Results','']
for r in records:lines.append(f'- {r["name"]}: engineering={r["validation"]["engineering_pass"]}; review flags={r["validation"].get("review_count",0)}; area change={r.get("area_delta_cm2",0):.2f} cm²; maximum upper-knot movement={r.get("upper_max_shift_cm",0):.4f} cm.')
lines+=['','Area is the sum of four sampled stitch-panel areas, not fabric consumption.','Upper movement compares corresponding above-waist seam knots with the reference.','Sewing-ease, fold/closure choices, physical plot scale and toile fit remain open.','Passing engineering checks does not certify fit or settle seam review flags.','','## Artifacts','','- Website: `web/experiments/index.html` and `data.json`.','- Full inputs, source hashes and case-level checks: `data.json`.','- Per-case geometry, Python/browser DXFs, calibration and seam CSV: `output/experiments/step-04/`.','- Reproduce: `python Experiments/step-04/publish.py --node /path/to/node`.']
(root/'Experiments/step-04/RESULTS.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
print('Published',len(records),'configurations:',target)
