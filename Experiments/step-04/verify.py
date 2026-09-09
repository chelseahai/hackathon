"""Check that the published study is controlled, complete and reproducible."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[2]
cases=json.loads((root/'Experiments/step-04/cases.json').read_text())
data=json.loads((root/'web/experiments/data.json').read_text(encoding='utf-8'))
assert [c['id'] for c in cases]==[c['id'] for c in data['cases']]
base=data['cases'][0]['validation']['inputs'];design={'dress_length','waist_ease','hip_ease','hem_fullness','hem_distribution'}
for spec,c in zip(cases,data['cases']):
    inputs=c['validation']['inputs'];changed={k for k in inputs if inputs[k]!=base[k]}
    assert changed<=design,(c['id'],'body/construction changed')
    if spec['group'] not in ('baseline','combined'):assert changed=={spec['group']}
    if spec['group']=='combined':assert len(changed)>1
    for key,value in spec['params'].items():assert inputs[key]==value
    assert abs(sum(inputs['hem_distribution'])-1)<1e-12
    snap=json.loads((root/f'output/experiments/step-04/{c["id"]}-snapshot.json').read_text())
    assert c['panels']==snap['panels']
    for suffix in ['python.dxf','browser.dxf']:assert (root/f'output/experiments/step-04/{c["id"]}-{suffix}').stat().st_size>100
    assert len(c['validation']['outlines'])==4
    assert c['validation']['parity']['pass']
assert data['calibration']['pass_'] and data['exporter_match']
print('Verified 15 saved inputs, isolated controls, geometry records, DXF artifacts and fixed body/construction parameters.')
