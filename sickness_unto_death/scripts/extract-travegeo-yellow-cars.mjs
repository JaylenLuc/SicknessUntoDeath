import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const TRAVEL_ID = 23152;
const ROUTES_URL = `https://travegeo.com/travel?action=getRoutes&travelId=${TRAVEL_ID}`;
const MAP_URL =
  "https://travegeo.com/Los_Angeles_Railway_Yellow_Cars_streetcars-23152?sharemap";
const OUTPUT_PATH = resolve(
  "public/la-metro-rail/los-angeles-railway-yellow-cars-travegeo.geojson",
);

function decodePolyline(encoded) {
  const coordinates = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encoded.length) {
    let byte;
    let shift = 0;
    let result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    latitude += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    longitude += result & 1 ? ~(result >> 1) : result >> 1;
    coordinates.push([longitude / 1e5, latitude / 1e5]);
  }

  return coordinates;
}

function parseProperties(properties) {
  if (!properties) return {};

  try {
    return JSON.parse(properties);
  } catch {
    return {};
  }
}

function repairKnownMigrationError(routeId, coordinates) {
  if (routeId === 101101) {
    // Travegeo's migration inserted two impossible coordinate pairs into this
    // otherwise continuous Central Avenue route. The remaining points join in
    // geographic order and match the route visible in the rendered ShareMap.
    return [
      coordinates[0],
      coordinates[1],
      coordinates[2],
      coordinates[8],
      coordinates[7],
    ];
  }

  if (routeId === 101112) {
    // The imported route forms an erroneous triangle from Vermont/Beverly to
    // MacArthur Park and back to Heliotrope/Beverly. Connect Vermont directly
    // to Heliotrope along Beverly Boulevard, then retain the northern branch.
    return [coordinates[0], coordinates[3], ...coordinates.slice(4)];
  }

  return coordinates;
}

function assertPlausibleGeometry(routeId, coordinates) {
  if (coordinates.length < 2) {
    throw new Error(`Route ${routeId} contains fewer than two coordinates`);
  }

  for (const [longitude, latitude] of coordinates) {
    if (
      longitude < -118.5 ||
      longitude > -118.1 ||
      latitude < 33.85 ||
      latitude > 34.2
    ) {
      throw new Error(
        `Route ${routeId} contains an implausible coordinate: ${longitude}, ${latitude}`,
      );
    }
  }
}

const response = await fetch(ROUTES_URL);
if (!response.ok) {
  throw new Error(`Travegeo route request failed: ${response.status}`);
}

const routes = await response.json();
const features = [];

for (const route of routes) {
  const routedShape = route.routedShape ?? {};
  const sourceProperties = parseProperties(routedShape.properties);
  const encodedRoutes = routedShape.routes ?? [];

  for (const [segmentIndex, encodedRoute] of encodedRoutes.entries()) {
    if (!encodedRoute.geometry) continue;

    const decoded = decodePolyline(encodedRoute.geometry);
    const coordinates = repairKnownMigrationError(route.id, decoded);
    assertPlausibleGeometry(route.id, coordinates);

    features.push({
      type: "Feature",
      id: `travegeo-${route.id}-${segmentIndex}`,
      geometry: {
        type: "LineString",
        coordinates,
      },
      properties: {
        OID: features.length + 1,
        Name: "Los Angeles Railway Yellow Cars",
        operator: "Los Angeles Railway",
        network: "Yellow Cars",
        historical_period: "circa 1935 approximation",
        travegeo_route_id: route.id,
        travegeo_uuid: routedShape.uuid ?? null,
        sharemap_id: sourceProperties["sharemapId "] ?? null,
        source_repair:
          route.id === 101101
            ? "Removed two impossible coordinate pairs introduced during the ShareMap-to-Travegeo migration"
            : route.id === 101112
              ? "Removed the erroneous MacArthur Park triangle and connected Vermont to Heliotrope along Beverly Boulevard"
              : null,
      },
    });
  }
}

const allCoordinates = features.flatMap(
  (feature) => feature.geometry.coordinates,
);
const longitudes = allCoordinates.map(([longitude]) => longitude);
const latitudes = allCoordinates.map(([, latitude]) => latitude);

const geojson = {
  type: "FeatureCollection",
  name: "Los Angeles Railway Yellow Cars — Travegeo/ShareMap extraction",
  metadata: {
    historical_snapshot_year: null,
    historical_snapshot_note:
      "The geometry source does not identify one authoritative network year. It is displayed as a circa-1935 approximation using the official 1935 Huntington map only as a historical reference.",
    geometry_source_title: "Los Angeles Railway Yellow Cars streetcars",
    geometry_source_url: MAP_URL,
    geometry_api_url: ROUTES_URL,
    geometry_source_author: "jkan997 / ShareMap.org",
    geometry_source_license: "CC BY-SA 3.0",
    source_imported_to_travegeo: "2021-01-22",
    extracted_on: "2026-10-26",
    extraction_notes:
      "Decoded Travegeo freeform route polylines. Route 101101 required repair after migration inserted geographically impossible coordinate pairs. Route 101112 was corrected to remove an erroneous MacArthur Park triangle and follow Beverly Boulevard between Vermont and Heliotrope.",
    historical_reference_title:
      "Official route map of the Los Angeles Railway: the yellow cars and buses",
    historical_reference_year: 1935,
    historical_reference_url:
      "https://hdl.huntington.org/digital/collection/p15150coll4/id/16360/",
    feature_count: features.length,
    coordinate_count: allCoordinates.length,
    bbox: [
      Math.min(...longitudes),
      Math.min(...latitudes),
      Math.max(...longitudes),
      Math.max(...latitudes),
    ],
  },
  features,
};

await writeFile(OUTPUT_PATH, `${JSON.stringify(geojson, null, 2)}\n`);
console.log(
  `Wrote ${features.length} features and ${allCoordinates.length} coordinates to ${OUTPUT_PATH}`,
);
