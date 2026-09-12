import importlib.util,json,sys,unittest
from pathlib import Path
from shapely.geometry import Polygon
import silhouette_policy as policy

ROOT=Path(__file__).parent/'repo'
if not ROOT.exists():ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('validation',ROOT/'Validation/run.py');v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)
draft=v.load_module('draft',ROOT/'GarmentDesign-PrincessLineDress/draft.py');render=v.load_module('repair_render',ROOT/'GarmentDesign-PrincessLineDress/render.py')
base=json.loads((ROOT/'web/experiments/data.json').read_text(encoding='utf-8'))['cases'][0]['validation']['inputs']

class ConstructionRepairTests(unittest.TestCase):
    def test_collapsed_side_hem_has_explicit_guard(self):
        for length in (18,18.25,18.5):
            with self.subTest(length=length),self.assertRaisesRegex(ValueError,'hip depth plus side hem rise'):
                draft.draft_princess_dress(draft.DressParams(dress_length=length))
    def test_short_flared_cut_contains_stitch(self):
        for length,fullness in [(19,32),(20,80)]:
            d=draft.draft_princess_dress(draft.DressParams(dress_length=length,hem_fullness=fullness))
            self.assertTrue(all(c['pass'] for c in v.outline_checks(render.dress_dxf_pieces(d))))
    def test_crossed_stitch_is_rejected_before_export(self):
        records=json.loads((ROOT/'web/experiments/ranges.json').read_text(encoding='utf-8'))['records']
        r=next(r for r in records if r['id']=='r0140')
        with self.assertRaisesRegex(ValueError,'stitch outline'):
            draft.draft_princess_dress(draft.DressParams(**r['inputs']))
    def test_bevel_handles_reflection_and_reversal(self):
        points=[draft.Vec2(x,y) for x,y in [(0,0),(10,0),(.01,1),(0,0)]]
        for ring in (points,points[::-1],[draft.Vec2(-p.x,p.y) for p in points]):
            poly=Polygon([v.xy(p) for p in ring]);cut=Polygon([v.xy(p) for p in draft.offset_closed(ring,1)])
            self.assertTrue(cut.is_valid and cut.covers(poly))

class SilhouettePolicyTests(unittest.TestCase):
    def test_family_boundary_is_inclusive_only_for_fitted(self):
        at=policy.evaluate({**base,'waist_ease':6.25},'pass')
        self.assertEqual(at['family'],'fitted');self.assertEqual(at['retained_shaping'],.75)
        self.assertEqual(policy.evaluate({**base,'waist_ease':6.2501})['family'],'relaxed')
    def test_hip_ease_changes_family_boundary(self):
        self.assertAlmostEqual(policy.evaluate({**base,'hip_ease':8})['intervals']['fitted_waist_ease']['maximum'],7.25)
    def test_flare_boundary_and_length_are_coupled(self):
        at=policy.evaluate({**base,'dress_length':22.5},'pass')
        self.assertTrue(at['design_pass']);self.assertAlmostEqual(at['maximum_chord_angle_degrees'],45)
        self.assertFalse(policy.evaluate({**base,'dress_length':22.49},'pass')['design_pass'])
    def test_design_pass_does_not_override_geometry_or_fit(self):
        result=policy.evaluate(base,'failed')
        self.assertTrue(result['design_pass']);self.assertFalse(result['usable_sample']);self.assertEqual(result['fit_status'],'unverified')
    def test_zero_fullness_still_has_open_hem_guard(self):
        result=policy.evaluate({**base,'hem_fullness':0})
        self.assertEqual(result['intervals']['dress_length']['minimum'],18.5)
        self.assertFalse(result['intervals']['dress_length']['minimum_inclusive'])
    def test_normalization_respects_family_and_open_endpoints(self):
        result=policy.evaluate(base)
        fitted=result['intervals']['fitted_waist_ease'];relaxed=result['intervals']['relaxed_waist_ease']
        self.assertAlmostEqual(policy.normalize(3.125,fitted),.5)
        self.assertAlmostEqual(policy.denormalize(.5,fitted),3.125)
        with self.assertRaisesRegex(ValueError,'outside'):policy.normalize(6.25,relaxed)
        with self.assertRaisesRegex(ValueError,'open'):policy.denormalize(0,relaxed)
        with self.assertRaisesRegex(ValueError,'finite'):policy.normalize(50,result['intervals']['dress_length'])
    def test_reference_allocation_intervals_are_complete(self):
        result=policy.evaluate(base)
        for key in ('side_allocation','front_allocation'):
            self.assertEqual((result['intervals'][key]['minimum'],result['intervals'][key]['maximum']),(0,1))

if __name__=='__main__':unittest.main()
