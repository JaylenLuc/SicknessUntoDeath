"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const FRAME_SIZE = 192;
const FRAME_COUNT = 4;

function seedFor(id: string | number) {
  if (typeof id === "number") return Math.abs(id);
  let seed = 0;
  for (let i = 0; i < id.length; i++) seed = (Math.imul(seed, 31) + id.charCodeAt(i)) >>> 0;
  return seed;
}

export function stationNodeSize(id: string | number, active = false) {
  return active ? 28 : 18 + (seedFor(id) % 3) * 2;
}

function tintFrames(sprite: HTMLImageElement, color: string) {
  return Array.from({ length: FRAME_COUNT }, (_, frame) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = FRAME_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas;
    for (const [dx, dy] of [[0, 0], [-4, 0], [4, 0], [0, -4], [0, 4]]) {
      ctx.drawImage(sprite, frame * FRAME_SIZE, 0, FRAME_SIZE, FRAME_SIZE, dx, dy, FRAME_SIZE, FRAME_SIZE);
    }
    ctx.globalCompositeOperation = "source-in";
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, FRAME_SIZE, FRAME_SIZE);
    // Darken the colored outline while preserving its hue and transparent center.
    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.fillRect(0, 0, FRAME_SIZE, FRAME_SIZE);
    return canvas;
  });
}

export default function useStationNodeAnimation() {
  const [sprite, setSprite] = useState<HTMLImageElement | null>(null);
  const [reducedMotion, setReducedMotion] = useState(true);
  // Reuse prepared frames for every node in the same cluster/color.
  const coloredFrames = useMemo(() => new Map<string, HTMLCanvasElement[]>(), []);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = () => setReducedMotion(preference.matches);
    syncMotion();
    preference.addEventListener("change", syncMotion);
    const image = new Image();
    image.onload = () => setSprite(image);
    image.src = "/station_zoom_animations/station-probe-sprite.png";
    return () => {
      image.onload = null;
      preference.removeEventListener("change", syncMotion);
    };
  }, []);

  const drawAnimation = useCallback((ctx: CanvasRenderingContext2D, node: {
    id: string | number; x: number; y: number; size: number; color: string;
  }) => {
    if (!sprite) return false;
    let frames = coloredFrames.get(node.color);
    if (!frames) {
      frames = tintFrames(sprite, node.color);
      coloredFrames.set(node.color, frames);
    }
    const seed = seedFor(node.id);
    const tick = reducedMotion ? 0 : Math.floor(performance.now() / (160 + (seed % 4) * 35));
    ctx.save();
    ctx.translate(node.x, node.y);
    ctx.rotate((seed % 12) * Math.PI / 6);
    ctx.scale(seed % 2 ? -1 : 1, 1);
    ctx.drawImage(frames[(tick + seed) % FRAME_COUNT], -node.size / 2, -node.size / 2, node.size, node.size);
    ctx.restore();
    return true;
  }, [sprite, coloredFrames, reducedMotion]);

  return { drawAnimation, autoPauseRedraw: reducedMotion || !sprite };
}
