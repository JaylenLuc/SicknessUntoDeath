"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import Image from "next/image";
import Map, {
  Layer,
  NavigationControl,
  Source,
  type MapRef,
} from "react-map-gl/maplibre";
import {
  setWorkerUrl,
  type Map as MapLibreMap,
} from "maplibre-gl";

import { Button } from "@/components/retroui/Button";
import { Text } from "@/components/retroui/Text";
import {
  createTrainAnimator,
  type RailFeatureCollection,
  type TrainFeatureCollection,
} from "@/lib/LAFantasyRail_util/LAFantasyRail";
import { smoothRailGeometry } from "@/lib/LAFantasyRail_util/smoothRailGeometry";

import MetroLA2026 from "./2026LAMetro";
import TrainMarker from "./TrainMarker";
import PacificElectricLayer from "./PEMap";
import PacificElectricEsriLayer from "./PEEsriMap";
import { PE_ESRI_DESCRIPTION, PE_ESRI_LABEL } from "./peEsriStyle";
import LosAngelesRailwayLayer from "./LARYMap";
import ProposedMetroRail from "./ProposedMetroRail";
import FantasyRailLegend from "./FantasyRailLegend";
import RailEmblem from "./RailEmblem";
import { FANTASY_RAIL_NETWORKS, INTRA_URBES_SERVICE_LABELS, TRAM_LINE_STYLE, type FantasyRailNetwork } from "./fantasyRailNetworks";
import RailProbeSidebar from "./probe/RailProbeSidebar";
import RailProbeFocus from "./probe/RailProbeFocus";
import StationAnimation from "./probe/StationAnimation";
import { useRailCatalog } from "./probe/useRailCatalog";
import { getFocusData, resolveMapSelection, type RailSelection } from "@/lib/rail-explorer/catalog";
import probeStyles from "./probe/RailProbe.module.css";
// import UserEditLayer from "./UserEditLayer";

setWorkerUrl("/maplibre-gl-worker.mjs");

function updateTrainScale(map: MapLibreMap) {
  // Keep the regional view uncluttered, with more detail at street level.
  const scale = Math.min(0.95, Math.max(0.45, 0.65 + (map.getZoom() - 9.5) * 0.075));
  map.getContainer().style.setProperty("--train-marker-scale", String(scale));
}

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
  heavyRail: boolean;
  lightRail: boolean;
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
      <span aria-hidden="true" className="flex h-5 w-5 shrink-0 items-center justify-center">
        {active ? <StationAnimation size={20} /> : "○"}
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

function FantasyTrains({ railData, label, network }: { railData: RailFeatureCollection; label: string; network: FantasyRailNetwork }) {
  const [trains, setTrains] = useState<TrainFeatureCollection>({
    type: "FeatureCollection",
    features: [],
  });

  useEffect(() => {
    const animateAt = createTrainAnimator(railData);
    const initialTrains = animateAt(0);
    if (initialTrains.features.length === 0) return;
    const startedAt = performance.now();
    setTrains(initialTrains);
    const timer = window.setInterval(() => {
      setTrains(animateAt(performance.now() - startedAt));
    }, 100);
    return () => window.clearInterval(timer);
  }, [railData]);

  return (
    <>
      {trains.features.map((train, index) => (
        <TrainMarker
          key={index}
          train={train}
          variant={network === "lightRail" ? "tram" : "train"}
          label={[
            network === "lightRail"
              ? `Intra Urbes — ${INTRA_URBES_SERVICE_LABELS[train.properties.service_type === "light_rail" ? "light_rail" : "streetcar"]}`
              : label,
            train.properties.route_id,
            train.properties.route_name,
          ].filter(Boolean).join(" · ")}
        />
      ))}
    </>
  );
}

