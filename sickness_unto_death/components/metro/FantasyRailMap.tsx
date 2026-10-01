"use client";

import Map, { NavigationControl } from "react-map-gl/maplibre";
import { setWorkerUrl } from "maplibre-gl";
import MetroLA2026 from "./2026LAMetro";
// import FantasyMetroLayer from "./FantasyMapLayer";

setWorkerUrl("/maplibre-gl-worker.mjs");

export default function FantasyRailMap() {
  return (
    <Map
      initialViewState={{
        longitude: -118.2437,
        latitude: 34.0522,
        zoom: 9.5,
      }}
      mapStyle="https://tiles.versatiles.org/assets/styles/colorful/style.json"
      onError={(event) => console.error("MapLibre error:", event.error)}
      style={{
        width: "100%",
        height: "100%",
        borderRadius: "10px",
        overflow: "hidden",
      }}
      maxBounds={[
        [-119.0, 33.4],
        [-117.4, 34.8],
      ] as any}
    >
      <NavigationControl position="bottom-right" />
      {/* <FantasyMetroLayer /> */}
      <MetroLA2026 />
    </Map>
  );
}