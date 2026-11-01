import type { Position } from "geojson";
import type { RailFeatureCollection } from "./LAFantasyRail";

// Display-only curves. The authored GeoJSON remains the source of truth.
// Short transition windows keep the line close to its original corridor.
const MAX_TRANSITION_METRES = 200;
const SEGMENT_FRACTION = 0.22;
const SAMPLES_PER_HALF = 12;
const METRES_PER_DEGREE = 111320;
const X_SCALE = METRES_PER_DEGREE * Math.cos(34 * Math.PI / 180);

function distance(a: Position, b: Position) {
  return Math.hypot((b[0] - a[0]) * X_SCALE, (b[1] - a[1]) * METRES_PER_DEGREE);
}

function mix(a: Position, b: Position, t: number): Position {
  return a.map((value, index) => value + ((b[index] ?? value) - value) * t);
}

function offset(point: Position, x: number, y: number): Position {
  return [point[0] + x / X_SCALE, point[1] + y / METRES_PER_DEGREE, ...point.slice(2)];
}

function appendCubic(result: Position[], a: Position, b: Position, c: Position, d: Position) {
  for (let step = 1; step <= SAMPLES_PER_HALF; step += 1) {
    const t = step / SAMPLES_PER_HALF;
    const u = 1 - t;
    result.push(step === SAMPLES_PER_HALF ? d.slice() : a.map((value, index) =>
      u ** 3 * value + 3 * u ** 2 * t * b[index] + 3 * u * t ** 2 * c[index] + t ** 3 * d[index],
    ));
  }
}

// Pin stations lying on a segment before making curves. Off-route station
// records remain where authored; this visual treatment does not repair routing.
function insertStationAnchors(coordinates: Position[], stations: Position[]) {
  if (coordinates.length < 2) return coordinates.map((point) => point.slice());
  const result: Position[] = [coordinates[0].slice()];
  for (let i = 1; i < coordinates.length; i += 1) {
    const a = coordinates[i - 1];
    const b = coordinates[i];
    const dx = (b[0] - a[0]) * X_SCALE;
    const dy = (b[1] - a[1]) * METRES_PER_DEGREE;
    const squaredLength = dx * dx + dy * dy;
    if (squaredLength === 0) continue;
    const anchors = stations.flatMap((station) => {
      const px = (station[0] - a[0]) * X_SCALE;
      const py = (station[1] - a[1]) * METRES_PER_DEGREE;
      const t = (px * dx + py * dy) / squaredLength;
      if (t <= 1e-8 || t >= 1 - 1e-8) return [];
      if (Math.hypot(px - t * dx, py - t * dy) > 0.05) return [];
      return [{ t, point: [station[0], station[1], ...mix(a, b, t).slice(2)] }];
    }).sort((left, right) => left.t - right.t);
    for (const { point } of anchors) {
      if (distance(result[result.length - 1], point) > 0.001) result.push(point);
    }
    if (distance(result[result.length - 1], b) > 0.001) result.push(b.slice());
    else result[result.length - 1] = b.slice();
  }
  return result;
}

export function smoothRailLine(coordinates: Position[], stations: Position[] = []): Position[] {
  const anchors = insertStationAnchors(coordinates, stations);
  if (anchors.length < 2) return coordinates.map((point) => point.slice());
  if (anchors.length < 3) return anchors;
  const result: Position[] = [anchors[0].slice()];
  for (let i = 1; i < anchors.length - 1; i += 1) {
    const previous = anchors[i - 1];
    const corner = anchors[i];
    const next = anchors[i + 1];
    const incomingLength = distance(previous, corner);
    const outgoingLength = distance(corner, next);
    const incoming = [(corner[0] - previous[0]) * X_SCALE / incomingLength,
      (corner[1] - previous[1]) * METRES_PER_DEGREE / incomingLength];
    const outgoing = [(next[0] - corner[0]) * X_SCALE / outgoingLength,
      (next[1] - corner[1]) * METRES_PER_DEGREE / outgoingLength];
    const dot = incoming[0] * outgoing[0] + incoming[1] * outgoing[1];
    const trim = Math.min(MAX_TRANSITION_METRES, incomingLength * SEGMENT_FRACTION, outgoingLength * SEGMENT_FRACTION);
    // Keep nearly straight paths, tiny segments and intentional reversals intact.
    if (trim < 1 || dot > 0.995 || dot < -0.94) {
      result.push(corner.slice());
      continue;
    }
    const tangentLength = Math.hypot(incoming[0] + outgoing[0], incoming[1] + outgoing[1]);
    const tangent = [(incoming[0] + outgoing[0]) / tangentLength,
      (incoming[1] + outgoing[1]) / tangentLength];
    const entry = mix(corner, previous, trim / incomingLength);
    const exit = mix(corner, next, trim / outgoingLength);
    result.push(entry);
    // Two cubic halves share a tangent and pass through the original corner.
    // This keeps stations and junctions on the displayed route rather than cutting them off.
    appendCubic(result, entry, mix(entry, corner, 0.45),
      offset(corner, -tangent[0] * trim * 0.25, -tangent[1] * trim * 0.25), corner);
    appendCubic(result, corner, offset(corner, tangent[0] * trim * 0.25, tangent[1] * trim * 0.25),
      mix(exit, corner, 0.45), exit);
  }
  result.push(anchors[anchors.length - 1].slice());
  return result;
}

export function smoothRailGeometry(data: RailFeatureCollection): RailFeatureCollection {
  const stations = data.features.flatMap((feature) => feature.geometry.type === "Point" ? [feature.geometry.coordinates] : []);
  return {
    ...data,
    features: data.features.map((feature) => {
      const geometry = feature.geometry;
      if (geometry.type === "Point") return feature;
      return {
        ...feature,
        geometry: geometry.type === "LineString"
          ? { ...geometry, coordinates: smoothRailLine(geometry.coordinates, stations) }
          : { ...geometry, coordinates: geometry.coordinates.map((line) => smoothRailLine(line, stations)) },
      };
    }),
  };
}
