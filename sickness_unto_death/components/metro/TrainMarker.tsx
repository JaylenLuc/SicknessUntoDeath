"use client";

import { Marker } from "react-map-gl/maplibre";
import type { TrainFeatureCollection } from "@/lib/LAFantasyRail_util/LAFantasyRail";

type TrainFeature = TrainFeatureCollection["features"][number];

type TrainMarkerProps = {
  train: TrainFeature;
  label: string;
};

export default function TrainMarker({ train, label }: TrainMarkerProps) {
  return (
    <Marker
      longitude={train.geometry.coordinates[0]}
      latitude={train.geometry.coordinates[1]}
      rotation={(train.properties.bearing + 270) % 360}
      rotationAlignment="map"
      anchor="center"
    >
      <div
        aria-label={label}
        role="img"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          width: 33,
          height: 18,
          filter: "drop-shadow(0 1px 2px rgba(0, 0, 0, 0.65))",
          pointerEvents: "none",
        }}
      >
        {[0, 1].map((car) => (
          <div
            key={car}
            style={{
              position: "relative",
              boxSizing: "border-box",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              width: 16,
              height: 13,
              border: "1px solid #ffffff",
              borderRadius: car === 1 ? "4px 6px 6px 4px" : 4,
              backgroundColor: train.properties.route_color,
            }}
          >
            {[0, 1].map((window) => (
              <span
                key={window}
                style={{
                  width: 4,
                  height: 5,
                  borderRadius: 1,
                  backgroundColor: "#e0f2fe",
                }}
              />
            ))}
            {car === 1 && (
              <span
                style={{
                  position: "absolute",
                  top: 4,
                  right: 1,
                  width: 2,
                  height: 4,
                  borderRadius: 1,
                  backgroundColor: "#ffffff",
                }}
              />
            )}
            {[2, 10].map((wheel) => (
              <span
                key={wheel}
                style={{
                  position: "absolute",
                  bottom: -3,
                  left: wheel,
                  width: 3,
                  height: 3,
                  borderRadius: "50%",
                  backgroundColor: "#172033",
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </Marker>
  );
}