// Fantasy classifications describe the authored network, including any imagined
// conversions of existing lines. They do not reclassify real LA Metro services.
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
    lineWidth: [3, 7],
    casingWidth: [5, 11],
    stationColor: "#111827",
  },
  // Keep the light-rail legend to its heading and route entries; no description.
  lightRail: {
    id: "fantasy-streetcar",
    file: "fantasy-streetcar.geojson",
    mode: "light_rail",
    label: "Intra Urbes — Light Rail / Streetcar",
    description: "Successor to the LARy system",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> · Road geometry: <a href="https://cams-lacounty.hub.arcgis.com/">LA County CAMS</a>',
    trainLabel: "Intra Urbes — Streetcar",
    lineWidth: [2, 4],
    casingWidth: [3.5, 6],
    stationColor: "#397568",
  },
} as const;

export type FantasyRailNetwork = keyof typeof FANTASY_RAIL_NETWORKS;
