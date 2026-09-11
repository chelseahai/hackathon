"""Tests for range descriptors and allocation families, separate from drafting."""
import unittest
from study import descriptor,inputs_for,slices

class RangeMathTests(unittest.TestCase):
    def test_straight_does_not_mean_vertical(self):
        vertical=descriptor([(0,10),(0,0)])
        flare=descriptor([(0,10),(20,0)])
        self.assertEqual(vertical['deviation_ratio'],0)
        self.assertEqual(flare['deviation_ratio'],0)
        self.assertEqual(vertical['slope_outward_per_down'],0)
        self.assertEqual(flare['slope_outward_per_down'],2)
    def test_chord_deviation_and_reflection(self):
        a=descriptor([(0,10),(2,5),(0,0)])
        b=descriptor([(0,10),(-2,5),(0,0)],-1)
        self.assertAlmostEqual(a['deviation_cm'],2)
        self.assertAlmostEqual(a['deviation_ratio'],.2)
        self.assertEqual(a,b)
    def test_degenerate_chord_is_explicit(self):
        with self.assertRaises(ValueError):descriptor([(0,0),(0,0)])
    def test_allocation_budget_and_baseline(self):
        base={'hem_distribution':[3/16,4/16,4/16,5/16]}
        for s in slices()[3:]:
            for share in (0,.1,.5,.9,1):
                ps=inputs_for(base,s,share,32)['hem_distribution']
                self.assertAlmostEqual(sum(ps),1)
                self.assertTrue(all(p>=0 for p in ps))
                self.assertAlmostEqual(ps[0]+ps[2] if s['id']=='side_allocation' else ps[2]+ps[3],share)
        for s,ref in zip(slices()[3:],(7/16,9/16)):
            for a,b in zip(inputs_for(base,s,ref,32)['hem_distribution'],base['hem_distribution']):self.assertAlmostEqual(a,b)
        self.assertEqual(base['hem_distribution'],[3/16,4/16,4/16,5/16])

if __name__=='__main__':unittest.main()
