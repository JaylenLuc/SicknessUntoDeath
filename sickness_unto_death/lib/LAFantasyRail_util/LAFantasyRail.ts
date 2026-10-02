import type {
  FeatureCollection,
  LineString,
  MultiLineString,
  Point,
  Position,
} from "geojson";

  export type Coordinates = [
    longitude: number,
    latitude: number,
  ];

  export type FantasyStation = {
    id: string;
    name: string;
    street1: string;
    street2: string;
    coordinates: Coordinates;
  };

  export type FantasyLine = {
    id: string;
    name: string;
    color: string;
    stationIds: string[];
    coordinates: Coordinates[];
  };

export type RailFeatureCollection = FeatureCollection<
  LineString | MultiLineString | Point,
  { color?: string; route_color?: string }
>;

export type TrainFeatureCollection = FeatureCollection<
  Point,
  { route_color: string; bearing: number }
>;

type RoutePath = {
  coordinates: Position[];
  distances: number[];
  length: number;
  color: string;
};

function distanceBetween(start: Position, end: Position) {
  const radians = Math.PI / 180;
  const latitudeDelta = (end[1] - start[1]) * radians;
  const longitudeDelta = (end[0] - start[0]) * radians;
  const latitude = start[1] * radians;
  const nextLatitude = end[1] * radians;
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitude) *
      Math.cos(nextLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return (
    6371000 *
    2 *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

function makeRoutePath(
  coordinates: Position[],
  color: string,
): RoutePath | null {
  const distances = [0];

  for (let index = 1; index < coordinates.length; index += 1) {
    distances.push(
      distances[index - 1] +
        distanceBetween(coordinates[index - 1], coordinates[index]),
    );
  }

  const length = distances[distances.length - 1];
  return length > 0 ? { coordinates, distances, length, color } : null;
}

function positionAt(path: RoutePath, progress: number): Position {
  const targetDistance = path.length * progress;
  let index = 1;

  while (
    index < path.distances.length - 1 &&
    path.distances[index] < targetDistance
  ) {
    index += 1;
  }

  const segmentStart = path.distances[index - 1];
  const segmentLength = path.distances[index] - segmentStart;
  const segmentProgress =
    segmentLength === 0 ? 0 : (targetDistance - segmentStart) / segmentLength;
  const start = path.coordinates[index - 1];
  const end = path.coordinates[index];

  return [
    start[0] + (end[0] - start[0]) * segmentProgress,
    start[1] + (end[1] - start[1]) * segmentProgress,
  ];
}

function bearingBetween(start: Position, end: Position) {
  const radians = Math.PI / 180;
  const startLatitude = start[1] * radians;
  const endLatitude = end[1] * radians;
  const longitudeDelta = (end[0] - start[0]) * radians;
  const y = Math.sin(longitudeDelta) * Math.cos(endLatitude);
  const x =
    Math.cos(startLatitude) * Math.sin(endLatitude) -
    Math.sin(startLatitude) *
      Math.cos(endLatitude) *
      Math.cos(longitudeDelta);

  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function normalizeRouteColor(color?: string) {
  if (!color) return "#6b7280";
  return color.startsWith("#") ? color : `#${color}`;
}

export function createTrainAnimator(railData: RailFeatureCollection) {
  const routes = railData.features.flatMap((feature) => {
    if (feature.geometry.type === "Point") return [];

    const lines =
      feature.geometry.type === "LineString"
        ? [feature.geometry.coordinates]
        : feature.geometry.coordinates;
    const longestLine = lines.reduce<Position[]>(
      (longest, line) => (line.length > longest.length ? line : longest),
      [],
    );
    const color = normalizeRouteColor(
      feature.properties?.color ?? feature.properties?.route_color,
    );
    const route = makeRoutePath(longestLine, color);

    return route ? [route] : [];
  });

  return (elapsedMilliseconds: number): TrainFeatureCollection => {
    const elapsed = elapsedMilliseconds / 120000;

    return {
      type: "FeatureCollection",
      features: routes.map((route, index) => {
        const cycle = (elapsed + index / routes.length) % 2;
        const progress = cycle <= 1 ? cycle : 2 - cycle;
        const coordinates = positionAt(route, progress);
        const tangentProgress =
          progress < 0.999 ? progress + 0.001 : progress - 0.001;
        const tangentCoordinates = positionAt(route, tangentProgress);

        return {
          type: "Feature",
          properties: {
            route_color: route.color,
            bearing: bearingBetween(coordinates, tangentCoordinates),
          },
          geometry: { type: "Point", coordinates },
        };
      }),
    };
  };
}
