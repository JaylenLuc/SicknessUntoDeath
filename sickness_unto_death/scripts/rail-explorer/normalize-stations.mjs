import assert from "node:assert/strict";
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

// Run without --write to preview/validate. Re-running on normalized files is a no-op.
const root = new URL("../../", import.meta.url);
const temporary = await mkdtemp(join(tmpdir(), "rail-station-migration-"));
try {
  for (const [name, file] of [
    ["catalog", "lib/rail-explorer/catalog.ts"],
    ["fantasyRailNetworks", "components/metro/fantasyRailNetworks.ts"],
    ["proposedMetroProjects", "components/metro/proposedMetroProjects.ts"],
    ["sources", "components/metro/probe/sources.ts"],
  ]) {
    const source = await readFile(new URL(file, root), "utf8");
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
    await writeFile(join(temporary, `${name}.mjs`), compiled.replaceAll('"../fantasyRailNetworks"', '"./fantasyRailNetworks.mjs"').replaceAll('"../proposedMetroProjects"', '"./proposedMetroProjects.mjs"'));
  }
  const { buildRailCatalog, sourceStationId, normalizeSearch } = await import(pathToFileURL(join(temporary, "catalog.mjs")));
  const { EXPLORER_SOURCES } = await import(pathToFileURL(join(temporary, "sources.mjs")));
  const inputs = await Promise.all(EXPLORER_SOURCES.map(async (source) => ({
    source, data: JSON.parse(await readFile(new URL(`public/la-metro-rail/${source.file}`, root), "utf8")),
  })));
  const catalog = buildRailCatalog(inputs);
  // A reference snapshot can restore original platform locations when migrating
  // files previously normalized under a different coordinate policy.
  const referenceIndex = process.argv.indexOf("--coordinate-reference");
  const coordinateReference = referenceIndex >= 0 ? JSON.parse(await readFile(process.argv[referenceIndex + 1], "utf8")) : {};
  const originalId = (source, point) => point.properties.canonical_station_id || `${source.id}:${sourceStationId(point.properties, point.geometry.coordinates)}`;
  const raw = new Map(inputs.flatMap(({ source, data }) => data.features.filter((f) => f.geometry.type === "Point").map((f) => [originalId(source, f), f.properties])));
  const parts = (name) => name.replace(/\s*[—–].*$/, "").replace(/\s*-\s*Metro\b.*$/i, "")
    .replace(/\b[A-Z](?:\s*&\s*[A-Z])*\s*-?\s*Lines?\b/g, "").replace(/\([^)]*\)/g, "")
    .split(/\s*(?:\/|&|\bat\b)\s*/i).map((part) => normalizeSearch(part)
      .replace(/\bmartin luther king(?: jr)?\b/g, "mlk").replace(/\bcesar e chavez\b/g, "cesar chavez")
      .replace(/\bwatts towers\b/g, "watts").replace(/\b(\d+)(?:st|nd|rd|th)\b/g, "$1")
      .replace(/\b(?:boulevard|blvd|avenue|ave|street|st|road|rd|drive|dr|highway|hwy|way|station|platforms?)\b/g, "")
      .replace(/\s+/g, " ").trim()).filter(Boolean).sort();
  const distance = (a, b) => Math.hypot((a.coordinates[0] - b.coordinates[0]) * 92288, (a.coordinates[1] - b.coordinates[1]) * 111320);
  function similar(a, b) {
    if (a === b) return true;
    if (Math.min(a.length, b.length) < 5 || Math.abs(a.length - b.length) > 1) return false;
    let i = 0, j = 0, edits = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) { i++; j++; continue; }
      if (++edits > 1) return false;
      if (a.length >= b.length) i++;
      if (b.length >= a.length) j++;
    }
    return edits + a.length - i + b.length - j <= 1;
  }
  const rank = { heavyRail: 0, existingMetro: 1, lightRail: 2, metroProjects: 3 };
  const ordered = [...catalog.stations].sort((a, b) => rank[a.group] - rank[b.group] || a.id.localeCompare(b.id));
  const names = ordered.map((s) => parts(s.name));
  const streets = ordered.map((s) => {
    const p = raw.get(s.id);
    return p.street1 && p.street2 ? parts(`${p.street1} / ${p.street2}`).join("|") : "";
  });
  const parents = ordered.map((_, i) => i), members = ordered.map((_, i) => [i]);
  const find = (i) => parents[i] === i ? i : (parents[i] = find(parents[i]));
  for (let i = 0; i < ordered.length; i++) for (let j = i + 1; j < ordered.length; j++) {
    const a = ordered[i], b = ordered[j], d = distance(a, b);
    if (raw.get(a.id).canonical_station_id && raw.get(b.id).canonical_station_id) continue;
    if (d > 600) continue;
    const ap = names[i], bp = names[j], ak = ap.join("|"), bk = bp.join("|");
    if (!ak || !bk || ak === "unnamed" || bk === "unnamed") continue;
    const sameName = ak === bk;
    const sameStreet = d <= 120 && ((streets[i] && (streets[i] === bk || streets[i] === streets[j])) || (streets[j] && streets[j] === ak));
    const shortName = d <= 120 && ((ap.length === 1 && bp.includes(ak)) || (bp.length === 1 && ap.includes(bk)));
    const spelling = d <= 120 && ap.length === bp.length && ap.every((p, k) => similar(p, bp[k]));
    const namedComplex = d <= 60 && (ap.length === 1 || bp.length === 1) && (a.transferIds.includes(b.id) || b.transferIds.includes(a.id));
    if (!sameName && !sameStreet && !shortName && !spelling && !namedComplex) continue;
    const left = find(i), right = find(j);
    if (left === right || members[left].some((x) => members[right].some((y) => distance(ordered[x], ordered[y]) > 600))) continue;
    parents[right] = left;
    members[left].push(...members[right]);
  }
  const unique = (items) => [...new Set(items)];
  const aliases = new Map();
  const stations = ordered.flatMap((station, i) => {
    if (find(i) !== i) return [];
    const group = members[i].map((index) => ordered[index]);
    const memberIds = unique(group.flatMap((s) => s.memberIds)).sort();
    for (const s of group) aliases.set(s.id, station.id);
    memberIds.forEach((id) => aliases.set(id, station.id));
    return [{ ...station, memberIds, aliases: unique(group.flatMap((s) => s.aliases)).sort(), routes: unique(group.flatMap((s) => s.routes)).sort() }];
  });
  const byId = new Map(stations.map((s) => [s.id, s]));
  const coordinateRank = { existingMetro: 0, metroProjects: 1, heavyRail: 2, lightRail: 3 };
  const coordinateCandidates = new Map(stations.map((s) => [s.id, []]));
  for (const { source, data } of inputs) for (const point of data.features) {
    if (point.geometry.type !== "Point") continue;
    const p = point.properties;
    coordinateCandidates.get(aliases.get(originalId(source, point))).push({
      sourceId: p.station_coordinate_source ?? source.id,
      group: p.station_coordinate_group ?? source.group,
      memberId: p.station_coordinate_member_id ?? originalId(source, point),
      coordinates: point.geometry.coordinates,
    });
  }
  for (const station of stations) {
    const references = station.memberIds.flatMap((id) => coordinateReference[id] ? [{ ...coordinateReference[id], memberId: id }] : []);
    const candidates = references.length ? references : coordinateCandidates.get(station.id);
    const authority = candidates.sort((a, b) => coordinateRank[a.group] - coordinateRank[b.group] || a.memberId.localeCompare(b.memberId))[0];
    station.coordinates = authority.coordinates;
    station.coordinateSource = authority.sourceId;
    station.coordinateGroup = authority.group;
    station.coordinateMemberId = authority.memberId;
  }
  const rawLookup = new Map();
  for (const [id, target] of aliases) {
    const key = id.slice(id.indexOf(":") + 1);
    if (!rawLookup.has(key)) rawLookup.set(key, target);
    else if (rawLookup.get(key) !== target) rawLookup.set(key, null);
  }
  const resolve = (id, source) => aliases.get(id) || aliases.get(`${source.id}:${id}`) || rawLookup.get(id);
  // Rewrite explicit references, including transfer and extension metadata.
  function rewrite(value, source, key = "") {
    if (Array.isArray(value)) {
      if (key === "stationIds" || /station_ids$/.test(key)) return unique(value.map((id) => resolve(id, source) || id));
      return value.map((item) => rewrite(item, source));
    }
    if (!value || typeof value !== "object") return value;
    const result = Object.fromEntries(Object.entries(value).map(([k, v]) => [k,
      (k === "station_id" || k === "transfer_station_id") && typeof v === "string" ? resolve(v, source) || v : rewrite(v, source, k),
    ]));
    if (result.station_id && byId.has(result.station_id) && result.station_name) result.station_name = byId.get(result.station_id).name;
    return result;
  }
  const normalized = inputs.map(({ source, data }) => {
    const points = data.features.filter((f) => f.geometry.type === "Point");
    const local = new Map();
    for (const point of points) {
      const id = aliases.get(originalId(source, point));
      if (!local.has(id)) local.set(id, []);
      local.get(id).push(point);
    }
    const seen = new Set();
    const features = data.features.flatMap((feature) => {
      if (feature.geometry.type !== "Point") {
        // Materialize each feature's original stop order before changing coordinates.
        const one = buildRailCatalog([{ source, data: { type: "FeatureCollection", features: [feature, ...points] } }]);
        const stopIds = unique(one.routes[0].stationIds.map((id) => aliases.get(id)));
        assert.ok(stopIds.every(Boolean), `Unresolved route stop in ${source.file}`);
        return [{ ...feature, properties: { ...rewrite(feature.properties, source), stationIds: stopIds } }];
      }
      const id = aliases.get(originalId(source, feature));
      if (seen.has(id)) return [];
      seen.add(id);
      const station = byId.get(id), platforms = local.get(id);
      const properties = rewrite(structuredClone(feature.properties), source);
      properties.id = id;
      properties.canonical_station_id = id;
      properties.name = station.name;
      if ("stop_name" in properties) properties.stop_name = station.name;
      if ("stop_id" in properties) {
        properties.source_stops = platforms.flatMap((p) => p.properties.source_stops || [{
          stop_id: p.properties.stop_id, stop_code: p.properties.stop_code,
          parent_station: p.properties.parent_station, stop_name: p.properties.stop_name,
        }]);
        properties.stop_id = id;
        delete properties.stop_code;
        delete properties.parent_station;
      }
      properties.station_aliases = station.aliases;
      properties.station_member_ids = station.memberIds;
      properties.station_route_ids = station.routes;
      properties.station_coordinate_source = station.coordinateSource;
      properties.station_coordinate_group = station.coordinateGroup;
      properties.station_coordinate_member_id = station.coordinateMemberId;
      const localRoutes = station.routes.filter((route) => route.startsWith(`${source.id}:`)).map((route) => route.slice(source.id.length + 1));
      if (source.group === "existingMetro") {
        properties.routes = [...new Map(platforms.flatMap((p) => p.properties.routes || []).map((r) => [r.route_id, r])).values()].sort((a, b) => a.route_id.localeCompare(b.route_id));
      } else properties.routes = localRoutes.join(", ");
      for (const key of ["transfer_station_ids", "inter_urbes_transfer_station_ids"]) {
        if (Array.isArray(properties[key])) properties[key] = properties[key].filter((target) => target !== id && byId.has(target));
      }
      for (const key of ["inter_urbes_transfers", "local_walking_transfers"]) {
        if (Array.isArray(properties[key])) properties[key] = properties[key].filter((target) => target.station_id !== id && byId.has(target.station_id)).map((target) => ({
          ...target, ...(target.distance_metres !== undefined ? { distance_metres: Math.round(distance(station, byId.get(target.station_id))) } : {}),
        }));
      }
      if (properties.transfer_station_id === id) delete properties.transfer_station_id;
      return [{ ...feature, id, properties, geometry: { type: "Point", coordinates: station.coordinates } }];
    });
    return { source, data: { ...rewrite(data, source), features } };
  });

  const result = buildRailCatalog(normalized);
  assert.equal(result.stations.length, stations.length, "Catalog must use exactly the persisted station identities");
  for (const route of catalog.routes) {
    const updated = result.routes.find((r) => r.id === route.id);
    assert.deepEqual(new Set(updated.stationIds), new Set(route.stationIds.map((id) => aliases.get(id))), `Lost route membership: ${route.id}`);
    const branches = route.branches.map((branch) => unique(branch.map((id) => aliases.get(id))));
    const distinctBranches = branches.filter((branch, i) => !branches.slice(0, i).some((other) => JSON.stringify(other) === JSON.stringify(branch) || JSON.stringify(other) === JSON.stringify([...branch].reverse())));
    assert.deepEqual(updated.branches, distinctBranches, `Changed stop order: ${route.id}`);
    assert.deepEqual(updated.features.map((f) => f.geometry), route.features.map((f) => f.geometry), `Changed route geometry: ${route.id}`);
  }
  for (const { source, data } of normalized) {
    const points = data.features.filter((f) => f.geometry.type === "Point");
    const ids = new Set(points.map((p) => p.properties.id));
    assert.equal(ids.size, points.length, `Duplicate stations in ${source.file}`);
    for (const point of points) {
      const station = result.stations.find((s) => s.id === point.properties.id);
      assert.equal(point.properties.name, station.name);
      assert.deepEqual(point.geometry.coordinates, station.coordinates);
      assert.deepEqual([...point.properties.station_route_ids].sort(), [...station.routes].sort());
      const authoritative = byId.get(station.id);
      assert.equal(point.properties.station_coordinate_source, authoritative.coordinateSource);
      const groups = station.groups;
      if (groups.includes("existingMetro")) assert.equal(point.properties.station_coordinate_group, "existingMetro");
      else if (groups.includes("metroProjects")) assert.equal(point.properties.station_coordinate_group, "metroProjects");
    }
    for (const line of data.features.filter((f) => f.geometry.type !== "Point")) for (const id of line.properties.stationIds) assert.ok(ids.has(id), `Missing local station ${id} in ${source.file}`);
  }
  const changed = normalized.filter((entry, i) => JSON.stringify(entry.data) !== JSON.stringify(inputs[i].data));
  if (process.argv.includes("--write")) for (const { source, data } of changed) {
    const path = new URL(`public/la-metro-rail/${source.file}`, root);
    const original = await readFile(path, "utf8");
    const indentation = source.file === "fantasy-layer.geojson" ? 4 : original.match(/\n([ \t]+)"/)?.[1];
    let serialized = JSON.stringify(data, null, indentation);
    if (source.file === "fantasy-layer.geojson") serialized = serialized.replace(/\[\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]/g, "[$1, $2]");
    await writeFile(path, serialized + (original.endsWith("\n") ? "\n" : ""));
  }
  console.log(JSON.stringify({ filesChanged: changed.map((e) => e.source.file), stationsBefore: catalog.stations.length, stationsAfter: result.stations.length, routes: result.routes.length, wrote: process.argv.includes("--write") }, null, 2));
} finally {
  await rm(temporary, { recursive: true, force: true });
}
