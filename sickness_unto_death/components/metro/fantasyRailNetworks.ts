// Fantasy classifications describe the authored network, including any imagined
// conversions of existing lines. They do not reclassify real LA Metro services.
export const INTRA_URBES_SERVICE_LABELS = {
  light_rail: "Light Rail / Tram",
  streetcar: "Streetcar",
} as const;

// Two narrow, offset strokes distinguish trams from single-line streetcars.
// Values correspond to zoom levels 8 and 13.
export const TRAM_LINE_STYLE = {
  lineWidth: [1, 1.7],
  lineOffset: [1.2, 2.1],
  casingWidth: [4.4, 7.5],
} as const;

export const FANTASY_RAIL_NETWORKS = {
  // Heavy rail uses fewer, more widely spaced stations than local streetcars,
  // especially on long-distance corridors; keep the key transfer stations.
  heavyRail: {
    id: "permanent-fantasy",
    file: "fantasy-layer.geojson",
    mode: "heavy_rail",
    label: "Inter Urbes — Heavy Rail",
    description: "Fantasy metro / subway network",
    legendDescription: "Successor to the Pacific Electric Rail system, Rapid Transit",
    trainLabel: "Inter Urbes — Heavy rail train",
    lineWidth: [2.4, 5.5],
    casingWidth: [3.6, 7.5],
    stationColor: "#111827",
  },
  // Legend explanations are limited to the requested line-style distinction.
  lightRail: {
    id: "fantasy-streetcar",
    file: "fantasy-streetcar.geojson",
    mode: "light_rail",
    label: "Intra Urbes — Light Rail / Tram & Streetcar",
    description: "Successor to the LARy system",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> · Road geometry: <a href="https://cams-lacounty.hub.arcgis.com/">LA County CAMS</a>',
    trainLabel: "Intra Urbes — Light Rail / Tram & Streetcar",
    lineWidth: [1.5, 3],
    casingWidth: [2.5, 4.6],
    stationColor: "#397568",
  },
} as const;

export type FantasyRailNetwork = keyof typeof FANTASY_RAIL_NETWORKS;
