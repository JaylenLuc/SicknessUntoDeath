"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
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
import PacificElectricLayer from "./PEMap";
import PacificElectricEsriLayer from "./PEEsriMap";
import { PE_ESRI_DESCRIPTION, PE_ESRI_LABEL } from "./peEsriStyle";
import LosAngelesRailwayLayer from "./LARYMap";
import ProposedMetroRail from "./ProposedMetroRail";
import FantasyRailLegend from "./FantasyRailLegend";
// import UserEditLayer from "./UserEditLayer";

setWorkerUrl("/maplibre-gl-worker.mjs");

const REGIONAL_BOUNDS: [number, number, number, number] = [
  -119.0,
  33.4,
  -117.0,
  34.8,
];

const COLORFUL_MAP_STYLE =
  "https://tiles.versatiles.org/assets/styles/colorful/style.json";

const SATELLITE_MAP_STYLE = {
  version: 8 as const,
  sources: {
    "esri-world-imagery": {
      type: "raster" as const,
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution:
        "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    },
  },
  layers: [
    {
      id: "esri-world-imagery",
      type: "raster" as const,
      source: "esri-world-imagery",
    },
  ],
};

type BaseMap = "colorful" | "satellite";

type LayerVisibility = {
  existingMetro: boolean;
  metroProjects: boolean;
  permanentFantasy: boolean;
  pacificElectric: boolean;
  pacificElectricEsri: boolean;
  losAngelesRailway: boolean;
  userDraft: boolean;
};

type LayerToggleButtonProps = {
  active: boolean;
  label: string;
  description?: string;
  onClick: () => void;
  draft?: boolean;
  colorClassName?: string;
};

function LayerToggleButton({
  active,
  label,
  description,
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

      <span className="min-w-0 text-left">
        <span>{label}</span>
        {description && (
          <span className="mt-0.5 block text-[9px] font-normal leading-tight sm:text-[10px] lg:text-xs">
            {description}
          </span>
        )}
      </span>
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
          throw new Error(`Inter Urbes fantasy rail data request failed: ${response.status}`);
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
        console.error("Could not animate Inter Urbes fantasy trains:", error);
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
        <TrainMarker key={index} train={train} label="Inter Urbes — Fantasy train" />
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
        id="permanent-fantasy-route-labels"
        type="symbol"
        minzoom={8.5}
        filter={["==", ["geometry-type"], "LineString"]}
        layout={{
          "symbol-placement": "line",
          "symbol-spacing": 380,
          "text-field": ["get", "name"],
          "text-size": 11,
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
            1.25,
            13,
            4,
            16,
            5,
          ],
          "circle-color": "#ffffff",
          "circle-stroke-color": "#111827",
          "circle-stroke-width": 1.5,
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
  const [baseMap, setBaseMap] = useState<BaseMap>("colorful");
  const [railLayersOpen, setRailLayersOpen] = useState(true);
  const [legendOpen, setLegendOpen] = useState(false);
  const [visibleLayers, setVisibleLayers] =
    useState<LayerVisibility>({
      existingMetro: true,
      metroProjects: true,
      pacificElectric: false,
      pacificElectricEsri: false,
      losAngelesRailway: false,
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
      <div className="absolute left-1.5 top-1.5 z-10 max-h-[calc(100%-0.75rem)] w-36 overflow-y-auto overscroll-contain border-2 border-black bg-white p-1.5
      shadow-[4px_4px_0_#000] sm:left-2 sm:top-2 sm:max-h-[calc(100%-1rem)] sm:w-44 sm:p-2 lg:left-4 lg:top-4 lg:max-h-[calc(100%-2rem)] lg:w-56 lg:p-3">
        <Text as="p" className="mb-1 text-xs font-bold sm:text-sm lg:text-base">
          Base Map
        </Text>

        <div className="mb-2 grid grid-cols-2 gap-1 lg:mb-3">
          <Button
            type="button"
            aria-pressed={baseMap === "colorful"}
            onClick={() => setBaseMap("colorful")}
            className={[
              "justify-center px-1 py-0.5 text-[10px] sm:text-xs lg:py-1 lg:text-sm",
              baseMap === "colorful" ? "bg-violet-200" : "bg-white opacity-70",
            ].join(" ")}
          >
            Abstract
          </Button>
          <Button
            type="button"
            aria-pressed={baseMap === "satellite"}
            onClick={() => setBaseMap("satellite")}
            className={[
              "justify-center px-1 py-0.5 text-[10px] sm:text-xs lg:py-1 lg:text-sm",
              baseMap === "satellite" ? "bg-emerald-200" : "bg-white opacity-70",
            ].join(" ")}
          >
            Satellite
          </Button>
        </div>

        <button
          type="button"
          aria-expanded={railLayersOpen}
          aria-controls="fantasy-rail-layer-controls"
          onClick={() => setRailLayersOpen((open) => !open)}
          className="flex w-full items-center justify-between border-t-2 border-black pt-1.5 text-left text-xs font-bold sm:text-sm lg:text-base"
        >
          <span>Rail Layers</span>
          {railLayersOpen ? (
            <ChevronUp aria-hidden="true" className="size-4" />
          ) : (
            <ChevronDown aria-hidden="true" className="size-4" />
          )}
        </button>

        {railLayersOpen && (
          <div
            id="fantasy-rail-layer-controls"
            className="mt-1.5 flex flex-col gap-1 sm:gap-1.5 lg:mt-2 lg:gap-2"
          >
            <LayerToggleButton
              active={visibleLayers.pacificElectricEsri}
              label={PE_ESRI_LABEL}
              description={PE_ESRI_DESCRIPTION}
              colorClassName="bg-red-100 hover:bg-red-200"
              onClick={() => toggleLayer("pacificElectricEsri")}
            />
            <LayerToggleButton
              active={visibleLayers.pacificElectric}
              label="Pacific Electric (1915 + 1928)"
              description="Brooks–Lutz · LA County coverage"
              colorClassName="bg-orange-100 hover:bg-orange-200"
              onClick={() =>
                toggleLayer("pacificElectric")
              }
            />
            <LayerToggleButton
              active={visibleLayers.losAngelesRailway}
              label="LARy Yellow Cars (1915 + 1930s)"
              colorClassName="bg-yellow-100 hover:bg-yellow-200"
              onClick={() =>
                toggleLayer("losAngelesRailway")
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
              active={visibleLayers.metroProjects}
              label="LA Metro Future Projects"
              colorClassName="bg-amber-100 hover:bg-amber-200"
              onClick={() => toggleLayer("metroProjects")}
            />

            <LayerToggleButton
              active={
                visibleLayers.permanentFantasy
              }
              label="Inter Urbes — Fantasy Network"
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
        )}

        <button
          type="button"
          aria-expanded={legendOpen}
          aria-controls="fantasy-rail-map-legend"
          onClick={() => setLegendOpen((open) => !open)}
          className="mt-2 flex w-full items-center justify-between border-t-2 border-black pt-1.5 text-left text-xs font-bold sm:text-sm lg:text-base"
        >
          <span>Legend</span>
          {legendOpen ? (
            <ChevronUp aria-hidden="true" className="size-4" />
          ) : (
            <ChevronDown aria-hidden="true" className="size-4" />
          )}
        </button>

        {legendOpen && (
          <div id="fantasy-rail-map-legend" className="mt-1.5">
            <FantasyRailLegend compact />
          </div>
        )}
      </div>

      <Map
        initialViewState={{
          longitude: -118.2437,
          latitude: 34.0522,
          zoom: 9.5,
        }}
        mapStyle={
          baseMap === "satellite"
            ? SATELLITE_MAP_STYLE
            : COLORFUL_MAP_STYLE
        }
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
        maxBounds={REGIONAL_BOUNDS}
        // attributionControl={false}
      >
        <NavigationControl position="bottom-right" />
        {visibleLayers.pacificElectricEsri && (
          <PacificElectricEsriLayer />
        )}
        {visibleLayers.pacificElectric && (
          <PacificElectricLayer />
        )}

        {visibleLayers.losAngelesRailway && (
          <LosAngelesRailwayLayer />
        )}
        
        {visibleLayers.existingMetro && (
          <MetroLA2026 />
        )}

        {visibleLayers.metroProjects && (
          <ProposedMetroRail />
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
