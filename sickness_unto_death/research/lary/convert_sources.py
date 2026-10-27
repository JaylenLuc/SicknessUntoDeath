"""Convert the public Brooks/Lutz archive to separately attributable rail layers.

Requires pyshp and pyproj. Usage:
  python convert_sources.py /path/to/2018-05-29_la_streetcar_maps.zip
  python convert_sources.py /path/to/2018-05-29_la_streetcar_maps.zip --network pe

Outputs are research candidates, not a certified all-time track inventory.
The combined file preserves observations and overlap; it is not a geometric union.
"""

import hashlib
import argparse
import io
import json
import math
from pathlib import Path
import zipfile

from pyproj import CRS, Transformer
import shapefile

ROOT = Path(__file__).resolve().parent
SOURCE_URL = "https://www.leahbrooks.org/leahweb/data_to_release/streetcars/2018-05-29_la_streetcar_maps.zip"
CITATION = "Leah Brooks and Byron Lutz (2019), Vestiges of Transit: Urban Persistence at a Microscale, Review of Economics and Statistics 101(3), 385-399. GIS digitization credited to Jordan Hale in the paper."
DEFINITIONS = [
    ("1915-LA-PE_2011_06_26", "lary-1915-brooks-lutz", 1915, 1915, 59),
    ("193x-LArail_2011-6-26a", "lary-1930s-brooks-lutz", None, 1935, 37),
]
PE_DEFINITIONS = [
    ("1915-LA-PE_2011_06_26", "pe-1915-brooks-lutz", 1915, 1915, 22),
    ("1928-PElines_2011-06-26", "pe-1928-brooks-lutz", 1928, 1928, 81),
]


def positions(coordinates):
    if coordinates and isinstance(coordinates[0], (float, int)):
        yield coordinates
    else:
        for child in coordinates:
            yield from positions(child)


def bounds(features):
    points = [p for f in features for p in positions(f["geometry"]["coordinates"])]
    return [min(p[0] for p in points), min(p[1] for p in points),
            max(p[0] for p in points), max(p[1] for p in points)]


