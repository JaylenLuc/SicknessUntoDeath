import type { Feature, FeatureCollection, LineString, MultiLineString, Point, Position } from "geojson";

export type RailGroup = "heavyRail" | "lightRail" | "existingMetro" | "metroProjects";
export type RailData = FeatureCollection<LineString | MultiLineString | Point, Record<string, unknown>>;
export type RailSource = { id: string; mapSource: string; group: RailGroup; file: string; label: string; code?: string };
export type ExplorerRoute = {
  id: string; code: string; name: string; color: string; group: RailGroup; sourceId: string;
  service: string; stationIds: string[]; branches: string[][];
  features: Feature<LineString | MultiLineString, Record<string, unknown>>[];
};
export type ExplorerStation = {
  id: string; name: string; coordinates: [number, number]; group: RailGroup; sourceId: string;
  routes: string[]; transferNote: string; transferIds: string[];
};
export type RailCatalog = { routes: ExplorerRoute[]; stations: ExplorerStation[]; sources: RailSource[] };
export type RailSelection = { kind: "route" | "station"; id: string } | null;

export const GROUP_LABELS: Record<RailGroup, string> = {
  heavyRail: "Inter Urbes", lightRail: "Intra Urbes", existingMetro: "LA Metro", metroProjects: "Metro projects",
};
const text = (value: unknown) => typeof value === "string" || typeof value === "number" ? String(value) : "";
const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
export const normalizeSearch = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function sourceStationId(properties: Record<string, unknown>, coordinates: Position) {
  return text(properties.id ?? properties.stop_id) || `${text(properties.name ?? properties.stop_name)}@${coordinates[0]},${coordinates[1]}`;
}
function sourceRouteCode(source: RailSource, properties: Record<string, unknown>) {
  return text(properties.routeId ?? properties.route_id) || source.code || source.id;
}

// Route-relative distance preserves stop order on curved alignments and loops.
export function locateOnLine(point: Position, line: Position[]) {
  const p = [point[0] * 92288, point[1] * 111320];
  let best = { distance: Infinity, along: 0 };
  let travelled = 0;
  for (let i = 1; i < line.length; i++) {
    const a = [line[i - 1][0] * 92288, line[i - 1][1] * 111320];
    const b = [line[i][0] * 92288, line[i][1] * 111320];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const length = Math.hypot(dx, dy);
    if (!length) continue;
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / length ** 2));
    const distance = Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
    if (distance < best.distance) best = { distance, along: travelled + t * length };
    travelled += length;
  }
  return best;
}

