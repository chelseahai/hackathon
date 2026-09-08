"""Checker tests include deliberately broken geometry and exports.
Known garment findings belong in the report, not assertions that bless defects.
"""
import copy
import io
import json
import os
from pathlib import Path
import subprocess
import unittest

import ezdxf
from shapely.geometry import LineString
import run as validation


class ValidationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.root=Path(os.environ.get('PATTERN_VALIDATION_REPO',Path(__file__).resolve().parent.parent))
        cls.draft=validation.load_module('draft',cls.root/'GarmentDesign-PrincessLineDress/draft.py')
        cls.render=validation.load_module('validation_test_render',cls.root/'GarmentDesign-PrincessLineDress/render.py')
        cls.d=cls.draft.draft_princess_dress()
        cls.pieces=cls.render.dress_dxf_pieces(cls.d)
        cls.policy=json.loads((Path(__file__).parent/'policy.json').read_text())

    def test_design_targets_preserve_body_and_full_circumference(self):
        p=self.draft.DressParams(waist_ease=8,hip_ease=10,hem_fullness=48)
        d=self.draft.draft_princess_dress(p)
        self.assertAlmostEqual(2*(d.back_waist+d.front_waist),p.waist+8)
        self.assertAlmostEqual(2*(d.back_hip+d.front_hip),p.hip+10)
        self.assertEqual((p.bust,p.waist,p.hip),(84,68,90))

    def test_invalid_design_inputs_are_rejected(self):
        for change in ({'waist_ease':-1},{'hip_ease':13},{'hem_fullness':81},
                       {'hem_distribution':[1,1,0,0]},{'hem_distribution':[1,0,0]},
                       {'hem_distribution':[float('nan'),0,0,1]},
                       {'hem_fullness':float('inf')}, {'seam_allowance':-1},
                       {'waist':81.5,'hip':82,'waist_ease':12,'hip_ease':0}):
            with self.subTest(change=change), self.assertRaises(ValueError):
                self.draft.draft_princess_dress(self.draft.DressParams(**change))

    def test_reference_landmarks_remain_at_baseline(self):
        fixture=json.loads((Path(__file__).parent/'reference-fixture.json').read_text())
        snap=validation.snapshot(self.d,self.draft,self.render)
        selected={'metrics':snap['metrics'],'panels':[
            {'name':p['name'],'marks':p['marks'],'seams':[
                {k:s[k] for k in ['name','kind','knots','spans','center']} for s in p['seams']]}
            for p in snap['panels']]}
        self.assertTrue(validation.compare(fixture,selected,1e-8)['pass'])

    def test_comparison_detects_missing_and_changed_geometry(self):
        self.assertFalse(validation.compare([1,2],[1],1e-7)['pass'])
        self.assertFalse(validation.compare({'x':1},{'x':1.01},1e-7)['pass'])
        self.assertFalse(validation.compare(float('nan'),float('nan'),1e-7)['pass'])

    def test_landmark_uses_arc_distance_not_vertical_distance(self):
        line=LineString([(0,4),(3,0),(3,-2)])
        self.assertAlmostEqual(validation.height_distance(line,0),5)
        with self.assertRaises(ValueError):
            validation.height_distance(LineString([(0,2),(1,-1),(2,2)]),0)

    def test_reference_outlines_are_valid(self):
        self.assertTrue(all(r['pass'] for r in validation.outline_checks(self.pieces)))

    def test_waist_crossing_repair_preserves_stitch_and_reference_allowance(self):
        from shapely.geometry import Polygon
        for p in self.d.panels:
            raw=self.draft._raw_offset_closed(p.outline,1)
            fixed=self.draft.offset_closed(p.outline,1)
            self.assertEqual(raw,fixed, 'Reference cutting contour should not change')
        extreme=self.draft.draft_princess_dress(self.draft.DressParams(waist=58,hip=118))
        for p in extreme.panels:
            original=list(p.outline)
            for allowance in [.1,1,2.5]:
                for pts in [p.outline,list(reversed(p.outline)),
                            [self.draft.Vec2(-v.x+123,v.y-51) for v in p.outline]]:
                    cut=self.draft.offset_closed(pts,allowance)
                    cp=Polygon(list(map(validation.xy,cut)))
                    self.assertTrue(cp.is_valid, (p.name,allowance))
                    self.assertTrue(cp.covers(Polygon(list(map(validation.xy,pts)))))
            self.assertEqual(original,p.outline)

    def test_named_notches_pair_regardless_of_storage_order(self):
        altered=copy.deepcopy(self.d)
        reference,_=validation.seam_rows(altered,self.policy)
        for p in altered.panels:
            p.notches.reverse(); p.notch_ids.reverse()
        actual,issues=validation.seam_rows(altered,self.policy)
        self.assertFalse(issues)
        self.assertEqual(reference,actual)
        p=altered.panels[1]
        del p.notches[p.notch_ids.index('side.waist')]
        p.notch_ids.remove('side.waist')
        with self.assertRaises(ValueError): validation.seam_rows(altered,self.policy)

    def test_side_marks_are_shared_at_waist_and_hip(self):
        for p in self.d.panels[1:3]:
            marks=dict(zip(p.notch_ids,p.notches))
            self.assertAlmostEqual(marks['side.waist'].y,0)
            self.assertAlmostEqual(marks['side.hip'].y,-18)
        self.assertEqual(sum(len(p.notches) for p in self.d.panels),16)

    def test_nested_loop_check_detects_edges_crossing_a_concavity(self):
        v=self.draft.Vec2
        outer=[v(x,y) for x,y in [(0,0),(10,0),(10,10),(8,10),(8,3),(7,3),(7,10),(0,10)]]
        # Endpoints and midpoint of the top edge are inside, but x=7..8 is outside.
        inner=[v(1,1),v(9,1),v(9,9),v(1,9)]
        self.assertFalse(self.draft._nested_ring(inner,outer))

    def test_disconnected_positive_lobes_are_not_silently_discarded(self):
        ring=[self.draft.Vec2(x,y) for x,y in
              [(0,0),(1,0),(1,1),(0,1),(0,0),(-1,0),(-1,-1),(0,-1)]]
        with self.assertRaises(ValueError): self.draft._trim_offset_loops(ring)

    def test_self_intersection_is_detected(self):
        p=copy.deepcopy(self.pieces[0])
        p['cut']=[self.draft.Vec2(x,y) for x,y in [(0,0),(2,2),(0,2),(2,0),(0,0)]]
        result=validation.outline_checks([p])[0]
        self.assertFalse(result['pass'])
        self.assertFalse(result['cut_valid'])

    def test_reference_dxf_reopens_and_matches(self):
        result=validation.dxf_check(self.render._dxf.pattern_dxf(self.pieces),self.pieces,self.policy)
        self.assertTrue(result['pass_'],result['errors'])
        self.assertEqual(result['named_seams'],20)
        self.assertEqual(result['cut_loops'],4)

    def test_declared_mm_does_not_hide_wrong_scale(self):
        doc=ezdxf.read(io.StringIO(self.render._dxf.pattern_dxf(self.pieces)))
        for e in doc.modelspace(): e.scale_uniform(.1)
        out=io.StringIO(); doc.write(out)
        self.assertFalse(validation.dxf_check(out.getvalue(),self.pieces,self.policy)['pass_'])

    def test_missing_seam_entity_is_detected(self):
        doc=ezdxf.read(io.StringIO(self.render._dxf.pattern_dxf(self.pieces)))
        space=doc.modelspace()
        space.delete_entity(next(e for e in space if e.dxf.layer=='SEAM-CB-SHOULDER'))
        out=io.StringIO(); doc.write(out)
        self.assertFalse(validation.dxf_check(out.getvalue(),self.pieces,self.policy)['pass_'])

    def test_unapproved_ease_remains_unspecified(self):
        rows,issues=validation.seam_rows(self.d,self.policy)
        self.assertFalse(issues)
        self.assertEqual(len(rows),14)
        self.assertTrue(all(r['target_cm'] is None for r in rows if 'princess' in r['pair']))
        side=[r for r in rows if r['pair']=='side']
        self.assertAlmostEqual(sum(r['difference_cm'] for r in side[:-1]),side[-1]['difference_cm'])
        # This guards the reason for interval measurements: total can be within
        # the review gate while individual intervals are outside it.
        self.assertFalse(side[-1]['review'])
        self.assertTrue(any(r['review'] for r in side[:-1]))

    def test_browser_exporter_parses_and_copies_match(self):
        source=self.root/'Export-DXF/dxf.js'; served=self.root/'web/Export-DXF/dxf.js'
        self.assertEqual(source.read_bytes(),served.read_bytes())
        node=os.environ.get('NODE_EXECUTABLE','node')
        result=subprocess.run([node,'--check',str(served)],capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stderr)


if __name__=='__main__': unittest.main()
