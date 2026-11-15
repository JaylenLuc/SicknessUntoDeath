"use client";

import { useEffect, useMemo, useState } from "react";
import { Layer, Source } from "react-map-gl/maplibre";
import { getFocusData, type RailCatalog, type RailSelection } from "@/lib/rail-explorer/catalog";
import { createTrainAnimator, type TrainFeatureCollection } from "@/lib/LAFantasyRail_util/LAFantasyRail";
import { smoothRailGeometry } from "@/lib/LAFantasyRail_util/smoothRailGeometry";
import TrainMarker from "../TrainMarker";
import StationZoomAnimation from "./StationZoomAnimation";

export default function RailProbeFocus({ catalog, selection, isolated, isolatedRouteId }: { catalog: RailCatalog; selection: NonNullable<RailSelection>; isolated: boolean; isolatedRouteId: string | null }) {
  const routeId = selection.kind === "route" ? selection.id : isolated ? isolatedRouteId : null;
  const route = catalog.routes.find((r) => r.id === routeId);
  const station = selection.kind === "station" ? catalog.stations.find((s) => s.id === selection.id) : undefined;
  const data = useMemo(() => {
    const focused = getFocusData(catalog, route ? { kind: "route", id: route.id } : null);
    return route?.group === "heavyRail" || route?.group === "lightRail" ? smoothRailGeometry(focused) : focused;
  }, [catalog, route]);
  const stationData = useMemo(() => getFocusData(catalog, station ? { kind: "station", id: station.id } : null), [catalog, station]);
  const [trains, setTrains] = useState<TrainFeatureCollection>({ type: "FeatureCollection", features: [] });

  useEffect(() => {
    if (!isolated || !route || route.group === "metroProjects") { setTrains({ type: "FeatureCollection", features: [] }); return; }
    const animate = createTrainAnimator(data);
    const start = performance.now();
    setTrains(animate(0));
    const timer = window.setInterval(() => setTrains(animate(performance.now() - start)), 100);
    return () => window.clearInterval(timer);
  }, [data, isolated, route]);

  return <>
    <Source id="rail-probe-focus" type="geojson" data={data} tolerance={0.1}
      attribution={route?.group === "lightRail" ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> · LA County CAMS' : undefined}>
      <Layer id="rail-probe-casing" type="line" filter={["==", ["geometry-type"], "LineString"]} layout={{ "line-cap": "round", "line-join": "round" }} paint={{ "line-color": "#ffffff", "line-width": route?.service === "light_rail" ? 10 : 8, "line-opacity": 0.9 }} />
      {route?.service === "light_rail" ? [-1, 1].map((side) => <Layer key={side} id={`rail-probe-tram-${side}`} type="line" filter={["==", ["geometry-type"], "LineString"]} layout={{ "line-cap": "round", "line-join": "round" }} paint={{ "line-color": route.color, "line-width": 2.5, "line-offset": side * 2.2 }} />)
        : <Layer id="rail-probe-line" type="line" filter={["==", ["geometry-type"], "LineString"]} layout={{ "line-cap": "round", "line-join": "round" }} paint={{ "line-color": route?.color ?? "#7c3aed", "line-width": 5, "line-dasharray": route?.group === "metroProjects" ? [2, 1.5] : [1, 0] }} />}
      <Layer id="rail-probe-stations" type="circle" filter={["all", ["==", ["geometry-type"], "Point"], ["!=", ["get", "explorer_station_id"], station?.id ?? ""]]} paint={{ "circle-radius": 5, "circle-color": "#ffffff", "circle-stroke-color": route?.color ?? "#7c3aed", "circle-stroke-width": 2.5 }} />
      <Layer id="rail-probe-labels" type="symbol" minzoom={10} filter={["all", ["==", ["geometry-type"], "Point"], ["!=", ["get", "explorer_station_id"], station?.id ?? ""]]} layout={{ "text-field": ["get", "name"], "text-size": 12, "text-offset": [0, 1.5], "text-anchor": "top" }} paint={{ "text-color": "#111111", "text-halo-color": "#ffffff", "text-halo-width": 2 }} />
    </Source>
    <Source id="rail-probe-selected-station" type="geojson" data={stationData}>
      <Layer id="rail-probe-selected-station-dot" type="circle" paint={{ "circle-radius": 7, "circle-color": "#ffffff", "circle-stroke-color": route?.color ?? "#7c3aed", "circle-stroke-width": 2.5 }} />
      <Layer id="rail-probe-selected-station-label" type="symbol" layout={{ "text-field": ["get", "name"], "text-size": 12, "text-offset": [0, 4.5], "text-anchor": "top", "text-allow-overlap": true }} paint={{ "text-color": "#111111", "text-halo-color": "#ffffff", "text-halo-width": 2 }} />
    </Source>
    {station && <StationZoomAnimation coordinates={station.coordinates} />}
    {isolated && route && trains.features.map((train, index) => <TrainMarker key={`${route.id}-${index}`} train={train} label={route.name} variant={route.group === "lightRail" ? "tram" : "train"} />)}
  </>;
}
