import assert from "node:assert/strict";
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

// Normalize identities first. Preview by default; --write persists the result.
// --connect-shared also permits local adjustments to existing/proposed routes.
const root = new URL("../../", import.meta.url);
const tolerance = 0.001; // metres; keep repeat runs stable at floating-point precision
const xScale = 111320 * Math.cos(34 * Math.PI / 180);
const distance = (a, b) => Math.hypot((a[0] - b[0]) * xScale, (a[1] - b[1]) * 111320);
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const parts = (feature) => feature.geometry.type === "LineString" ? [feature.geometry.coordinates] : feature.geometry.coordinates;
const authoritative = (source) => source.group === "existingMetro" || source.group === "metroProjects";

function project(point, a, b) {
  const dx = (b[0] - a[0]) * xScale, dy = (b[1] - a[1]) * 111320;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared ? Math.max(0, Math.min(1,
    ((point[0] - a[0]) * xScale * dx + (point[1] - a[1]) * 111320 * dy) / lengthSquared)) : 0;
  const coordinates = mix(a, b, t);
  return { t, coordinates, gap: distance(point, coordinates) };
}

function nearest(point, paths) {
  let best = { gap: Infinity };
  paths.forEach((path, part) => {
    let along = 0;
    for (let i = 1; i < path.length; i++) {
      const length = distance(path[i - 1], path[i]);
      const candidate = project(point, path[i - 1], path[i]);
      if (candidate.gap < best.gap) best = { ...candidate, part, along: along + candidate.t * length };
      along += length;
    }
  });
  assert.ok(Number.isFinite(best.gap), "Route has no usable segments");
  return best;
}

// Taper a local adjustment toward the station, pinning other stops in place.
// Beyond an endpoint, extend the path instead of adding a return spur.
function connect(path, targets) {
  const lengths = [0];
  path.slice(1).forEach((point, i) => lengths.push(lengths[i] + distance(path[i], point)));
  const total = lengths.at(-1);
  const anchors = targets.map((target) => ({ ...nearest(target, [path]), target })).sort((a, b) => a.along - b.along);
  const changed = anchors.filter((a) => a.gap > tolerance);
  if (!changed.length) return path;
  for (let i = 1; i < anchors.length; i++) {
    assert.ok(anchors[i].along - anchors[i - 1].along > tolerance || distance(anchors[i].target, anchors[i - 1].target) <= tolerance,
      "Distinct stations project onto the same route position; review this route manually");
  }
  const at = (s) => {
    const i = lengths.findIndex((length) => length >= s);
    if (i <= 0) return path[0];
    return mix(path[i - 1], path[i], (s - lengths[i - 1]) / (lengths[i] - lengths[i - 1]));
  };
  const windows = changed.map((anchor) => {
    const i = anchors.indexOf(anchor);
    const radius = Math.max(20, anchor.gap * 2);
    return { ...anchor,
      start: Math.max(0, anchor.along - radius, i ? (anchors[i - 1].along + anchor.along) / 2 : 0),
      end: Math.min(total, anchor.along + radius, i + 1 < anchors.length ? (anchors[i + 1].along + anchor.along) / 2 : total),
    };
  });
  const positions = [...new Set([...lengths, ...anchors.map((a) => a.along), ...windows.flatMap((w) => [w.start, w.end])])].sort((a, b) => a - b);
  const result = [];
  const append = (p) => {
    if (!result.length || distance(result.at(-1), p) > 1e-6) result.push(p.slice());
  };
  for (const s of positions) {
    const original = at(s);
    const anchor = anchors.find((a) => Math.abs(a.along - s) < 1e-7);
    if (anchor) {
      if (s === total && anchor.gap > tolerance) append(original);
      append(anchor.target);
      if (s === 0 && anchor.gap > tolerance) append(original);
      continue;
    }
    const window = windows.find((w) => w.along > 0 && w.along < total && s > w.start && s < w.end);
    if (!window) { append(original); continue; }
    const weight = s < window.along ? (s - window.start) / (window.along - window.start) : (window.end - s) / (window.end - window.along);
    append(original.map((v, i) => v + (window.target[i] - window.coordinates[i]) * weight));
  }
  return result;
}

