import json,hashlib
from pathlib import Path
p=Path(__file__).parent/'results/ranges.json';d=json.loads(p.read_text(encoding='utf-8'));audit=json.loads((p.parent/'export-audit/report.json').read_text(encoding='utf-8'))
assert audit['engineering_pass']
for path,checksum in d['source_sha256'].items():
    if path in audit['source_sha256']:assert checksum==audit['source_sha256'][path],path
guarded=('dress length must be greater than hip depth','Ease must be')
for r in d['records']:
    if r['status']=='rejected':r['rejection_kind']='parameter_guard' if any(any(g in f for g in guarded) for f in r['failures']) else 'construction_guard'
d['export_audit']={'engineering_pass':audit['engineering_pass'],'cases':[{'id':c['id'],'pass':c['engineering_pass'],'review_count':c['review_count']} for c in audit['cases']], 'report':'../../output/experiments/conditional-ranges/export-audit/report.html'}
d['browser_worker_sha256']=hashlib.sha256(Path(__file__).with_name('browser_worker.cjs').read_bytes()).hexdigest()
d['audit_attacher_sha256']=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
p.write_text(json.dumps(d,ensure_ascii=False,allow_nan=False,separators=(',',':')),encoding='utf-8')
r=p.parent/'RESULTS.md'
text=r.read_text(encoding='utf-8')
text=text.split('\n## Independent export audit')[0]
flags=[c['review_count'] for c in audit['cases']]
text+=f'\n## Independent export audit\n\nAll {len(flags)} selected samples passed the existing full engineering audit, including both DXF exporters. These samples retain {min(flags)}–{max(flags)} seam review flags. The audit is a subset of the sweep, not a claim about every export.\n'
rejections=[r for r in d['records'] if r['status']=='rejected'];parameter=sum(r['rejection_kind']=='parameter_guard' for r in rejections)
text+=f'\nOf the {len(rejections)} draft rejections, {parameter} hit parameter guards; {len(rejections)-parameter} hit construction guards. Those construction rejections are distinct from invalid physical bodies.\n'
byid={r['id']:r for r in d['records']}
for b in d['brackets']:
    if b['slice']=='length_fullness' and b['axis']=='x' and b['kind']=='status' and b['fixed'] in (32,80) and byid[b['low_record']]['status']=='failed' and byid[b['high_record']]['status']=='pass':
        text+=f'\nAt fixed reference ease/allocation and fullness {b["fixed"]} cm, a local length transition from failed to passing screening was bracketed at {b["low"]}–{b["high"]} cm. This is a numerical construction transition, not a wearable minimum dress length.\n'
r.write_text(text,encoding='utf-8')
