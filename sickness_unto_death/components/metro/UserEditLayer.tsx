"use client";

import { useMemo } from "react";
import { Layer, Source } from "react-map-gl/maplibre";

import { useUserDraftStore } from "../../app/stores/user_edit_store";

export default function UserEditLayer() {
const stations = useUserDraftStore(
    (state) => state.stations,
);
 const lines = useUserDraftStore(
    (state) => state.lines,
  );

const stationGeoJson = useMemo(
    () => ({
    type: "FeatureCollection" as const,

    features: stations.map((station) => ({
        type: "Feature" as const,
        id: station.id,

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

const lineGeoJson = useMemo(() => {
    const stationsById = new Map(
    stations.map((station) => [
        station.id,
        station,
    ]),
    );

    return {
    type: "FeatureCollection" as const,

    features: lines.flatMap((line) => {
        const coordinates =
        line.stationIds.flatMap(
            (stationId) => {
            const station =
                stationsById.get(stationId);

            return station
                ? [station.coordinates]
                : [];
            },
        );

        // GeoJSON lines require at least
        // two coordinate positions.
        if (coordinates.length < 2) {
        return [];
        }

        return [
        {
            type: "Feature" as const,
            id: line.id,

            properties: {
            id: line.id,
            name: line.name,
            color: line.color,
            },

            geometry: {
            type: "LineString" as const,
            coordinates,
            },
        },
        ];
    }),
    };
}, [lines, stations]);

return (
    <>
    <Source
        id="user-edit-lines-source"
        type="geojson"
        data={lineGeoJson}
    >
        <Layer
        id="user-edit-line-casing"
        type="line"
        layout={{
            "line-cap": "round",
            "line-join": "round",
        }}
        paint={{
            "line-color": "#ffffff",
            "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            8,
            5,
            13,
            11,
            ],
        }}
        />

        <Layer
        id="user-edit-lines"
        type="line"
        layout={{
            "line-cap": "round",
            "line-join": "round",
        }}
        paint={{
            "line-color": [
            "coalesce",
            ["get", "color"],
            "#e11d48",
            ],
            "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            8,
            3,
            13,
            7,
            ],
        }}
        />
    </Source>

    <Source
        id="user-edit-stations-source"
        type="geojson"
        data={stationGeoJson}
    >
        <Layer
        id="user-edit-stations"
        type="circle"
        paint={{
            "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            8,
            3,
            13,
            8,
            ],
            "circle-color": "#fef08a",
            "circle-stroke-color": "#111827",
            "circle-stroke-width": 3,
        }}
        />

        <Layer
        id="user-edit-station-labels"
        type="symbol"
        minzoom={10}
        layout={{
            "text-field": ["get", "name"],
            "text-size": 13,
            "text-offset": [0, 1.3],
            "text-anchor": "top",
            "text-allow-overlap": false,
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
