"use client";

import { useEffect, useState } from "react";
import type { Position } from "geojson";
import type { RailFeatureCollection } from "@/lib/LAFantasyRail_util/LAFantasyRail";
import { smoothRailGeometry } from "@/lib/LAFantasyRail_util/smoothRailGeometry";
import { FANTASY_RAIL_NETWORKS } from "./fantasyRailNetworks";
import { RAIL_PROJECTS } from "./proposedMetroProjects";

type PreviewSource = {
  file: string;
  kind: "fantasy" | "metro" | "proposed";
};

type RouteShape = {
  id: string;
  path: string;
  color: string;
  dashed: boolean;
  double: boolean;
};

const INTER_URBES_SOURCES: PreviewSource[] = [
  { file: FANTASY_RAIL_NETWORKS.heavyRail.file, kind: "fantasy" },
  { file: "la-metro-rail.geojson", kind: "metro" },
  ...RAIL_PROJECTS.map(({ file }) => ({ file, kind: "proposed" as const })),
];

const INTRA_URBES_SOURCES: PreviewSource[] = [
  { file: FANTASY_RAIL_NETWORKS.lightRail.file, kind: "fantasy" },
];

const WIDTH = 800;
const HEIGHT = 600;
const PADDING = 28;

// Mercator keeps the geographic shapes and north-up orientation of the map.
function project([longitude, latitude]: Position): [number, number] {
  const radians = Math.PI / 180;
  return [longitude * radians, -Math.log(Math.tan(Math.PI / 4 + latitude * radians / 2))];
}

function createShapes(sources: { source: PreviewSource; data: RailFeatureCollection }[]): RouteShape[] {
  const lines = sources.flatMap(({ source, data }) => {
    const rendered = source.kind === "fantasy" ? smoothRailGeometry(data) : data;
    return rendered.features.flatMap((feature, featureIndex) => {
      const geometry = feature.geometry;
      if (geometry.type === "Point") return [];
      const parts = geometry.type === "LineString" ? [geometry.coordinates] : geometry.coordinates;
      const color = feature.properties?.color || feature.properties?.route_color || "#64748b";
      return parts.filter((part) => part.length > 1).map((part, partIndex) => ({
        id: `${source.file}-${featureIndex}-${partIndex}`,
        points: part.map(project),
        color: color.startsWith("#") ? color : `#${color}`,
        dashed: source.kind === "proposed",
        double: source.kind === "fantasy" && feature.properties?.service_type === "light_rail",
      }));
    });
  });
  if (lines.length === 0) throw new Error("No route geometry in network preview");

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const { points } of lines) {
    for (const [x, y] of points) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const scale = Math.min((WIDTH - 2 * PADDING) / (spanX || 1), (HEIGHT - 2 * PADDING) / (spanY || 1));
  const left = (WIDTH - spanX * scale) / 2;
  const top = (HEIGHT - spanY * scale) / 2;

  return lines.map(({ points, ...line }) => ({
    ...line,
    path: points.map(([x, y], index) =>
      `${index === 0 ? "M" : "L"}${((x - minX) * scale + left).toFixed(2)},${((y - minY) * scale + top).toFixed(2)}`,
    ).join(" "),
  }));
}

function NetworkPreview({
  id,
  title,
  description,
  sources,
}: {
  id: string;
  title: string;
  description: string;
  sources: PreviewSource[];
}) {
  const [shapes, setShapes] = useState<RouteShape[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const data = await Promise.all(sources.map(async (source) => {
          const response = await fetch(`/la-metro-rail/${source.file}`, { signal: controller.signal });
          if (!response.ok) throw new Error(`${source.file}: ${response.status}`);
          return { source, data: await response.json() as RailFeatureCollection };
        }));
        if (!controller.signal.aborted) setShapes(createShapes(data));
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error(`Could not load ${title} shapes:`, error);
          setFailed(true);
        }
      }
    }
    void load();
    return () => controller.abort();
  }, [sources, title, attempt]);

  return (
    <figure className="min-w-0 overflow-hidden rounded-lg border-2 border-dashed border-black/15 text-slate-900">
      <figcaption className="px-4 pt-4">
        <h2 id={`${id}-heading`} className="text-lg font-bold">{title}</h2>
        <p id={`${id}-description`} className="mt-1 text-xs text-slate-600">{description}</p>
      </figcaption>
      {shapes ? (
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="block aspect-[4/3] w-full"
          role="img"
          aria-labelledby={`${id}-heading ${id}-description`}
        >
          <title>{title} route shapes</title>
          <desc>Geographic route lines, without station markers, labels, or a basemap. Each network is fitted to its own frame.</desc>
          {shapes.map((shape) => (
            <g key={shape.id} fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path
                d={shape.path}
                stroke={shape.color}
                strokeWidth={shape.double ? 3 : 1.8}
                strokeDasharray={shape.dashed ? "6 4" : undefined}
                vectorEffect="non-scaling-stroke"
              />
              {shape.double && (
                <path d={shape.path} stroke="#faf9f6" strokeWidth={1} vectorEffect="non-scaling-stroke" />
              )}
            </g>
          ))}
        </svg>
      ) : (
        <div className="flex aspect-[4/3] flex-col items-center justify-center gap-3 px-4 text-center text-sm text-slate-600" role="status">
          {failed ? (
            <>
              <p>Could not load this network preview.</p>
              <button type="button" className="rounded border border-slate-400 px-3 py-1 underline" onClick={() => { setFailed(false); setAttempt((value) => value + 1); }}>
                Retry
              </button>
            </>
          ) : <p>Loading route shapes…</p>}
        </div>
      )}
    </figure>
  );
}

export default function RailNetworkShapes() {
  return (
    <section aria-label="Rail network shapes" className="mb-6 grid min-w-0 gap-4 lg:grid-cols-2">
      <NetworkPreview
        id="inter-urbes-shapes"
        title="Inter Urbes Map Schema"
        description="Fantasy heavy rail · Existing Metro · Proposed Metro (dashed)"
        sources={INTER_URBES_SOURCES}
      />
      <NetworkPreview
        id="intra-urbes-shapes"
        title="Intra Urbes Map Schema"
        description="Light rail / tram & streetcar"
        sources={INTRA_URBES_SOURCES}
      />
    </section>
  );
}
