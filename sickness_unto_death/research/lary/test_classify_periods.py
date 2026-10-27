import unittest
from shapely.geometry import LineString
from classify_periods import Comparison


class ComparisonTests(unittest.TestCase):
    def lengths(self, original, other):
        shared, unique = Comparison([LineString(other)]).split(LineString(original))
        return sum(g.length for g in shared), sum(g.length for g in unique)

    def test_partial_overlap_splits_at_actual_endpoints(self):
        self.assertEqual(self.lengths([(0, 0), (100, 0)], [(25, 0), (75, 0)]), (50, 50))

    def test_small_digitizing_offset_and_reversed_direction_match(self):
        self.assertEqual(self.lengths([(0, 0), (100, 0)], [(100, 3), (0, 3)]), (100, 0))

    def test_crossing_is_not_a_shared_corridor(self):
        self.assertEqual(self.lengths([(0, 0), (100, 0)], [(50, -50), (50, 50)]), (0, 100))

    def test_separate_parallel_streets_do_not_match(self):
        self.assertEqual(self.lengths([(0, 0), (100, 0)], [(0, 20), (100, 20)]), (0, 100))

    def test_collinear_extension_stays_unique(self):
        self.assertEqual(self.lengths([(0, 0), (100, 0)], [(100, 0), (200, 0)]), (0, 100))


if __name__ == "__main__":
    unittest.main()
