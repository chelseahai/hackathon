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
