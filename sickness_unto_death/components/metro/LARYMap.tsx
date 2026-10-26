"use client";

import { Layer, Source } from "react-map-gl/maplibre";

export default function LosAngelesRailwayLayer() {
  return (
    <Source
      id="los-angeles-railway-source"
      type="geojson"
      data="/la-metro-rail/los-angeles-railway-yellow-cars-1935.geojson"
      attribution={'Geometry: <a href="https://commons.wikimedia.org/wiki/File:Los_Angeles_Railway_(Yellow_Cars_streetcars).svg" target="_blank" rel="noopener noreferrer">jkan997 / ShareMap, CC BY-SA 3.0</a> · 1935 reference: <a href="https://hdl.huntington.org/digital/collection/p15150coll4/id/16360/" target="_blank" rel="noopener noreferrer">The Huntington</a>'}
    >
      <Layer
        id="los-angeles-railway-casing"
        type="line"
        filter={["==", ["geometry-type"], "LineString"]}
        layout={{
          "line-cap": "round",
          "line-join": "round",
        }}
        paint={{
          "line-color": "#713f12",
          "line-opacity": 0.78,
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            8,
            3.5,
            13,
            7,
          ],
        }}
      />

      <Layer
        id="los-angeles-railway-lines"
        type="line"
        filter={["==", ["geometry-type"], "LineString"]}
        layout={{
          "line-cap": "round",
          "line-join": "round",
        }}
        paint={{
          "line-color": "#facc15",
          "line-opacity": 0.9,
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            8,
            2,
            13,
            5,
          ],
        }}
      />

      <Layer
        id="los-angeles-railway-labels"
        type="symbol"
        minzoom={11.5}
        filter={["==", ["geometry-type"], "LineString"]}
        layout={{
          "symbol-placement": "line",
          "symbol-spacing": 700,
          "text-field": "LARy Yellow Cars • c. 1935",
          "text-size": 10,
          "text-max-angle": 30,
          "text-keep-upright": true,
          "text-allow-overlap": false,
        }}
        paint={{
          "text-color": "#713f12",
          "text-halo-color": "#fef9c3",
          "text-halo-width": 2,
        }}
      />
    </Source>
  );
}
