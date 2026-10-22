"use client";

import { useEffect, useId, useState } from "react";
import type { FeatureCollection, GeoJsonProperties, Geometry } from "geojson";
import { RAIL_PROJECTS } from "./proposedMetroProjects";

type FantasyLegendLine = {
  id: string;
  routeId: string;
  name: string;
  color: string;
  textColor?: string;
};

type LegendGroups = {
  existing: FantasyLegendLine[];
  proposed: FantasyLegendLine[];
  fantasy: FantasyLegendLine[];
};

type FantasyRailLegendProps = {
  compact?: boolean;
  animateOnHover?: boolean;
};

function badgeTextColor(background: string) {
  const hex = background.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(hex)) return "#ffffff";

  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000;
  return luminance > 155 ? "#111827" : "#ffffff";
}

function proposedStatusLabel(status: unknown) {
  switch (status) {
    case "under_construction":
      return "Under construction";
    case "pre_construction":
      return "Pre-construction";
    case "design":
      return "Design";
    case "planning":
      return "Planned";
    case "future":
      return "Future / unfunded";
    default:
      return "Proposed";
  }
}

export default function FantasyRailLegend({
  compact = false,
  animateOnHover = false,
}: FantasyRailLegendProps) {
  const headingId = useId();
  const [colorAnimationMode, setColorAnimationMode] = useState<
    "idle" | "active" | "paused"
  >("idle");
  const [groups, setGroups] = useState<LegendGroups>({
    existing: [],
    proposed: [],
    fantasy: [],
  });

  useEffect(() => {
    let cancelled = false;

    async function loadLegend() {
      try {
        const [fantasyResponse, existingResponse, ...proposedResponses] = await Promise.all([
          fetch("/la-metro-rail/fantasy-layer.geojson"),
          fetch("/la-metro-rail/la-metro-rail.geojson"),
          ...RAIL_PROJECTS.map((project) =>
            fetch(`/la-metro-rail/${project.file}`),
          ),
        ]);
        const failedProposedResponse = proposedResponses.find(
          (response) => !response.ok,
        );
        if (!fantasyResponse.ok || !existingResponse.ok || failedProposedResponse) {
          throw new Error(
            `Rail legend request failed: fantasy ${fantasyResponse.status}, existing ${existingResponse.status}, proposed ${failedProposedResponse?.status ?? "ok"}`,
          );
        }

        const fantasyData = (await fantasyResponse.json()) as FeatureCollection<
          Geometry,
          GeoJsonProperties
        >;
        const existingData = (await existingResponse.json()) as FeatureCollection<
          Geometry,
          GeoJsonProperties
        >;
        const proposedData = await Promise.all(
          proposedResponses.map(
            async (response) =>
              (await response.json()) as FeatureCollection<
                Geometry,
                GeoJsonProperties
              >,
          ),
        );
        const seenLineIds = new Set<string>();
        const fantasyLines = fantasyData.features.flatMap((feature) => {
          if (feature.geometry.type !== "LineString") return [];

          const properties = feature.properties;
          const id = typeof properties?.id === "string" ? properties.id : "";
          const name = typeof properties?.name === "string" ? properties.name : "";
          const routeId =
            typeof properties?.routeId === "string" ? properties.routeId : "";
          const color =
            typeof properties?.color === "string" ? properties.color : "#6b7280";

          if (!id || !name || !routeId || seenLineIds.has(id)) return [];
          seenLineIds.add(id);
          return [{ id, name, routeId, color }];
        });

        const existingLines = existingData.features.flatMap((feature) => {
          if (feature.geometry.type !== "MultiLineString") return [];

          const properties = feature.properties;
          const routeNumber =
            typeof properties?.route_id === "string" ? properties.route_id : "";
          const name =
            typeof properties?.route_long_name === "string"
              ? properties.route_long_name
              : "";
          const routeId = name.match(/Metro ([A-Z]) Line/)?.[1] ?? "?";
          const color =
            typeof properties?.route_color === "string"
              ? properties.route_color
              : "#6b7280";
          const textColor =
            typeof properties?.route_text_color === "string"
              ? properties.route_text_color
              : badgeTextColor(color);

          if (!routeNumber || !name) return [];
          return [{
            id: `existing-${routeNumber}`,
            name,
            routeId,
            color,
            textColor,
          }];
        });

        const proposedLines = proposedData.flatMap((data, projectIndex) => {
          const project = RAIL_PROJECTS[projectIndex];
          const seenProjectLines = new Set<string>();

          return data.features.flatMap((feature) => {
            if (feature.geometry.type !== "LineString") return [];

            const properties = feature.properties;
            const name =
              typeof properties?.route_long_name === "string"
                ? properties.route_long_name
                : project.sourceLabel;
            const status = proposedStatusLabel(properties?.status);
            const color =
              typeof properties?.route_color === "string"
                ? properties.route_color
                : "#64748b";
            const textColor =
              typeof properties?.route_text_color === "string"
                ? properties.route_text_color
                : badgeTextColor(color);
            const lineKey = `${name}-${status}`;

            if (seenProjectLines.has(lineKey)) return [];
            seenProjectLines.add(lineKey);

            return [{
              id: `proposed-${project.id}-${lineKey}`,
              name: `${name} (${status})`,
              routeId: project.legendRouteId,
              color,
              textColor,
            }];
          });
        });

        if (!cancelled) {
          setGroups({
            existing: existingLines,
            proposed: proposedLines,
            fantasy: fantasyLines,
          });
        }
      } catch (error) {
        console.error("Could not build fantasy rail legend:", error);
      }
    }

    void loadLegend();
    return () => {
      cancelled = true;
    };
  }, []);

  if (
    groups.existing.length === 0 &&
    groups.proposed.length === 0 &&
    groups.fantasy.length === 0
  ) return null;

  const renderLines = (lines: FantasyLegendLine[]) => (
    <div
      className={
        compact
          ? "grid grid-cols-1 gap-1.5"
          : "grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3"
      }
    >
      {lines.map((line) => (
        <div
          key={line.id}
          className={compact ? "flex min-w-0 items-center gap-1.5" : "flex min-w-0 items-center gap-3"}
        >
          <span
            aria-hidden="true"
            className={[
              "flex shrink-0 items-center justify-center rounded-full border-2 border-black font-bold leading-none",
              compact
                ? "size-6 text-[7px] shadow-[1px_1px_0_#000]"
                : "size-9 text-[10px] shadow-[2px_2px_0_#000]",
            ].join(" ")}
            style={{
              backgroundColor: line.color,
              color: line.textColor ?? badgeTextColor(line.color),
            }}
          >
            {line.routeId}
          </span>
          <span className={compact ? "text-[10px] font-bold leading-tight" : "text-sm font-bold leading-tight"}>
            {line.name}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <section
      aria-labelledby={headingId}
      aria-pressed={animateOnHover ? colorAnimationMode === "active" : undefined}
      role={animateOnHover ? "button" : undefined}
      tabIndex={animateOnHover ? 0 : undefined}
      onClick={
        animateOnHover
          ? () =>
              setColorAnimationMode((mode) =>
                mode === "active" ? "paused" : "active",
              )
          : undefined
      }
      onMouseLeave={
        animateOnHover
          ? () =>
              setColorAnimationMode((mode) =>
                mode === "paused" ? "idle" : mode,
              )
          : undefined
      }
      onBlur={
        animateOnHover
          ? () =>
              setColorAnimationMode((mode) =>
                mode === "paused" ? "idle" : mode,
              )
          : undefined
      }
      onKeyDown={
        animateOnHover
          ? (event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              setColorAnimationMode((mode) =>
                mode === "active" ? "paused" : "active",
              );
            }
          : undefined
      }
      className={[
        "border-2 border-black bg-yellow-100",
        compact
          ? "p-2"
          : "mt-5 p-4 shadow-[4px_4px_0_#000]",
        animateOnHover ? "rail-legend-color-cycle cursor-pointer" : "",
        colorAnimationMode === "active" ? "rail-legend-color-cycle-active" : "",
        colorAnimationMode === "paused" ? "rail-legend-color-cycle-paused" : "",
      ].join(" ")}
    >
      <h2 id={headingId} className={compact ? "text-xs font-bold" : "text-lg font-bold"}>
        Rail Line Legend
      </h2>

      {groups.existing.length > 0 && (
        <div className={compact ? "mt-2" : "mt-3"}>
          <h3 className={compact ? "mb-1 border-b border-black pb-0.5 text-[9px] font-bold uppercase" : "mb-2 border-b-2 border-black pb-1 text-sm font-bold uppercase tracking-wide"}>
            Existing LA Metro
          </h3>
          {renderLines(groups.existing)}
        </div>
      )}

      {groups.proposed.length > 0 && (
        <div className={compact ? "mt-3" : "mt-5"}>
          <h3 className={compact ? "mb-1 border-b border-black pb-0.5 text-[9px] font-bold uppercase" : "mb-2 border-b-2 border-black pb-1 text-sm font-bold uppercase tracking-wide"}>
            Proposed Metro Projects
          </h3>
          {renderLines(groups.proposed)}
        </div>
      )}

      {groups.fantasy.length > 0 && (
        <div className={compact ? "mt-3" : "mt-5"}>
          <h3 className={compact ? "mb-1 border-b border-black pb-0.5 text-[9px] font-bold uppercase" : "mb-2 border-b-2 border-black pb-1 text-sm font-bold uppercase tracking-wide"}>
            Fantasy Network
          </h3>
          {renderLines(groups.fantasy)}
        </div>
      )}
    </section>
  );
}
