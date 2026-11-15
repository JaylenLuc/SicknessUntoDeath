import { FANTASY_RAIL_NETWORKS } from "../fantasyRailNetworks";
import { RAIL_PROJECTS } from "../proposedMetroProjects";
import type { RailSource } from "@/lib/rail-explorer/catalog";

export const EXPLORER_SOURCES: RailSource[] = [
  { id: "inter", group: "heavyRail", file: FANTASY_RAIL_NETWORKS.heavyRail.file, mapSource: `${FANTASY_RAIL_NETWORKS.heavyRail.id}-source`, label: "Inter Urbes" },
  { id: "intra", group: "lightRail", file: FANTASY_RAIL_NETWORKS.lightRail.file, mapSource: `${FANTASY_RAIL_NETWORKS.lightRail.id}-source`, label: "Intra Urbes" },
  { id: "metro", group: "existingMetro", file: "la-metro-rail.geojson", mapSource: "existing-la-metro", label: "LA Metro" },
  ...RAIL_PROJECTS.map((p): RailSource => ({ id: p.id, group: "metroProjects", file: p.file, mapSource: `${p.id}-source`, label: p.sourceLabel, code: p.legendRouteId })),
];