function FantasyNetwork({ network }: { network: FantasyRailNetwork }) {
  const config = FANTASY_RAIL_NETWORKS[network];
  const [railData, setRailData] = useState<RailFeatureCollection | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function loadRoutes() {
      try {
        const response = await fetch(`/la-metro-rail/${config.file}`, { signal: controller.signal });
        if (!response.ok) throw new Error(`${config.label} request failed: ${response.status}`);
        const data = (await response.json()) as RailFeatureCollection;
        if (!controller.signal.aborted) setRailData(smoothRailGeometry(data));
      } catch (error) {
        if (!controller.signal.aborted) console.error(`Could not load ${config.label} routes:`, error);
      }
    }
    void loadRoutes();
    return () => controller.abort();
  }, [config.file, config.label]);

  if (!railData) return null;

  return (
    <>
      <Source
        id={`${config.id}-source`}
        type="geojson"
        data={railData}
        tolerance={0.1}
        attribution={"attribution" in config ? config.attribution : undefined}
      >
        <Layer
          id={`${config.id}-casing`}
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
            "line-opacity": 0.85,
            "line-width": [
              "interpolate",
              ["linear"],
              ["zoom"],
              8,
              network === "lightRail"
                ? ["case", ["==", ["get", "service_type"], "light_rail"], TRAM_LINE_STYLE.casingWidth[0], config.casingWidth[0]]
                : config.casingWidth[0],
              13,
              network === "lightRail"
                ? ["case", ["==", ["get", "service_type"], "light_rail"], TRAM_LINE_STYLE.casingWidth[1], config.casingWidth[1]]
                : config.casingWidth[1],
            ],
          }}
        />

        <Layer
          id={`${config.id}-lines`}
          type="line"
          filter={network === "lightRail" ? [
            "all",
            ["==", ["geometry-type"], "LineString"],
            ["!=", ["get", "service_type"], "light_rail"],
          ] : [
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
              config.lineWidth[0],
              13,
              config.lineWidth[1],
            ],
          }}
        />

        {network === "lightRail" && ([-1, 1] as const).map((side) => (
          <Layer
            key={side}
            id={`${config.id}-tram-${side === -1 ? "left" : "right"}`}
            type="line"
            filter={[
              "all",
              ["==", ["geometry-type"], "LineString"],
              ["==", ["get", "service_type"], "light_rail"],
            ]}
            layout={{ "line-cap": "round", "line-join": "round" }}
            paint={{
              "line-color": ["coalesce", ["get", "color"], "#e11d48"],
              "line-width": ["interpolate", ["linear"], ["zoom"], 8, TRAM_LINE_STYLE.lineWidth[0], 13, TRAM_LINE_STYLE.lineWidth[1]],
              "line-offset": ["interpolate", ["linear"], ["zoom"], 8, side * TRAM_LINE_STYLE.lineOffset[0], 13, side * TRAM_LINE_STYLE.lineOffset[1]],
            }}
          />
        ))}

        <Layer
          id={`${config.id}-route-labels`}
          type="symbol"
          minzoom={9.5}
          filter={["==", ["geometry-type"], "LineString"]}
          layout={{
            "symbol-placement": "line",
            "symbol-spacing": 500,
            "text-field": ["get", "name"],
            "text-size": ["interpolate", ["linear"], ["zoom"], 9.5, 10, 13, 12],
            "text-offset": [0, -0.9],
            "text-padding": 8,
            "text-rotation-alignment": "map",
            "text-keep-upright": true,
            "text-allow-overlap": false,
          }}
          paint={{
            "text-color": "#334155",
            "text-halo-color": "#ffffff",
            "text-halo-width": 1.5,
            "text-halo-blur": 0.5,
          }}
        />

        {network === "lightRail" ? (
          <Layer
            id={`${config.id}-stations`}
            type="circle"
            filter={["==", ["geometry-type"], "Point"]}
            paint={{
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 0.8, 13, 2.5, 16, 3],
              "circle-color": "#ffffff",
              "circle-stroke-color": ["coalesce", ["get", "color"], config.stationColor],
              "circle-stroke-width": 1,
            }}
          />
        ) : (
          <Layer
            id={`${config.id}-stations`}
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
                1,
                13,
                3.25,
                16,
                4,
              ],
              "circle-color": "#ffffff",
              "circle-stroke-color": ["coalesce", ["get", "color"], config.stationColor],
              "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 8, 0.8, 13, 1.5],
            }}
          />
        )}

        <Layer
          id={`${config.id}-labels`}
          type="symbol"
          minzoom={11}
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
      <FantasyTrains railData={railData} label={config.trainLabel} network={network} />
    </>
  );
}

