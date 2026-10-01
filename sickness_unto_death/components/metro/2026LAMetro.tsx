"use client";

import { useEffect, useState } from "react";
import type { FeatureCollection, LineString, MultiLineString, Point, Position } from "geojson";
import { Layer, Marker, Source } from "react-map-gl/maplibre";

type RailGeometry = LineString | MultiLineString;
type RailFeatureCollection = FeatureCollection<RailGeometry, { route_color?: string }>;
type TrainFeatureCollection = FeatureCollection<Point, { route_color: string; bearing: number }>;

type RoutePath = {
    coordinates: Position[];
    distances: number[];
    length: number;
    color: string;
};

function distanceBetween(start: Position, end: Position) {
    const radians = Math.PI / 180;
    const latitudeDelta = (end[1] - start[1]) * radians;
    const longitudeDelta = (end[0] - start[0]) * radians;
    const latitude = start[1] * radians;
    const nextLatitude = end[1] * radians;
    const haversine =
        Math.sin(latitudeDelta / 2) ** 2 +
        Math.cos(latitude) * Math.cos(nextLatitude) * Math.sin(longitudeDelta / 2) ** 2;

    return 6371000 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function makeRoutePath(coordinates: Position[], color: string): RoutePath | null {
    const distances = [0];

    for (let index = 1; index < coordinates.length; index += 1) {
        distances.push(distances[index - 1] + distanceBetween(coordinates[index - 1], coordinates[index]));
    }

    const length = distances[distances.length - 1];
    return length > 0 ? { coordinates, distances, length, color } : null;
}

function positionAt(path: RoutePath, progress: number): Position {
    const targetDistance = path.length * progress;
    let index = 1;

    while (index < path.distances.length - 1 && path.distances[index] < targetDistance) {
        index += 1;
    }

    const segmentStart = path.distances[index - 1];
    const segmentLength = path.distances[index] - segmentStart;
    const segmentProgress = segmentLength === 0 ? 0 : (targetDistance - segmentStart) / segmentLength;
    const start = path.coordinates[index - 1];
    const end = path.coordinates[index];

    return [
        start[0] + (end[0] - start[0]) * segmentProgress,
        start[1] + (end[1] - start[1]) * segmentProgress,
    ];
}

function bearingBetween(start: Position, end: Position) {
    const radians = Math.PI / 180;
    const startLatitude = start[1] * radians;
    const endLatitude = end[1] * radians;
    const longitudeDelta = (end[0] - start[0]) * radians;
    const y = Math.sin(longitudeDelta) * Math.cos(endLatitude);
    const x =
        Math.cos(startLatitude) * Math.sin(endLatitude) -
        Math.sin(startLatitude) * Math.cos(endLatitude) * Math.cos(longitudeDelta);

    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

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
                const routes = railData.features.flatMap((feature) => {
                    const lines = feature.geometry.type === "LineString"
                        ? [feature.geometry.coordinates]
                        : feature.geometry.coordinates;
                    const longestLine = lines.reduce<Position[]>((longest, line) =>
                        line.length > longest.length ? line : longest, []);
                    const route = makeRoutePath(longestLine, `#${feature.properties?.route_color ?? "6b7280"}`);

                    return route ? [route] : [];
                });

                if (cancelled || routes.length === 0) return;

                const startedAt = performance.now();
                const updateTrains = () => {
                    const elapsed = (performance.now() - startedAt) / 120000;
                    setTrains({
                        type: "FeatureCollection",
                        features: routes.map((route, index) => {
                            const cycle = (elapsed + index / routes.length) % 2;
                            const progress = cycle <= 1 ? cycle : 2 - cycle;
                            const coordinates = positionAt(route, progress);
                            const tangentProgress = progress < 0.999 ? progress + 0.001 : progress - 0.001;
                            const tangentCoordinates = positionAt(route, tangentProgress);

                            return {
                                type: "Feature",
                                properties: {
                                    route_color: route.color,
                                    bearing: bearingBetween(coordinates, tangentCoordinates),
                                },
                                geometry: { type: "Point", coordinates },
                            };
                        }),
                    });
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
        <Marker
        key={index}
        longitude={train.geometry.coordinates[0]}
        latitude={train.geometry.coordinates[1]}
        rotation={(train.properties.bearing + 270) % 360}
        rotationAlignment="map"
        anchor="center"
        >
        <div
            aria-label="Metro train"
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
                            style={{ width: 4, height: 5, borderRadius: 1, backgroundColor: "#e0f2fe" }}
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
    ))}
    </>
);
}