export function buildRailCatalog(inputs: { source: RailSource; data: RailData }[]): RailCatalog {
  const stationMap = new Map<string, ExplorerStation>();
  const rawStations = new Map<string, { props: Record<string, unknown>; rawId: string }>();
  const routeMap = new Map<string, ExplorerRoute>();
  const transferLookup = new Map<string, string>();

  for (const { source, data } of inputs) for (const feature of data.features) {
    if (feature.geometry.type !== "Point") continue;
    const props = feature.properties;
    const rawId = sourceStationId(props, feature.geometry.coordinates);
    const id = `${source.id}:${rawId}`;
    const previous = stationMap.get(id);
    const references = [props.inter_urbes_transfers, props.local_walking_transfers].flatMap((value) => Array.isArray(value) ? value : []);
    const transferIds = [...strings(props.transfer_station_ids), ...strings(props.inter_urbes_transfer_station_ids), text(props.transfer_station_id), ...references.map((r) => text(r?.station_id))].filter(Boolean);
    stationMap.set(id, {
      id, sourceId: source.id, group: source.group, name: text(props.name ?? props.stop_name) || "Unnamed station",
      coordinates: feature.geometry.coordinates.slice(0, 2) as [number, number], routes: [],
      transferNote: [previous?.transferNote, text(props.transfer)].filter(Boolean).join("; "),
      transferIds: [...new Set([...(previous?.transferIds ?? []), ...transferIds])],
    });
    const previousProps = rawStations.get(id)?.props;
    rawStations.set(id, { rawId, props: previousProps ? { ...previousProps, ...props, routes: `${text(previousProps.routes)}, ${text(props.routes)}` } : props });
    if (source.group === "heavyRail" || source.group === "lightRail") transferLookup.set(rawId, id);
  }

  for (const { source, data } of inputs) for (const feature of data.features) {
    if (feature.geometry.type === "Point") continue;
    const props = feature.properties;
    const rawCode = sourceRouteCode(source, props);
    const id = `${source.id}:${rawCode}`;
    const name = text(props.name ?? props.route_long_name) || source.label;
    const route: ExplorerRoute = routeMap.get(id) ?? {
      id, sourceId: source.id, group: source.group,
      code: source.group === "existingMetro" ? name.match(/Metro (\w+) Line/)?.[1] ?? rawCode : source.code || rawCode,
      name: source.group === "metroProjects" ? source.label : name,
      color: /^#[\da-f]{6}$/i.test(text(props.color ?? props.route_color)) ? text(props.color ?? props.route_color) : "#475569",
      service: text(props.service_type) || (source.group === "heavyRail" ? "heavy_rail" : "rail"),
      stationIds: [], branches: [], features: [],
    };
    if (source.group !== "metroProjects" && name.length < route.name.length) route.name = name;
    route.features.push(feature as ExplorerRoute["features"][number]);
    const parts = feature.geometry.type === "LineString" ? [feature.geometry.coordinates] : feature.geometry.coordinates;
    // GTFS includes repeated travel directions. Choose the most complete part for
    // the directory while retaining every part for the actual geographic line.
    const line = parts.reduce((longest, part) => part.length > longest.length ? part : longest, [] as Position[]);
    const explicit = strings(props.stationIds);
    let stops: string[];
    if (explicit.length) {
      stops = explicit.map((rawId) => `${source.id}:${rawId}`).filter((stationId) => stationMap.has(stationId));
    } else {
      stops = [...stationMap.values()].filter((s) => s.sourceId === source.id).flatMap((station) => {
        const raw = rawStations.get(station.id)!.props;
        const memberships = Array.isArray(raw.routes)
          ? raw.routes.map((r) => text(typeof r === "object" && r ? r.route_id : r))
          : text(raw.routes).split(/[,;]/).map((v) => v.trim()).filter(Boolean);
        const position = locateOnLine(station.coordinates, line);
        const included = source.group === "metroProjects" ? position.distance < 800
          : source.group === "existingMetro" ? memberships.includes(rawCode)
          : memberships.length ? memberships.includes(rawCode) && position.distance < 500 : position.distance < 12;
        return included ? [{ id: station.id, along: position.along }] : [];
      }).sort((a, b) => a.along - b.along).map((s) => s.id);
    }
    stops = [...new Set(stops)];
    if (stops.length && !route.branches.some((branch) => JSON.stringify(branch) === JSON.stringify(stops) || JSON.stringify(branch) === JSON.stringify([...stops].reverse()))) route.branches.push(stops);
    for (const stationId of stops) {
      const station = stationMap.get(stationId)!;
      if (!station.routes.includes(id)) station.routes.push(id);
      if (!route.stationIds.includes(stationId)) route.stationIds.push(stationId);
    }
    routeMap.set(id, route);
  }
  for (const station of stationMap.values()) {
    station.transferIds = station.transferIds.flatMap((id) => transferLookup.has(id) ? [transferLookup.get(id)!] : []);
  }
  const routes = [...routeMap.values()].sort((a, b) => a.group.localeCompare(b.group) || a.code.localeCompare(b.code, "en", { numeric: true }));
  return { routes, stations: [...stationMap.values()], sources: inputs.map((i) => i.source) };
}

export function getFocusData(catalog: RailCatalog, selection: RailSelection): RailData {
  if (!selection) return { type: "FeatureCollection", features: [] };
  const route = selection.kind === "route" ? catalog.routes.find((r) => r.id === selection.id) : undefined;
  const stations = route ? catalog.stations.filter((s) => route.stationIds.includes(s.id)) : catalog.stations.filter((s) => s.id === selection.id);
  return {
    type: "FeatureCollection",
    features: [
      ...(route?.features.map((feature) => ({ ...feature, properties: { ...feature.properties, explorer_route_id: route.id, color: route.color, name: route.name, routeId: route.code, service_type: route.service, proposed: route.group === "metroProjects" } })) ?? []),
      ...stations.map((station): Feature<Point, Record<string, unknown>> => ({
        type: "Feature", geometry: { type: "Point", coordinates: station.coordinates },
        properties: { explorer_station_id: station.id, name: station.name, color: route?.color ?? "#7c3aed" },
      })),
    ],
  };
}

export function resolveMapSelection(catalog: RailCatalog, sourceId: string, properties: Record<string, unknown>, geometry: { type: string; coordinates?: unknown }): RailSelection {
  if (typeof properties.explorer_station_id === "string") return { kind: "station", id: properties.explorer_station_id };
  if (typeof properties.explorer_route_id === "string") return { kind: "route", id: properties.explorer_route_id };
  const source = catalog.sources.find((s) => s.mapSource === sourceId);
  if (!source) return null;
  if (geometry.type === "Point" && Array.isArray(geometry.coordinates)) {
    const id = `${source.id}:${sourceStationId(properties, geometry.coordinates as Position)}`;
    return catalog.stations.some((s) => s.id === id) ? { kind: "station", id } : null;
  }
  const id = `${source.id}:${sourceRouteCode(source, properties)}`;
  return catalog.routes.some((r) => r.id === id) ? { kind: "route", id } : null;
}

export function routeTextColor(color: string) {
  const rgb = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16) / 255).map((c) => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722 > 0.179 ? "#000000" : "#ffffff";
}