export default function FantasyRailMap() {
  const mapRef = useRef<MapRef>(null);
  const previousCamera = useRef<{ center: [number, number]; zoom: number; bearing: number; pitch: number } | null>(null);
  const [probeOpen, setProbeOpen] = useState(false);
  const [selection, setSelection] = useState<RailSelection>(null);
  const [isolatedRouteId, setIsolatedRouteId] = useState<string | null>(null);
  const isolated = isolatedRouteId !== null;
  const { catalog, loading, errors, retry } = useRailCatalog(probeOpen);
  const showingOnlySelection = probeOpen && isolated && selection !== null && catalog !== null;
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
      heavyRail: true,
      lightRail: true,
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

  function selectItem(next: NonNullable<RailSelection>) {
    if (!catalog) return;
    const map = mapRef.current?.getMap();
    setSelection(next);
    if (isolated && next.kind === "route") setIsolatedRouteId(next.id);
    if (!map) return;
    if (!previousCamera.current) previousCamera.current = { center: map.getCenter().toArray(), zoom: map.getZoom(), bearing: map.getBearing(), pitch: map.getPitch() };
    const mobile = window.matchMedia("(max-width: 700px)").matches;
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 650;
    const height = map.getContainer().clientHeight;
    if (next.kind === "station") {
      const station = catalog.stations.find((s) => s.id === next.id);
      if (station) map.flyTo({ center: station.coordinates, zoom: 15, offset: mobile ? [0, height * 0.2] : [150, 0], duration });
    } else {
      const data = getFocusData(catalog, next);
      const coordinates = data.features.flatMap((feature) => feature.geometry.type === "Point" ? [feature.geometry.coordinates] : feature.geometry.type === "LineString" ? feature.geometry.coordinates : feature.geometry.coordinates.flat());
      if (coordinates.length) {
        const longitudes = coordinates.map((c) => c[0]), latitudes = coordinates.map((c) => c[1]);
        map.fitBounds([[Math.min(...longitudes), Math.min(...latitudes)], [Math.max(...longitudes), Math.max(...latitudes)]], {
          padding: { top: mobile ? height * 0.42 + 65 : 60, bottom: 40, left: mobile ? 25 : 330, right: 35 }, maxZoom: 15, duration,
        });
      }
    }
  }

  function clearSelection() {
    setSelection(null);
    setIsolatedRouteId(null);
    if (previousCamera.current) {
      mapRef.current?.easeTo({ ...previousCamera.current, padding: { top: 0, bottom: 0, left: 0, right: 0 }, duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 450 });
      previousCamera.current = null;
    }
  }

  function closeProbe() { clearSelection(); setProbeOpen(false); }

  function toggleIsolation() {
    if (isolated) setIsolatedRouteId(null);
    else if (selection?.kind === "route") setIsolatedRouteId(selection.id);
  }

  return (
    <div className="relative h-full w-full">
      <div className={probeStyles.toggle} aria-expanded={probeOpen} aria-controls={probeOpen ? "rail-probe-sidebar" : undefined} onClick={() => probeOpen ? closeProbe() : setProbeOpen(true)}>
        <Image src="/mindBlown/MOONGif2.gif" alt="" width={32} height={32} unoptimized className={probeStyles.probeMoon} />
      </div>
      {probeOpen && <RailProbeSidebar catalog={catalog} selection={selection} isolated={isolated} loading={loading} errors={errors} onRetry={retry} onSelect={selectItem} onClear={clearSelection} onIsolate={toggleIsolation} onClose={closeProbe} />}
      {!probeOpen && <div className="absolute left-1.5 top-1.5 z-10 max-h-[calc(100%-0.75rem)] w-36 overflow-y-auto overscroll-contain border-2 border-black bg-white p-1.5
      shadow-[4px_4px_0_#000] sm:left-2 sm:top-2 sm:max-h-[calc(100%-1rem)] sm:w-44 sm:p-2 lg:left-4 lg:top-4 lg:max-h-[calc(100%-2rem)] lg:w-56 lg:p-3">
        <RailEmblem
          className="mx-auto mb-2 w-16 sm:w-20 lg:w-24"
          sizes="(min-width: 1024px) 96px, (min-width: 640px) 80px, 64px"
        />
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
              active={visibleLayers.heavyRail}
              label={FANTASY_RAIL_NETWORKS.heavyRail.label}
              description={FANTASY_RAIL_NETWORKS.heavyRail.description}
              colorClassName="bg-rose-100 hover:bg-rose-200"
              onClick={() => toggleLayer("heavyRail")}
            />
            <LayerToggleButton
              active={visibleLayers.lightRail}
              label={FANTASY_RAIL_NETWORKS.lightRail.label}
              description={FANTASY_RAIL_NETWORKS.lightRail.description}
              colorClassName="bg-emerald-100 hover:bg-emerald-200"
              onClick={() => toggleLayer("lightRail")}
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
      </div>}

      <Map
        ref={mapRef}
        onClick={(event) => {
          if (!probeOpen || !catalog) return;
          const map = event.target;
          const sources = new Set([...catalog.sources.map((source) => source.mapSource), "rail-probe-focus", "rail-probe-selected-station"]);
          const layerIds = (map.getStyle().layers ?? []).filter((layer) => "source" in layer && typeof layer.source === "string" && sources.has(layer.source)).map((layer) => layer.id);
          if (!layerIds.length) return;
          const { x, y } = event.point;
          const features = map.queryRenderedFeatures([[x - 6, y - 6], [x + 6, y + 6]], { layers: layerIds });
          features.sort((a, b) => Number(b.geometry.type === "Point") - Number(a.geometry.type === "Point"));
          for (const feature of features) {
            const next = resolveMapSelection(catalog, feature.source, feature.properties, feature.geometry);
            if (next) { selectItem(next); break; }
          }
        }}
        onLoad={({ target }) => updateTrainScale(target)}
        onZoom={({ target }) => updateTrainScale(target)}
        initialViewState={{
          longitude: -118.2437,
          latitude: 34.0522,
          zoom: 11.5,
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
        {!showingOnlySelection && visibleLayers.pacificElectricEsri && (
          <PacificElectricEsriLayer />
        )}
        {!showingOnlySelection && visibleLayers.pacificElectric && (
          <PacificElectricLayer />
        )}

        {!showingOnlySelection && visibleLayers.losAngelesRailway && (
          <LosAngelesRailwayLayer />
        )}
        
        {!showingOnlySelection && visibleLayers.existingMetro && (
          <MetroLA2026 />
        )}

        {!showingOnlySelection && visibleLayers.metroProjects && (
          <ProposedMetroRail />
        )}

        {!showingOnlySelection && visibleLayers.heavyRail && (
          <FantasyNetwork network="heavyRail" />
        )}
        {!showingOnlySelection && visibleLayers.lightRail && (
          <FantasyNetwork network="lightRail" />
        )}
        {probeOpen && catalog && selection && <RailProbeFocus catalog={catalog} selection={selection} isolated={showingOnlySelection} isolatedRouteId={isolatedRouteId} />}

        {/* {visibleLayers.userDraft && (
          <UserEditLayer />
        )} */}
      </Map>
    </div>
  );
}
