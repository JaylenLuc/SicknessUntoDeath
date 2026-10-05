"use client";

import { useEffect, useState } from "react";
import Map, {
  Layer,
  NavigationControl,
  Source,
} from "react-map-gl/maplibre";
import {
  setWorkerUrl,
} from "maplibre-gl";

import { Button } from "@/components/retroui/Button";
import { Text } from "@/components/retroui/Text";
import {
  createTrainAnimator,
  type RailFeatureCollection,
  type TrainFeatureCollection,
} from "@/lib/LAFantasyRail_util/LAFantasyRail";

import MetroLA2026 from "./2026LAMetro";
import TrainMarker from "./TrainMarker";
/* 
CREDITS TO https://services2.arcgis.com/yL7v93RXrxlqkeDx/ArcGIS/rest/services/Pacific_Electric_Lines/FeatureServer/22
*/
import PacificElectricLayer from "./PEMap";
// import UserEditLayer from "./UserEditLayer";

setWorkerUrl("/maplibre-gl-worker.mjs");

const LA_BOUNDS: [number, number, number, number] = [
  -119.0,
  33.4,
  -117.4,
  34.8,
];

type LayerVisibility = {
  existingMetro: boolean;
  permanentFantasy: boolean;
  pacificElectric: boolean;
  userDraft: boolean;
};

type LayerToggleButtonProps = {
  active: boolean;
  label: string;
  onClick: () => void;
  draft?: boolean;
  colorClassName?: string;
};

function LayerToggleButton({
  active,
  label,
  onClick,
  colorClassName,
}: LayerToggleButtonProps) {
  return (
    <Button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={[
        "w-full justify-start gap-1 px-1.5 py-0.5 text-[11px] sm:gap-1 sm:px-1 sm:py-0.25 sm:text-xs lg:gap-2 lg:px-4 lg:py-1.5 lg:text-base",
        colorClassName,
        !active ? "opacity-60" : "",
      ].join(" ")}
    >
      <span aria-hidden="true">
        {active ? "✓" : "○"}
      </span>

      <span>{label}</span>
    </Button>
  );
}

function FantasyTrains() {
  const [trains, setTrains] = useState<TrainFeatureCollection>({
    type: "FeatureCollection",
    features: [],
  });

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    async function animateTrains() {
      try {
        const response = await fetch("/la-metro-rail/fantasy-layer.geojson");
        if (!response.ok) {
          throw new Error(`Fantasy rail data request failed: ${response.status}`);
        }

        const railData = (await response.json()) as RailFeatureCollection;
        const animateAt = createTrainAnimator(railData);
        const initialTrains = animateAt(0);
        if (cancelled || initialTrains.features.length === 0) return;

        const startedAt = performance.now();
        const updateTrains = () => {
          setTrains(animateAt(performance.now() - startedAt));
        };

        setTrains(initialTrains);
        timer = window.setInterval(updateTrains, 100);
      } catch (error) {
        console.error("Could not animate Fantasy trains:", error);
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
      {trains.features.map((train, index) => (
        <TrainMarker key={index} train={train} label="Fantasy train" />
      ))}
    </>
  );
}

function PermanentFantasyNetwork() {
  return (
    <Source
      id="permanent-fantasy-source"
      type="geojson"
      data="/la-metro-rail/fantasy-layer.geojson"
    >
      <Layer
        id="permanent-fantasy-casing"
        type="line"
        filter={[
          "==",
          ["geometry-type"],
          "LineString",
        ]}
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
        id="permanent-fantasy-lines"
        type="line"
        filter={[
          "==",
          ["geometry-type"],
          "LineString",
        ]}
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

      <Layer
        id="permanent-fantasy-stations"
        type="circle"
        filter={[
          "==",
          ["geometry-type"],
          "Point",
        ]}
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

      <Layer
        id="permanent-fantasy-labels"
        type="symbol"
        minzoom={10}
        filter={[
          "==",
          ["geometry-type"],
          "Point",
        ]}
        layout={{
          "text-field": ["get", "name"],
          "text-size": 11,
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
  );
}

export default function FantasyRailMap() {
  const [visibleLayers, setVisibleLayers] =
    useState<LayerVisibility>({
      existingMetro: true,
      pacificElectric: false,
      permanentFantasy: true,
      userDraft: false,
    });

  function toggleLayer(
    layer: keyof LayerVisibility,
  ) {
    setVisibleLayers((current) => ({
      ...current,
      [layer]: !current[layer],
    }));
  }

  return (
    <div className="relative h-full w-full">
      <div className="absolute left-1.5 top-1.5 z-10 w-36 border-2 border-black bg-white p-1.5
      shadow-[4px_4px_0_#000] sm:left-2 sm:top-2 sm:w-44 sm:p-2 lg:left-4 lg:top-4 lg:w-56 lg:p-3">
        <Text as="p" className="mb-1.5 text-xs font-bold sm:mb-2 sm:text-sm lg:mb-3 lg:text-base">
          Map Layers
        </Text>

        <div className="flex flex-col gap-1 sm:gap-1.5 lg:gap-2">
          <LayerToggleButton
              active={visibleLayers.pacificElectric}
              label="Pacific Electric"
              colorClassName="bg-orange-100 hover:bg-orange-200"
              onClick={() =>
                toggleLayer("pacificElectric")
              }
          />
          <LayerToggleButton
            active={visibleLayers.existingMetro}
            label="LA Metro 2026"
            colorClassName="bg-sky-100 hover:bg-sky-200"
            onClick={() =>
              toggleLayer("existingMetro")
            }
          />

          <LayerToggleButton
            active={
              visibleLayers.permanentFantasy
            }
            label="Fantasy Network"
            colorClassName="bg-rose-100 hover:bg-rose-200"
            onClick={() =>
              toggleLayer("permanentFantasy")
            }
          />

          {/* <LayerToggleButton
            active={visibleLayers.userDraft}
            label="User Draft"
            draft
            onClick={() =>
              toggleLayer("userDraft")
            }
          /> */}
        </div>
      </div>

      <Map
        initialViewState={{
          longitude: -118.2437,
          latitude: 34.0522,
          zoom: 9.5,
        }}
        mapStyle="https://tiles.versatiles.org/assets/styles/colorful/style.json"
        onError={(event) =>
          console.error(
            "MapLibre error:",
            event.error,
          )
        }
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "10px",
          overflow: "hidden",
        }}
        maxBounds={LA_BOUNDS}
      >
        <NavigationControl position="bottom-right" />
        {visibleLayers.pacificElectric && (
          <PacificElectricLayer />
        )}
        
        {visibleLayers.existingMetro && (
          <MetroLA2026 />
        )}

        {visibleLayers.permanentFantasy && (
          <>
            <PermanentFantasyNetwork />
            <FantasyTrains />
          </>
        )}

        {/* {visibleLayers.userDraft && (
          <UserEditLayer />
        )} */}
      </Map>
    </div>
  );
}
