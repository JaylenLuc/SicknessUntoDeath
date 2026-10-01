"use client";

import { useMemo } from "react";
import { Layer, Source } from "react-map-gl/maplibre";
import { useFantasyMapStore } from "../../app/stores/fanstasy_map_store";

export default function FantasyMetroLayer() {
const stations = useFantasyMapStore(
    (state) => state.stations,
);

const lines = useFantasyMapStore(
    (state) => state.lines,
);

const lineGeoJson = useMemo(
    () => ({
    type: "FeatureCollection" as const,
    features: lines.map((line) => ({
        type: "Feature" as const,
        properties: {
        id: line.id,
        name: line.name,
        color: line.color,
        },
        geometry: {
        type: "LineString" as const,
        coordinates: line.coordinates,
        },
    })),
    }),
    [lines],
);

const stationGeoJson = useMemo(
    () => ({
    type: "FeatureCollection" as const,
    features: stations.map((station) => ({
        type: "Feature" as const,
        properties: {
        id: station.id,
        name: station.name,
        street1: station.street1,
        street2: station.street2,
        },
        geometry: {
        type: "Point" as const,
        coordinates: station.coordinates,
        },
    })),
    }),
    [stations],
);

return (
    <>
    <Source
        id="fantasy-lines"
        type="geojson"
        data={lineGeoJson}
    >
        <Layer
        id="fantasy-line-casing"
        type="line"
        layout={{
            "line-cap": "round",
            "line-join": "round",
        }}
        paint={{
            "line-color": "#ffffff",
            "line-width": 11,
        }}
        />

        <Layer
        id="fantasy-lines"
        type="line"
        layout={{
            "line-cap": "round",
            "line-join": "round",
        }}
        paint={{
            "line-color": ["get", "color"],
            "line-width": 7,
        }}
        />
    </Source>

    <Source
        id="fantasy-stations"
        type="geojson"
        data={stationGeoJson}
    >
        <Layer
        id="fantasy-stations"
        type="circle"
        paint={{
            "circle-radius": 8,
            "circle-color": "#ffffff",
            "circle-stroke-color": "#111827",
            "circle-stroke-width": 3,
        }}
        />

        <Layer
        id="fantasy-station-labels"
        type="symbol"
        minzoom={10}
        layout={{
            "text-field": ["get", "name"],
            "text-size": 13,
            "text-offset": [0, 1.3],
            "text-anchor": "top",
        }}
        paint={{
            "text-color": "#111827",
            "text-halo-color": "#ffffff",
            "text-halo-width": 2,
        }}
        />
    </Source>
    </>
);
}

