  "use client";

  import { Layer, Source } from "react-map-gl/maplibre";

  export default function PacificElectricLayer() {
    return (
      <Source
        id="pacific-electric-source"
        type="geojson"
        data="/la-metro-rail/pacific-electric-lines.geojson"
      >
        <Layer
          id="pacific-electric-casing"
          type="line"
          layout={{
            "line-cap": "round",
            "line-join": "round",
          }}
          paint={{
            "line-color": "#fff7ed",
            "line-opacity": 0.8,
            "line-width": [
              "interpolate",
              ["linear"],
              ["zoom"],
              8,
              2.5,
              13,
              5,
            ],
          }}
        />

        <Layer
          id="pacific-electric-lines"
          type="line"
          layout={{
            "line-cap": "round",
            "line-join": "round",
          }}
          paint={{
            "line-color": "#991b1b",
            "line-opacity": 0.72,
            "line-dasharray": [2, 1.25],
            "line-width": [
              "interpolate",
              ["linear"],
              ["zoom"],
              8,
              2,
              13,
              6,
            ],
          }}
        />

        <Layer
          id="pacific-electric-labels"
          type="symbol"
          minzoom={11}
          layout={{
            "symbol-placement": "line",
            "symbol-spacing": 450,
            "text-field": ["get", "Name"],
            "text-size": 10,
            "text-max-angle": 30,
            "text-keep-upright": true,
            "text-allow-overlap": false,
          }}
          paint={{
            "text-color": "#7f1d1d",
            "text-halo-color": "#fff7ed",
            "text-halo-width": 2,
          }}
        />
      </Source>
    );
  }