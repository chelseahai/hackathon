"""Approved design intent; never certifies geometry or physical fit."""
import json,math
from pathlib import Path
POLICY=json.loads(Path(__file__).with_name('silhouette-policy.json').read_text(encoding='utf-8'))

def evaluate(p,geometry_status=None):
    threshold=POLICY['fitted_min_retained_shaping']
    tangent=math.tan(math.radians(POLICY['maximum_lower_chord_angle_degrees']))
    available=p['hip']+p['hip_ease']-p['waist']-1
    remaining=available-p['waist_ease']
    retained=remaining/available if available>0 else None
    divider=(1-threshold)*available
    lower=p['dress_length']-p['hip_depth'];side_lower=lower-p['side_hem_raise']
    shares=p['hem_distribution'];f=p['hem_fullness']
    side=max(shares[0],shares[2]);princess=max(shares[1],shares[3])
    family=None if retained is None or retained<=0 else 'fitted' if p['waist_ease']<=divider else 'relaxed'
    slopes=[f*side/2/side_lower,f*princess/4/lower] if side_lower>0 and lower>0 else None
    angle=math.degrees(math.atan(max(slopes))) if slopes is not None else None
    reasons=[]
    if family is None:reasons.append('Positive retained waist shaping is required')
    if angle is None:reasons.append('Raised side hem must be below the hip')
    elif max(slopes)>tangent+1e-12:reasons.append('Lower flare chord exceeds the approved 45 degree design limit')
    physical_guards=0<=p['waist_ease']<=12 and 0<=p['hip_ease']<=12 and 0<=f<=80
    if not physical_guards:reasons.append('Outside the current engine ease/fullness guards')
    cap=min([80]+([2*side_lower*tangent/side] if side>0 else [])+([4*lower*tangent/princess] if princess>0 else [])) if side_lower>0 else None
    min_length=max(p['hip_depth']+p['side_hem_raise']+f*side/(2*tangent),p['hip_depth']+f*princess/(4*tangent))
    side_cap=2*side_lower*tangent/f if f>0 and side_lower>0 else 1 if f==0 and side_lower>0 else 0
    princess_cap=4*lower*tangent/f if f>0 and lower>0 else 1 if f==0 and side_lower>0 else 0
    def interval(a,b,closed_a=True,closed_b=True):return dict(minimum=a,maximum=b,minimum_inclusive=closed_a,maximum_inclusive=closed_b)
    hip_divider=p['waist_ease']/(1-threshold)-p['hip']+p['waist']+1
    hip_positive=p['waist_ease']-p['hip']+p['waist']+1
    intervals={
        'fitted_waist_ease':dict(minimum=0,maximum=min(12,divider),minimum_inclusive=True,maximum_inclusive=True),
        'relaxed_waist_ease':dict(minimum=max(0,divider),maximum=min(12,available),minimum_inclusive=False,maximum_inclusive=12<available),
        'hem_fullness':dict(minimum=0,maximum=cap,minimum_inclusive=True,maximum_inclusive=True),
        'dress_length':dict(minimum=min_length,maximum=None,minimum_inclusive=min_length>p['hip_depth']+p['side_hem_raise'],maximum_inclusive=False),
        'fitted_hip_ease':interval(max(0,hip_divider),12,True),
        'relaxed_hip_ease':interval(max(0,hip_positive),min(12,hip_divider),0>hip_positive,12<hip_divider),
        'side_allocation':interval(max(0,1-princess_cap*9/5),min(1,side_cap*7/4)),
        'front_allocation':interval(max(0,1-side_cap*7/3,1-princess_cap*7/4),min(1,side_cap*9/4,princess_cap*9/5))}
    for interval in intervals.values():
        lo,hi=interval['minimum'],interval['maximum']
        interval['empty']=lo is None or (hi is not None and (hi<lo or (hi==lo and not(interval['minimum_inclusive'] and interval['maximum_inclusive']))))
        interval['evidence']='conditional design interval; geometry screening still required'
    if side_lower<=0:intervals['hem_fullness']['empty']=True
    return dict(policy_version=POLICY['version'],family=family,retained_shaping=retained,maximum_chord_angle_degrees=angle,
        design_pass=not reasons,reasons=reasons,geometry_status=geometry_status,
        usable_sample=not reasons and geometry_status=='pass',fit_status='unverified',intervals=intervals)

def normalize(amount,interval):
    if interval['empty'] or interval['maximum'] is None or interval['maximum']<=interval['minimum']:
        raise ValueError('A finite nonempty interval is required')
    if (amount<interval['minimum'] or amount>interval['maximum'] or
            (amount==interval['minimum'] and not interval['minimum_inclusive']) or
            (amount==interval['maximum'] and not interval['maximum_inclusive'])):
        raise ValueError('Amount is outside the conditional interval')
    return (amount-interval['minimum'])/(interval['maximum']-interval['minimum'])

def denormalize(u,interval):
    if not math.isfinite(u) or not 0<=u<=1:
        raise ValueError('Normalized value must be between 0 and 1')
    if interval['empty'] or interval['maximum'] is None or interval['maximum']<=interval['minimum']:
        raise ValueError('A finite nonempty interval is required')
    if (u==0 and not interval['minimum_inclusive']) or (u==1 and not interval['maximum_inclusive']):
        raise ValueError('This endpoint is open')
    return interval['minimum']+u*(interval['maximum']-interval['minimum'])
