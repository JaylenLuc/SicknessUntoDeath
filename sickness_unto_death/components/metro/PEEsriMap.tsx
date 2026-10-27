"use client";

import { Layer, Source } from "react-map-gl/maplibre";
import { PE_ESRI_STYLE } from "./peEsriStyle";

export default function PacificElectricEsriLayer() {
  return (
    <Source
      id="pacific-electric-esri-source"
      type="geojson"
      data="/la-metro-rail/pacific-electric-lines-esri-2021.geojson"
      attribution={'PE geometry: <a href="https://services2.arcgis.com/yL7v93RXrxlqkeDx/ArcGIS/rest/services/Pacific_Electric_Lines/FeatureServer/22" target="_blank" rel="noopener noreferrer">Esri dataset, published 2021</a> · Historical year unspecified · Coverage extends beyond Los Angeles County'}
    >
      <Layer
        id="pacific-electric-esri-casing"
        type="line"
        layout={{ "line-cap": "round", "line-join": "round" }}
        paint={{
          "line-color": PE_ESRI_STYLE.casing,
          "line-opacity": 0.8,
          "line-width": ["interpolate", ["linear"], ["zoom"], 8, 2.5, 13, 5],
        }}
      />
      <Layer
        id="pacific-electric-esri-lines"
        type="line"
        layout={{ "line-cap": "round", "line-join": "round" }}
        paint={{
          "line-color": PE_ESRI_STYLE.color,
          "line-opacity": PE_ESRI_STYLE.opacity,
          "line-dasharray": PE_ESRI_STYLE.dasharray,
          "line-width": ["interpolate", ["linear"], ["zoom"], 8, 2, 13, 6],
        }}
      />
      <Layer
        id="pacific-electric-esri-labels"
        type="symbol"
        minzoom={11}
        layout={{
          "symbol-placement": "line",
          "symbol-spacing": 450,
          "text-field": ["concat", ["coalesce", ["get", "Name"], "Pacific Electric"], " • Esri"],
          "text-size": 10,
          "text-max-angle": 30,
          "text-keep-upright": true,
          "text-allow-overlap": false,
        }}
        paint={{
          "text-color": "#7f1d1d",
          "text-halo-color": PE_ESRI_STYLE.casing,
          "text-halo-width": 2,
        }}
      />
    </Source>
  );
}