const temporary = await mkdtemp(join(tmpdir(), "rail-alignment-"));
try {
  for (const [name, file] of [
    ["fantasyRailNetworks", "components/metro/fantasyRailNetworks.ts"],
    ["proposedMetroProjects", "components/metro/proposedMetroProjects.ts"],
    ["sources", "components/metro/probe/sources.ts"],
  ]) {
    const source = await readFile(new URL(file, root), "utf8");
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
    await writeFile(join(temporary, `${name}.mjs`), compiled.replaceAll('"../fantasyRailNetworks"', '"./fantasyRailNetworks.mjs"').replaceAll('"../proposedMetroProjects"', '"./proposedMetroProjects.mjs"'));
  }
  const { EXPLORER_SOURCES } = await import(pathToFileURL(join(temporary, "sources.mjs")));
  const inputs = await Promise.all(EXPLORER_SOURCES.map(async (source) => {
    const text = await readFile(new URL(`public/la-metro-rail/${source.file}`, root), "utf8");
    return { source, text, data: JSON.parse(text) };
  }));
  const originals = inputs.map((entry) => structuredClone(entry.data));
  const stations = new Map(), lines = [];
  for (const { source, data } of inputs) for (const feature of data.features) {
    if (feature.geometry.type !== "Point") {
      assert.ok(Array.isArray(feature.properties.stationIds), `Normalize ${source.file} first`);
      lines.push({ source, feature });
      continue;
    }
    const id = feature.properties.canonical_station_id;
    assert.ok(id, `Normalize ${source.file} first`);
    if (!stations.has(id)) stations.set(id, { point: feature, copies: [], serving: [] });
    const station = stations.get(id);
    assert.deepEqual(feature.geometry.coordinates, station.point.geometry.coordinates, `Inconsistent copies of ${id}`);
    station.copies.push(feature);
  }
  for (const line of lines) for (const id of line.feature.properties.stationIds) {
    assert.ok(stations.has(id), `Unknown station ${id}`);
    stations.get(id).serving.push(line);
  }

  let stationsMoved = 0;
  for (const { point, copies, serving } of stations.values()) {
    const official = serving.filter((line) => authoritative(line.source));
    if (!official.length) continue;
    const owner = point.properties.station_coordinate_source;
    const owned = official.filter((line) => line.source.id === owner);
    assert.ok(owned.length, `No authoritative serving line for ${point.properties.name}`);
    const nearestOwner = owned.map((line) => nearest(point.geometry.coordinates, parts(line.feature))).sort((a, b) => a.gap - b.gap)[0];
    if (nearestOwner.gap <= tolerance) continue;
    stationsMoved++;
    for (const copy of copies) copy.geometry.coordinates = nearestOwner.coordinates.slice();
  }

  const connectShared = process.argv.includes("--connect-shared");
  const adjustedLines = [];
  for (const { source, feature } of lines) {
    if (authoritative(source) && !connectShared) continue;
    const paths = parts(feature);
    const targets = paths.map(() => []);
    for (const id of feature.properties.stationIds) {
      const point = stations.get(id).point.geometry.coordinates;
      const closest = nearest(point, paths);
      // Pin all already-touching parts, and connect the nearest part if needed.
      paths.forEach((path, i) => {
        if (i === closest.part || nearest(point, [path]).gap <= tolerance) targets[i].push(point);
      });
    }
    const connected = paths.map((path, i) => connect(path, targets[i]));
    if (JSON.stringify(connected) === JSON.stringify(paths)) continue;
    adjustedLines.push({ file: source.file, line: feature.properties.route_id ?? feature.properties.id });
    feature.geometry.coordinates = feature.geometry.type === "LineString" ? connected[0] : connected;
  }

  const unresolved = [];
  let checkedPairs = 0;
  for (const { source, feature } of lines) for (const id of feature.properties.stationIds) {
    const station = stations.get(id);
    const gap = nearest(station.point.geometry.coordinates, parts(feature)).gap;
    checkedPairs++;
    if (gap > tolerance) unresolved.push({ file: source.file, station: station.point.properties.name, gapMetres: Math.round(gap * 1000) / 1000 });
  }
  if (connectShared) assert.equal(unresolved.length, 0, JSON.stringify(unresolved));
  for (const { point, copies } of stations.values()) for (const copy of copies) assert.deepEqual(copy.geometry.coordinates, point.geometry.coordinates);
  inputs.forEach(({ source, data }, i) => {
    assert.equal(data.features.length, originals[i].features.length);
    data.features.forEach((feature, j) => {
      assert.deepEqual(feature.properties, originals[i].features[j].properties, `Changed metadata in ${source.file}`);
      if (!connectShared && authoritative(source) && feature.geometry.type !== "Point") assert.deepEqual(feature.geometry, originals[i].features[j].geometry);
    });
  });

  const changed = inputs.filter((entry, i) => JSON.stringify(entry.data) !== JSON.stringify(originals[i]));
  if (process.argv.includes("--write")) for (const { source, text, data } of changed) {
    const indentation = source.file === "fantasy-layer.geojson" ? 4 : text.match(/\n([ \t]+)"/)?.[1];
    let serialized = JSON.stringify(data, null, indentation);
    if (source.file === "fantasy-layer.geojson") serialized = serialized.replace(/\[\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]/g, "[$1, $2]");
    await writeFile(new URL(`public/la-metro-rail/${source.file}`, root), serialized + (text.endsWith("\n") ? "\n" : ""));
  }
  console.log(JSON.stringify({ stations: stations.size, stationsMoved, checkedPairs, adjustedLines, filesChanged: changed.map((e) => e.source.file), unresolved, wrote: process.argv.includes("--write") }, null, 2));
} finally {
  await rm(temporary, { recursive: true, force: true });
}