def convert(archive_path, network="lary"):
    root = ROOT if network == "lary" else ROOT.parent / "pe"
    operator = "LA" if network == "lary" else "PE"
    operator_name = "Los Angeles Railway" if network == "lary" else "Pacific Electric"
    label = "LARy" if network == "lary" else "PE"
    definitions = DEFINITIONS if network == "lary" else PE_DEFINITIONS
    data = Path(archive_path).read_bytes()
    archive_hash = hashlib.sha256(data).hexdigest()
    out = root / "geojson"
    out.mkdir(parents=True, exist_ok=True)
    collections = []
    checks = []
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        for base, source_id, snapshot_year, reference_year, expected in definitions:
            crs = CRS.from_wkt(archive.read(base + ".prj").decode())
            forward = Transformer.from_crs(crs, "EPSG:4326", always_xy=True)
            reverse = Transformer.from_crs("EPSG:4326", crs, always_xy=True)
            reader = shapefile.Reader(**{
                extension: io.BytesIO(archive.read(base + "." + extension))
                for extension in ("shp", "shx", "dbf")
            })
            max_roundtrip_feet = 0

            def project(coords):
                nonlocal max_roundtrip_feet
                if coords and isinstance(coords[0], (float, int)):
                    lon, lat = forward.transform(coords[0], coords[1])
                    assert math.isfinite(lon) and math.isfinite(lat)
                    assert -119 < lon < -117 and 33 < lat < 35
                    result = [round(lon, 7), round(lat, 7)]
                    x, y = reverse.transform(*result)
                    max_roundtrip_feet = max(max_roundtrip_feet, math.hypot(x-coords[0], y-coords[1]))
                    return result
                return [project(child) for child in coords]

            features = []
            for index, record in enumerate(reader.iterShapeRecords()):
                original = record.record.as_dict()
                if original.get("Operator", operator) != operator:
                    continue
                geometry = record.shape.__geo_interface__
                assert geometry["type"] in ("LineString", "MultiLineString")
                geometry["coordinates"] = project(geometry["coordinates"])
                features.append({
                    "type": "Feature",
                    "id": f"{source_id}-{index}",
                    "geometry": geometry,
                    "properties": {
                        **original,
                        "Name": original.get("Name") or original.get("Line"),
                        "operator": operator_name,
                        "source_id": source_id,
                        "source_feature_index": index,
                        "source_snapshot_year": snapshot_year,
                        "historical_reference_year": reference_year,
                        "source_url": SOURCE_URL,
                        "source_citation": CITATION,
                        "coverage_status": "source_observation_not_all_time_inventory",
                    },
                })
            assert len(features) == expected, "Archive changed: re-audit the source counts"
            assert max_roundtrip_feet < 0.2
            collection = {
                "type": "FeatureCollection",
                "name": source_id,
                "bbox": bounds(features),
                "metadata": {
                    "source_url": SOURCE_URL,
                    "source_archive_sha256": archive_hash,
                    "source_shapefile": base + ".shp",
                    "source_crs": crs.to_string(),
                    "output_crs": "OGC:CRS84 (WGS84 longitude, latitude)",
                    "source_citation": CITATION,
                    "historical_snapshot_year": snapshot_year,
                    "historical_reference_year": reference_year,
                    "date_note": (
                        f"The source filename labels this snapshot {snapshot_year}; individual track operating dates are not encoded. The 1915 PE source covers a smaller area than 1928, so missing geometry does not prove a line did not exist."
                        if network == "pe" else
                        "1915 is the source filename date; the appendix lists Gillespie's 1915 guide. Operating dates of individual tracks are not encoded."
                        if snapshot_year else
                        "The source filename is 193x. The appendix identifies its official LARy reference map as 1935, dated using Walker. Retain the uncertain snapshot date pending map-to-feature verification."
                    ),
                    "coverage_status": "unverified_for_all_time_completeness",
                    "license_note": "Author's download page requests citation; no explicit redistribution license was found in the archive. No license is inferred here.",
                    "feature_count": len(features),
                },
                "features": features,
            }
            (out / (source_id + ".geojson")).write_text(json.dumps(collection, separators=(",", ":")) + "\n")
            collections.append(collection)
            checks.append({
                "source_id": source_id,
                "feature_count": len(features),
                "coordinate_count": sum(len(list(positions(f["geometry"]["coordinates"]))) for f in features),
                "bbox": collection["bbox"],
                "max_crs_roundtrip_error_feet": max_roundtrip_feet,
                "validation_scope": "Conversion integrity only; historical accuracy is not certified.",
            })
    combined = [f for collection in collections for f in collection["features"]]
    assert len({f["id"] for f in combined}) == len(combined)
    overlay = {
        "type": "FeatureCollection",
        "name": f"{label} combined source observations - incomplete research overlay",
        "bbox": bounds(combined),
        "metadata": {
            "source_citation": CITATION,
            "source_archive_sha256": archive_hash,
            "coverage_status": "incomplete_not_a_cumulative_extent_claim",
            "merge_method": f"Concatenation of 1915 and {'193x' if network == 'lary' else '1928'} source observations with source IDs retained. Overlaps and source disagreements are intentionally preserved; no snapping or deduplication.",
            "feature_count": len(combined),
        },
        "features": combined,
    }
    (out / f"{network}-combined-source-observations.geojson").write_text(json.dumps(overlay, separators=(",", ":")) + "\n")
    (root / "conversion-checks.json").write_text(json.dumps(checks, indent=2) + "\n")
    print(json.dumps(checks, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive_path")
    parser.add_argument("--network", choices=("lary", "pe"), default="lary")
    args = parser.parse_args()
    convert(args.archive_path, args.network)
