import test from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const directory = await mkdtemp(join(tmpdir(), "rail-explorer-test-"));
const root = new URL("../../", import.meta.url);
for (const [name, file] of [
  ["catalog", "lib/rail-explorer/catalog.ts"],
  ["fantasyRailNetworks", "components/metro/fantasyRailNetworks.ts"],
  ["proposedMetroProjects", "components/metro/proposedMetroProjects.ts"],
  ["sources", "components/metro/probe/sources.ts"],
]) {
  const source = await readFile(new URL(file, root), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
  await writeFile(join(directory, `${name}.mjs`), compiled.replaceAll('"../fantasyRailNetworks"', '"./fantasyRailNetworks.mjs"').replaceAll('"../proposedMetroProjects"', '"./proposedMetroProjects.mjs"'));
}
const { buildRailCatalog, getFocusData, resolveMapSelection, normalizeSearch, sourceStationId } = await import(pathToFileURL(join(directory, "catalog.mjs")));
const { EXPLORER_SOURCES } = await import(pathToFileURL(join(directory, "sources.mjs")));
const inputs = await Promise.all(EXPLORER_SOURCES.map(async (source) => ({ source, data: JSON.parse(await readFile(new URL(`public/la-metro-rail/${source.file}`, root), "utf8")) })));
const before = JSON.stringify(inputs);
const catalog = buildRailCatalog(inputs);

test("all source stations are searchable, while repeated source IDs merge", () => {
  const expected = new Set(inputs.flatMap(({ source, data }) => data.features.filter((f) => f.geometry.type === "Point").map((f) => `${source.id}:${sourceStationId(f.properties, f.geometry.coordinates)}`)));
  assert.deepEqual(new Set(catalog.stations.map((s) => s.id)), expected);
  assert.equal(catalog.stations.length, expected.size);
  assert.equal(catalog.stations.filter((s) => s.group === "heavyRail").length, 320);
  assert.equal(catalog.stations.filter((s) => s.group === "lightRail").length, 1087);
});

test("fantasy memberships and explicit stop order survive the move to geography", () => {
  assert.equal(catalog.routes.filter((r) => r.group === "heavyRail").length, 17);
  assert.equal(catalog.routes.filter((r) => r.group === "lightRail").length, 51);
  assert.equal(catalog.routes.find((r) => r.id === "inter:G").branches.length, 2);
  const missing = catalog.stations.filter((s) => ["heavyRail", "lightRail"].includes(s.group) && !s.routes.length);
  assert.deepEqual(missing, []);
  for (const { source, data } of inputs) for (const feature of data.features) {
    if (!feature.properties.stationIds) continue;
    const route = catalog.routes.find((r) => r.id === `${source.id}:${feature.properties.routeId}`);
    const order = feature.properties.stationIds.map((id) => `${source.id}:${id}`);
    assert.ok(route.branches.some((branch) => JSON.stringify(branch) === JSON.stringify(order)));
  }
});

test("current Metro and project services stay distinct from fantasy lines sharing a letter", () => {
  assert.equal(catalog.routes.filter((r) => r.group === "existingMetro").length, 6);
  assert.ok(catalog.routes.some((r) => r.group === "metroProjects"));
  const bLines = catalog.routes.filter((r) => r.code === "B");
  assert.ok(bLines.length >= 2);
  assert.equal(new Set(bLines.map((r) => r.id)).size, bLines.length);
  for (const route of catalog.routes) for (const stationId of route.stationIds) {
    assert.ok(catalog.stations.find((s) => s.id === stationId)?.routes.includes(route.id));
  }
});

test("isolating a station produces precisely that geographic point, without other lines or stops", () => {
  for (const station of catalog.stations) {
    const focused = getFocusData(catalog, { kind: "station", id: station.id });
    assert.equal(focused.features.length, 1);
    assert.equal(focused.features[0].properties.explorer_station_id, station.id);
    assert.deepEqual(focused.features[0].geometry, { type: "Point", coordinates: station.coordinates });
  }
});

test("isolating a line retains its original geographic geometry and only its own stations", () => {
  for (const route of catalog.routes) {
    const focused = getFocusData(catalog, { kind: "route", id: route.id });
    assert.deepEqual(focused.features.filter((f) => f.geometry.type !== "Point").map((f) => f.geometry), route.features.map((f) => f.geometry));
    assert.deepEqual(new Set(focused.features.filter((f) => f.geometry.type === "Point").map((f) => f.properties.explorer_station_id)), new Set(route.stationIds));
  }
  assert.deepEqual(getFocusData(catalog, null).features, []);
});

test("clicking existing map features resolves to the corresponding explorer selection", () => {
  for (const { source, data } of inputs) for (const feature of data.features) {
    const selection = resolveMapSelection(catalog, source.mapSource, feature.properties, feature.geometry);
    assert.ok(selection, `${source.id}: ${JSON.stringify(feature.properties)}`);
    if (feature.geometry.type === "Point") assert.equal(selection.kind, "station");
    else assert.equal(selection.kind, "route");
  }
  assert.equal(resolveMapSelection(catalog, "unrelated-road-layer", {}, { type: "LineString" }), null);
});

test("connections only reference existing authored stations; source data is never modified", () => {
  for (const station of catalog.stations) for (const target of station.transferIds) assert.ok(catalog.stations.some((s) => s.id === target));
  assert.equal(JSON.stringify(inputs), before);
  assert.equal(normalizeSearch("César Chávez / Alameda"), normalizeSearch("cesar chavez alameda"));
});
