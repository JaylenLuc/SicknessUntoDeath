Station normalization
=====================

`node scripts/rail-explorer/normalize-stations.mjs` previews and validates station
normalization. Add `--write` to update the GeoJSON files listed in the Probe's
`sources.ts`. Run this after importing fresh station data. Re-running on normalized
files makes no changes.

Platforms are matched by station/intersection names, street metadata, and proximity.
Walking connections to different intersections and distant namesakes stay separate.
Each network retains one local copy of each station it serves, so layer toggles and
partial network loads work. Copies share the same feature ID, `canonical_station_id`,
name, coordinates, and `station_route_ids`. Every line's `stationIds` references those
shared IDs. Line geometry is preserved.

Coordinate authority is real Metro first, proposed Metro second, then fantasy heavy
rail and local rail. If several authoritative platforms are available at the same
priority, their original qualified IDs provide a stable tie-break. The chosen source,
original member ID, and network group are recorded in `station_coordinate_*` fields.
`station_member_ids` and `station_aliases` preserve old IDs and names for the Probe.
Original GTFS stop identifiers are retained in `source_stops`.

When repairing data that was already normalized under a different coordinate policy,
`--coordinate-reference /path/to/reference.json` accepts original coordinates keyed by
qualified platform ID, with `{sourceId, group, coordinates}` values. This avoids using
already-relocated copies as authoritative coordinates.

The script validates station references, shared coordinates, serving lines, branch
order, and unchanged line geometry before writing.

Station alignment
=================

After normalization, `node scripts/rail-explorer/align-stations.mjs` previews
alignment repairs. Add `--write` to save them. Existing/proposed stations snap to
the closest serving alignment in their recorded authoritative source. Every
network copy receives the same coordinates; fantasy-only station locations stay
fixed. Fantasy routes extend at endpoints or bend locally to touch their stations,
with neighboring stops pinned in place.

By default, existing/proposed route geometry is preserved. The report lists gaps
that remain where several alignments serve one shared station but do not meet.
`--connect-shared` permits small local adjustments to those routes as well and
requires every station/serving-feature pair to touch within one millimetre before
writing. This is a map geometry adjustment, not a surveyed track alignment.

The alignment step preserves station identities, route memberships, stop order,
and other feature properties. Re-running with the same options makes no changes.
Run normalization again afterward to refresh any walking-distance metadata.
