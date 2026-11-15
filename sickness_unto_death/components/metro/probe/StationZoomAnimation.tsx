"use client";

import { Marker } from "react-map-gl/maplibre";
import StationAnimation from "./StationAnimation";

export default function StationZoomAnimation({ coordinates }: { coordinates: [number, number] }) {
  return (
    <Marker longitude={coordinates[0]} latitude={coordinates[1]} anchor="center"
      pitchAlignment="viewport" rotationAlignment="viewport"
      style={{ pointerEvents: "none", zIndex: 2 }}>
      <StationAnimation />
    </Marker>
  );
}
