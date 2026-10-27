"use client";

import { Layer, Source } from "react-map-gl/maplibre";
import { LARY_1915_DASHARRAY, LARY_PERIOD_STYLES } from "./laryPeriodStyles";

export default function LosAngelesRailwayLayer() {
  return (
    <Source
      id="los-angeles-railway-source"
      type="geojson"
      data="/la-metro-rail/lary-period-comparison.geojson"
      attribution={'LARy GIS: <a href="https://leahbrooks.org/leahweb/subpages/research.html" target="_blank" rel="noopener noreferrer">Brooks &amp; Lutz (2019)</a>; digitization: Jordan Hale'}
    >
      {LARY_PERIOD_STYLES.flatMap((period) => [
          !period.dashed && (
            <Layer
              key={`${period.id}-casing`}
              id={`los-angeles-railway-${period.id}-casing`}
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
            id={`los-angeles-railway-${period.id}-lines`}
            type="line"
            filter={["all", ["==", ["get", "render"], true], ["==", ["get", "comparison_class"], period.id]]}
            layout={{ "line-cap": period.dashed ? "butt" : "round", "line-join": "round" }}
            paint={{
              "line-color": period.color,
              "line-width": ["interpolate", ["linear"], ["zoom"], 8, period.dashed ? 3 : 2, 13, 5],
              ...(period.dashed ? { "line-dasharray": LARY_1915_DASHARRAY } : {}),
            }}
          />,
      ])}

      <Layer
        id="los-angeles-railway-labels"
        type="symbol"
        minzoom={11.5}
        filter={["==", ["get", "render"], true]}
        layout={{
          "symbol-placement": "line",
          "symbol-spacing": 700,
          "text-field": ["match", ["get", "comparison_class"],
            "1915_only", "LARy • 1915",
            "1930s_only", "LARy • 1930s",
            "LARy • 1915 + 1930s"],
          "text-size": 10,
          "text-max-angle": 30,
          "text-keep-upright": true,
          "text-allow-overlap": false,
        }}
        paint={{
          "text-color": "#334155",
          "text-halo-color": "#fffaf0",
          "text-halo-width": 2,
        }}
      />
    </Source>
  );
}
