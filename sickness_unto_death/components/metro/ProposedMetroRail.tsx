"use client";

import { Layer, Source } from "react-map-gl/maplibre";
import type { ExpressionSpecification } from "maplibre-gl";
import { RAIL_PROJECTS } from "./proposedMetroProjects";

const STATUS_LABEL: ExpressionSpecification = [
  "match",
  ["get", "status"],
  "under_construction",
  "UNDER CONSTRUCTION",
  "pre_construction",
  "PRE-CONSTRUCTION",
  "design",
  "DESIGN",
  "planning",
  "PLANNED",
  "future",
  "FUTURE / UNFUNDED",
  "PROPOSED",
];

export default function ProposedMetroRail() {
  return (
    <>
      {RAIL_PROJECTS.map((project) => {
        const lineOffset =
          "lineOffset" in project ? project.lineOffset : 0;
        const horizontalOffset =
          "horizontalOffset" in project ? project.horizontalOffset : 0;
        const referenceAttribution =
          "referenceUrl" in project
            ? ` · <a href="${project.referenceUrl}" target="_blank" rel="noopener noreferrer">${project.referenceLabel}</a>`
            : "";

        return (
          <Source
            key={project.id}
            id={`${project.id}-source`}
            type="geojson"
            data={`/la-metro-rail/${project.file}`}
            attribution={`<a href="${project.sourceUrl}" target="_blank" rel="noopener noreferrer">${project.sourceLabel}</a>${referenceAttribution}`}
          >
          <Layer
            id={`${project.id}-casing`}
            type="line"
            filter={["==", ["geometry-type"], "LineString"]}
            layout={{ "line-cap": "round", "line-join": "round" }}
            paint={{
              "line-color": "#ffffff",
              "line-width": ["interpolate", ["linear"], ["zoom"], 8, 5, 13, 10],
              "line-opacity": 0.9,
              "line-offset": lineOffset,
            }}
          />

          <Layer
            id={`${project.id}-line`}
            type="line"
            filter={["==", ["geometry-type"], "LineString"]}
            layout={{ "line-cap": "round", "line-join": "round" }}
            paint={{
              "line-color": ["coalesce", ["get", "route_color"], "#64748b"],
              "line-width": ["interpolate", ["linear"], ["zoom"], 8, 3, 13, 6],
              "line-opacity": 0.88,
              "line-dasharray": [2, 1.5],
              "line-offset": lineOffset,
            }}
          />

          <Layer
            id={`${project.id}-route-label`}
            type="symbol"
            minzoom={8}
            filter={["==", ["geometry-type"], "LineString"]}
            layout={{
              "symbol-placement": "line",
              "symbol-spacing": 360,
              "text-field": [
                "concat",
                ["get", "route_long_name"],
                " • ",
                STATUS_LABEL,
              ],
              "text-size": 11,
              "text-rotation-alignment": "map",
              "text-keep-upright": true,
              "text-allow-overlap": false,
            }}
            paint={{
              "text-color": "#111827",
              "text-halo-color": "#ffffff",
              "text-halo-width": 2,
              "text-translate": [horizontalOffset, 0],
            }}
          />

          <Layer
            id={`${project.id}-stations`}
            type="circle"
            filter={["==", ["geometry-type"], "Point"]}
            paint={{
              "circle-radius": [
                "interpolate",
                ["linear"],
                ["zoom"],
                8,
                1.25,
                13,
                4,
                16,
                5,
              ],
              "circle-color": [
                "match",
                ["get", "status"],
                "under_construction",
                "#ffedd5",
                "pre_construction",
                "#fef3c7",
                "design",
                "#dbeafe",
                "planning",
                "#fef9c3",
                "future",
                "#e5e7eb",
                "#ffffff",
              ],
              "circle-stroke-color": "#111827",
              "circle-stroke-width": 1.5,
              "circle-translate": [horizontalOffset, 0],
            }}
          />

          <Layer
            id={`${project.id}-station-labels`}
            type="symbol"
            minzoom={10.5}
            filter={["==", ["geometry-type"], "Point"]}
            layout={{
              "text-field": [
                "concat",
                ["get", "stop_name"],
                "\n(",
                STATUS_LABEL,
                ")",
              ],
              "text-size": 11,
              "text-offset": [0, 1.25],
              "text-anchor": "top",
              "text-allow-overlap": false,
            }}
            paint={{
              "text-color": "#111827",
              "text-halo-color": "#ffffff",
              "text-halo-width": 2,
              "text-translate": [horizontalOffset, 0],
            }}
          />
          </Source>
        );
      })}
    </>
  );
}
