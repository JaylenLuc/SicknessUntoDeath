"use client";

import { Layer, Source } from "react-map-gl/maplibre";
import { PE_1915_DASHARRAY, PE_PERIOD_STYLES } from "./peLineStyle";

export default function PacificElectricLayer() {
  return (
    <Source
      id="pacific-electric-source"
      type="geojson"
      data="/la-metro-rail/pe-period-comparison.geojson"
      attribution={'PE GIS: <a href="https://leahbrooks.org/leahweb/subpages/research.html" target="_blank" rel="noopener noreferrer">Brooks &amp; Lutz (2019)</a>; digitization: Jordan Hale'}
    >
      {PE_PERIOD_STYLES.flatMap((period) => [
          !period.dashed && (
            <Layer
              key={`${period.id}-casing`}
              id={`pacific-electric-${period.id}-casing`}
              type="line"
              filter={["all", ["==", ["get", "render"], true], ["==", ["get", "comparison_class"], period.id]]}
              layout={{ "line-cap": "round", "line-join": "round" }}
              paint={{
                "line-color": period.casing,
                "line-width": ["interpolate", ["linear"], ["zoom"], 8, 3.5, 13, 7],
              }}
            />
          ),
          <Layer
            key={`${period.id}-lines`}
            id={`pacific-electric-${period.id}-lines`}
            type="line"
            filter={["all", ["==", ["get", "render"], true], ["==", ["get", "comparison_class"], period.id]]}
            layout={{ "line-cap": period.dashed ? "butt" : "round", "line-join": "round" }}
            paint={{
              "line-color": period.color,
              "line-width": ["interpolate", ["linear"], ["zoom"], 8, period.dashed ? 3 : 2, 13, 5],
              ...(period.dashed ? { "line-dasharray": PE_1915_DASHARRAY } : {}),
            }}
          />,
      ])}

      <Layer
        id="pacific-electric-labels"
        type="symbol"
        minzoom={11}
        filter={["==", ["get", "render"], true]}
        layout={{
          "symbol-placement": "line",
          "symbol-spacing": 700,
          "text-field": ["match", ["get", "comparison_class"],
            "1915_only", "PE • 1915 source",
            "1928_only", "PE • 1928 source",
            "PE • 1915 + 1928"],
          "text-size": 10,
          "text-max-angle": 30,
          "text-keep-upright": true,
          "text-allow-overlap": false,
        }}
        paint={{
          "text-color": "#493c5a",
          "text-halo-color": "#fffaf0",
          "text-halo-width": 2,
        }}
      />
    </Source>
  );
}
