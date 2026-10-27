"""Split LARy source observations into shared and period-only stretches.

Requires shapely >= 2 and pyproj. Run this after convert_sources.py.
Comparison uses UTM 11N metres, without moving the original source geometry.
This is a geometric comparison, not proof of construction/abandonment dates.
"""
import json
import math
from collections import Counter
from pathlib import Path

from pyproj import Transformer
from shapely.geometry import LineString, mapping, shape
from shapely.ops import linemerge, transform, unary_union
from shapely.strtree import STRtree

ROOT = Path(__file__).resolve().parent
TOLERANCE_METRES = 5
MAX_ANGLE_DEGREES = 20
FORWARD = Transformer.from_crs(4326, 26911, always_xy=True).transform
REVERSE = Transformer.from_crs(26911, 4326, always_xy=True).transform


def lines(geometry):
    if geometry.is_empty:
        return []
    if geometry.geom_type == "LineString":
        return [geometry] if geometry.length > 1e-8 else []
    if hasattr(geometry, "geoms"):
        return [line for part in geometry.geoms for line in lines(part)]
    return []


def segments(geometries):
    result = []
    for geometry in geometries:
        for line in lines(geometry):
            for a, b in zip(line.coords, list(line.coords)[1:]):
                if a != b:
                    result.append(LineString([a, b]))
    return result


def parallel(a, b):
    ax, ay = a.coords[-1][0]-a.coords[0][0], a.coords[-1][1]-a.coords[0][1]
    bx, by = b.coords[-1][0]-b.coords[0][0], b.coords[-1][1]-b.coords[0][1]
    return abs(ax*bx + ay*by) >= math.cos(math.radians(MAX_ANGLE_DEGREES))*a.length*b.length


class Comparison:
    def __init__(self, other_geometries):
        self.other = segments(other_geometries)
        self.tree = STRtree(self.other)
        self.cache = {}

    def split_segment(self, segment):
        key = tuple(sorted(segment.coords))
        if key not in self.cache:
            candidates = self.tree.query(segment.buffer(TOLERANCE_METRES))
            masks = [self.other[i].buffer(TOLERANCE_METRES, cap_style=2)
                     for i in candidates if parallel(segment, self.other[i])]
            mask = unary_union(masks)
            shared = segment.intersection(mask)
            unique = segment.difference(mask)
            assert abs(shared.length + unique.length - segment.length) < 1e-6
            self.cache[key] = (lines(shared), lines(unique))
        return self.cache[key]

    def split(self, geometry):
        shared, unique = [], []
        for segment in segments([geometry]):
            matched, unmatched = self.split_segment(segment)
            shared.extend(matched)
            unique.extend(unmatched)
        return shared, unique


def combine(parts):
    geometry = unary_union(parts)
    return geometry if geometry.geom_type == "LineString" else linemerge(geometry)


def build():
    inputs = [json.loads((ROOT / "geojson" / name).read_text()) for name in (
        "lary-1915-brooks-lutz.geojson", "lary-1930s-brooks-lutz.geojson")]
    geometries = [[transform(FORWARD, shape(f["geometry"])) for f in data["features"]]
                  for data in inputs]
    features = []
    for index, data in enumerate(inputs):
        comparison = Comparison(geometries[1-index])
        period = "1915" if index == 0 else "1930s"
        for feature, geometry in zip(data["features"], geometries[index]):
            shared, unique = comparison.split(geometry)
            for category, parts in (("shared", shared), (f"{period}_only", unique)):
                if not parts:
                    continue
                result = combine(parts)
                features.append({
                    "type": "Feature",
                    "id": f"{feature['id']}-{category}",
                    "properties": {
                        **feature["properties"],
                        "observation_id": feature["id"],
                        "period": period,
                        "comparison_class": category,
                        "render": False,
                        "comparison_method": "within_5m_and_parallel_within_20_degrees",
                    },
                    "geometry": mapping(transform(REVERSE, result)),
                })
            # Validate the split covers every original segment without invented geometry.
            recovered = unary_union(shared + unique)
            assert geometry.hausdorff_distance(recovered) < 1e-6
            assert abs(unary_union(lines(geometry)).length - recovered.length) < 1e-5
    observations = features[:]
    for category in ("shared", "1915_only", "1930s_only"):
        matching = [f for f in observations if f["properties"]["comparison_class"] == category]
        display = [f for f in matching if category != "shared" or f["properties"]["period"] == "1930s"]
        # Dissolve identical display paths so different route starts do not fill dash gaps.
        geometry = combine([part for f in display for part in lines(shape(f["geometry"]))])
        features.append({
            "type": "Feature",
            "id": f"lary-display-{category}",
            "properties": {
                "comparison_class": category,
                "render": True,
                "contributing_observation_ids": sorted({f["properties"]["observation_id"] for f in matching}),
            },
            "geometry": mapping(geometry),
        })
    output = {
        "type": "FeatureCollection",
        "name": "LARy 1915 + 1930s geometric comparison",
        "metadata": {
            "source_citation": inputs[0]["metadata"]["source_citation"],
            "source_archive_sha256": inputs[0]["metadata"]["source_archive_sha256"],
            "coverage_status": "incomplete_not_a_cumulative_extent_claim",
            "comparison_crs": "EPSG:26911",
            "tolerance_metres": TOLERANCE_METRES,
            "max_angle_degrees": MAX_ANGLE_DEGREES,
            "method": "Split original geometry against flat-ended buffers around parallel segments in the other period. Classified source observations retained but hidden. Three display features dissolve exact duplicates within each class; shared display uses 1930s geometry. No snapping or historical date inference.",
            "limitations": "Near-parallel tracks within five metres can match. Larger digitizing offsets may appear period-only. Exact 1930s snapshot remains uncertain.",
        },
        "features": features,
    }
    serialized = json.dumps(output, separators=(",", ":")) + "\n"
    filename = "lary-period-comparison.geojson"
    (ROOT / "geojson" / filename).write_text(serialized)
    (ROOT.parent.parent / "public" / "la-metro-rail" / filename).write_text(serialized)
    print(json.dumps({"classified_features": len(features), "visible_features_by_class": dict(Counter(
        f["properties"]["comparison_class"] for f in features if f["properties"]["render"]))}, indent=2))


if __name__ == "__main__":
    build()
