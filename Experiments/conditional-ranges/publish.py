"""Build reviewable findings and integrity checks from the completed sweep."""
import json,hashlib
from pathlib import Path
here=Path(__file__).resolve().parent
out=here/'results'
data=json.loads((out/'ranges.json').read_text(encoding='utf-8'))
records={r['id']:r for r in data['records']}
assert len(records)==len(data['records'])
assert sum(data['summary'].values())==len(records)
body=('bust','waist','hip','back_length','hip_depth','seam_allowance')
for r in records.values():
    assert all(r['inputs'][key]==data['base'][key] for key in body)
    assert abs(sum(r['inputs']['hem_distribution'])-1)<1e-9
    if r['status']=='pass':
        assert r['parity']['pass'] and all(o['pass'] for o in r['outlines'])
        assert r['convergence_cm']<=data['policy']['sampling_review_threshold_cm']
        assert len(r['seams'])==14 and not r['failures']
for b in data['brackets']:
    a,c=records[b['low_record']],records[b['high_record']]
    assert a[b['kind']]!=c[b['kind']]
    assert b['high']>b['low']
    axis=next(s for s in data['slices'] if s['id']==b['slice'])[b['axis']]
    assert b['width']<=axis['resolution']+1e-10
data['candidate_rows']=[]
for s in data['slices']:
    points={(p['x'],p['y']):p for p in s['grid']}
    for b in data['brackets']:
        if b['slice']!=s['id']:continue
        for end in ('low','high'):
            x,y=(b[end],b['fixed']) if b['axis']=='x' else (b['fixed'],b[end])
            points[x,y]=dict(x=x,y=y,record=b[end+'_record'])
    for y in s['y']['values']:
        row=sorted((p for p in points.values() if p['y']==y),key=lambda p:p['x'])
        runs=[];run=[]
        for p in row:
            if records[p['record']]['status']=='pass':run.append(p)
            elif run:runs.append(run);run=[]
        if run:runs.append(run)
        data['candidate_rows'].append(dict(slice=s['id'],fixed_y=y,continuous_validity='unproven',normalization_enabled=False,
            runs=[dict(minimum=r[0]['x'],maximum=r[-1]['x'],sample_ids=[p['record'] for p in r],largest_gap=max([b['x']-a['x'] for a,b in zip(r,r[1:])],default=0),touches_search_minimum=r[0]['x']==s['x']['values'][0],touches_search_maximum=r[-1]['x']==s['x']['values'][-1]) for r in runs]))
data['publisher_sha256']=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
(out/'ranges.json').write_text(json.dumps(data,ensure_ascii=False,allow_nan=False,separators=(',',':')),encoding='utf-8')
# Select a compact independent DXF audit set: reference plus pass samples next
# to observed failures and the largest measured side deviation and seam mismatch.
reference=next(r for r in records.values() if r['inputs']==data['base'])
audit=[reference]
near={end for b in data['brackets'] if b['kind']=='status' for end in (b['low_record'],b['high_record']) if records[end]['status']=='pass'}
for id in sorted(near):
    if records[id] not in audit:audit.append(records[id])
    if len(audit)>=5:break
passes=[r for r in records.values() if r['status']=='pass']
for r in [max(passes,key=lambda r:r.get('shape',{}).get('SB',{}).get('whole',{}).get('deviation_ratio',0)),max(passes,key=lambda r:max(abs(s['difference_cm']) for s in r['seams']))]:
    if r not in audit:audit.append(r)
(out/'audit-cases.json').write_text(json.dumps([{'id':'reference' if i==0 else r['id'],'params':r['inputs']} for i,r in enumerate(audit)],indent=2),encoding='utf-8')
lines=['# Conditional ranges — first coupled study','',f'Run: {data["generated_utc"]}',f'Rule protocol: {data["version"]}','','## What was measured','',f'{len(records)} unique input sets: {data["summary"]["pass"]} screening passes, {data["summary"]["failed"]} screening failures and {data["summary"]["rejected"]} rejected inputs.',f'{len(data["brackets"])} observed transitions refined in both grid directions.','','The fixed body is B84 / W68 / H90 / back length38 cm. Hip depth18 and allowance1 cm remain fixed.','Screening includes outlines, browser-source parity, ordered corresponding notches and seam-length convergence.','Export audits are recorded separately for selected examples. No result certifies physical fit.','','## Slices','']
for s in data['slices']:
    rs=[records[p['record']] for p in s['grid']]
    counts={status:sum(r['status']==status for r in rs) for status in ('pass','failed','rejected')}
    bs=[b for b in data['brackets'] if b['slice']==s['id']]
    lines.append(f'- {s["name"]}: {len(rs)} grid points; {counts}; {len(bs)} refined transitions.')
lines+=['','## Observed failures','']
reasons={reason for r in records.values() if r['status']=='failed' for reason in r['failures']}
lines.extend('- '+reason for reason in sorted(reasons))
lines+=['','## What this means for 0–1 controls','','- Available waist intake does not reach zero inside the tested reference-body ease guards. A guard endpoint is not a measured fit limit.','- Passing runs are retained as sampled candidates with fixed context, endpoint values, maximum gaps and source records. They are not continuous safe intervals.','- Length80 cm is the exploration ceiling, not an engine maximum. The lower length region includes deliberately close and rejected probes.','- Side and front allocation coordinates are exact budget fractions on [0,1]. Their geometrically acceptable subsets depend on the other inputs; zero fullness makes the allocation observationally redundant.','- Straightness, slope, signed turn and seam mismatch are descriptors. No arbitrary straightness or fitting threshold was introduced.','- Further sampling may find additional failures or disconnected regions between current samples.','- Full inputs, source hashes, geometry hashes, seam intervals, failures and bracket widths are retained in `web/experiments/ranges.json`.','','## Next decision','','Review which combinations preserve the intended silhouette and which seam differences require correction. Use those decisions to define design limits separately from engine failures, then re-sample the candidate regions before exposing normalized controls.']
(out/'RESULTS.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
print('Integrity checks passed;',len(audit),'examples prepared for independent export audit.')
