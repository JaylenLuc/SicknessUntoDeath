"use client";

import { useEffect, useState } from "react";
import { Layer, Source } from "react-map-gl/maplibre";
import {
    createTrainAnimator,
    type RailFeatureCollection,
    type TrainFeatureCollection,
} from "@/lib/LAFantasyRail_util/LAFantasyRail";
import TrainMarker from "./TrainMarker";

export default function MetroLA2026() {
    const [trains, setTrains] = useState<TrainFeatureCollection>({ type: "FeatureCollection", features: [] });

    useEffect(() => {
        let cancelled = false;
        let timer: number | undefined;

        async function animateTrains() {
            try {
                const response = await fetch("/la-metro-rail/la-metro-rail.geojson");
                if (!response.ok) throw new Error(`Rail data request failed: ${response.status}`);

                const railData = (await response.json()) as RailFeatureCollection;
                const animateAt = createTrainAnimator(railData);
                if (cancelled) return;

                const startedAt = performance.now();
                const updateTrains = () => {
                    setTrains(animateAt(performance.now() - startedAt));
                };

                updateTrains();
                timer = window.setInterval(updateTrains, 100);
            } catch (error) {
                console.error("Could not animate Metro trains:", error);
            }
        }

        void animateTrains();
        return () => {
            cancelled = true;
            if (timer !== undefined) window.clearInterval(timer);
        };
    }, []);

return (
    <>
    <Source
        id="existing-la-metro"
        type="geojson"
        data="/la-metro-rail/la-metro-rail.geojson"
    >
        {/* White casing under the existing rail lines */}
        <Layer
        id="existing-la-metro-casing"
        type="line"
        filter={["==", ["geometry-type"], "LineString"]}
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
            4,
            13,
            9,
            ],
            "line-opacity": 0.9,
        }}
        />

        {/* Official route colors */}
        <Layer
        id="existing-la-metro-lines"
        type="line"
        filter={["==", ["geometry-type"], "LineString"]}
        layout={{
            "line-cap": "round",
            "line-join": "round",
        }}
        paint={{
            "line-color": [
            "coalesce",
            ["get", "route_color"],
            "#6b7280",
            ],
            "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            8,
            2,
            13,
            5,
            ],
            "line-opacity": 0.9,
        }}
        />

        {/* Route names follow the line and use the agency's label color */}
        <Layer
        id="existing-la-metro-route-labels"
        type="symbol"
        minzoom={9}
        filter={["==", ["geometry-type"], "LineString"]}
        layout={{
            "symbol-placement": "line",
            "symbol-spacing": 450,
            "text-field": ["get", "route_long_name"],
            "text-size": 12,
            "text-rotation-alignment": "map",
            "text-keep-upright": true,
            "text-allow-overlap": false,
        }}
        paint={{
            "text-color": "#111827",
            "text-halo-color": "#ffffff",
            "text-halo-width": 2,
        }}
        />

        {/* Station circles */}
        <Layer
        id="existing-la-metro-stations"
        type="circle"
        filter={["==", ["geometry-type"], "Point"]}
        paint={{
            "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            8,
            2,
            13,
            6,
            ],
            "circle-color": "#ffffff",
            "circle-stroke-color": "#111827",
            "circle-stroke-width": 2,
        }}
        />

        {/* Station names appear when zoomed in */}
        <Layer
        id="existing-la-metro-station-labels"
        type="symbol"
        minzoom={11}
        filter={["==", ["geometry-type"], "Point"]}
        layout={{
            "text-field": [
            "coalesce",
            ["get", "stop_name"],
            ["get", "name"],
            "Station",
            ],
            "text-size": 12,
            "text-offset": [0, 1.25],
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
    {trains.features.map((train, index) => (
        <TrainMarker key={index} train={train} label="Metro train" />
    ))}
    </>
);
}