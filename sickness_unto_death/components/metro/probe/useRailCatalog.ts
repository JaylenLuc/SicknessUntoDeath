"use client";

import { useEffect, useState } from "react";
import { buildRailCatalog, type RailCatalog, type RailData } from "@/lib/rail-explorer/catalog";
import { EXPLORER_SOURCES } from "./sources";

let cachedCatalog: RailCatalog | undefined;

export function useRailCatalog(enabled: boolean) {
  const [catalog, setCatalog] = useState<RailCatalog | null>(cachedCatalog ?? null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    if (cachedCatalog) { setCatalog(cachedCatalog); return; }
    const controller = new AbortController();
    setLoading(true);
    setErrors([]);
    async function load() {
      const results = await Promise.allSettled(EXPLORER_SOURCES.map(async (source) => {
        const response = await fetch(`/la-metro-rail/${source.file}`, { signal: controller.signal });
        if (!response.ok) throw new Error(`${source.label}: ${response.status}`);
        const data = await response.json() as RailData;
        if (data.type !== "FeatureCollection" || !Array.isArray(data.features)) throw new Error(`Invalid data for ${source.label}`);
        return { source, data };
      }));
      if (controller.signal.aborted) return;
      try {
        const loaded = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
        const failed = results.flatMap((result, i) => result.status === "rejected" ? [EXPLORER_SOURCES[i].label] : []);
        const next = loaded.length ? buildRailCatalog(loaded) : null;
        setCatalog(next);
        setErrors(failed);
        if (!failed.length && next) cachedCatalog = next;
      } catch (error) {
        console.error("Could not prepare rail probe", error);
        setErrors(["The route directory"]);
      } finally {
        setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [enabled, attempt]);

  return { catalog, loading, errors, retry: () => setAttempt((value) => value + 1) };
}
