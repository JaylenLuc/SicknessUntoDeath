"use client";

import { pinTraverserNode, toForceGraph, type TraverserNode, type TraverserLink } from "@/lib/gnostikos_util/util";
import type { sessionGraph } from "@/types/gnostikosTypes";
import { useCallback, useEffect, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";

type GraphHandle = {
  d3Force: (name: string, force: null) => unknown;
  zoom: { (): number; (scale: number): unknown };
  centerAt: { (): { x: number; y: number }; (x: number, y: number): unknown };
};
const COLORS = ["#7c3aed", "#167d91", "#b44979", "#bf6819", "#438044", "#466bc2", "#a52a2a"];
const ACTIVE_COLOR = COLORS.length - 1;
const FRAME_SIZE = 192;
const FRAME_COUNT = 4;

// Tint and thicken the shared artwork once, rather than applying filters to every
// node on every canvas repaint. The original station sprite stays unchanged.
function createNodeFrames(sprite: HTMLImageElement) {
  return COLORS.map((color) => Array.from({ length: FRAME_COUNT }, (_, frame) => {
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
    return canvas;
  }));
}

function nodeSize(id: number, cursor: number | null) {
  return id === cursor ? 28 : 18 + (Math.abs(id) % 3) * 2;
}

export default function TraverserGraph({ session }: { session: sessionGraph }) {
  const fgRef = useRef<GraphHandle | null>(null);
  const [graphData, setGraphData] = useState(() => toForceGraph(session));
  const graphDataRef = useRef(graphData);
  const pendingCamera = useRef<{ zoom: number; x: number; y: number } | null>(null);
  const [frames, setFrames] = useState<HTMLCanvasElement[][] | null>(null);
  const [reducedMotion, setReducedMotion] = useState(true);

  useEffect(() => {
    const previous = graphDataRef.current;
    const next = toForceGraph(session, previous);
    if (next === previous) return;
    const graph = fgRef.current;
    if (graph && previous.nodes.length && next.nodes.length) {
      pendingCamera.current = { zoom: graph.zoom(), ...graph.centerAt() };
    }
    graphDataRef.current = next;
    setGraphData(next);
  }, [session]);

  const restoreCamera = useCallback(() => {
    const camera = pendingCamera.current;
    const graph = fgRef.current;
    if (!camera || !graph) return;
    pendingCamera.current = null;
    graph.zoom(camera.zoom);
    graph.centerAt(camera.x, camera.y);
  }, []);

  useEffect(() => {
    // A centering force would pull new nodes toward the origin after a user has
    // arranged the graph elsewhere. Link and charge forces still place new nodes.
    fgRef.current?.d3Force("center", null);
  }, []);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = () => setReducedMotion(preference.matches);
    syncMotion();
    preference.addEventListener("change", syncMotion);
    const sprite = new Image();
    sprite.onload = () => setFrames(createNodeFrames(sprite));
    sprite.src = "/station_zoom_animations/station-probe-sprite.png";
    return () => {
      sprite.onload = null;
      preference.removeEventListener("change", syncMotion);
    };
  }, []);

  const drawNode = useCallback((node: TraverserNode, ctx: CanvasRenderingContext2D) => {
    if (node.x === undefined || node.y === undefined) return;
    const seed = Math.abs(node.id);
    const active = node.id === session.cursor;
    const size = nodeSize(node.id, session.cursor);
    const colorIndex = active ? ACTIVE_COLOR : seed % ACTIVE_COLOR;
    // Different phases, speeds, rotations, and mirrored frames keep the nodes
    // from moving in lockstep. Reduced motion keeps each node's distinct pose.
    const tick = reducedMotion ? 0 : Math.floor(performance.now() / (160 + (seed % 4) * 35));
    const frame = (tick + seed) % FRAME_COUNT;

    ctx.save();
    ctx.translate(node.x, node.y);
    if (frames) {
      ctx.rotate((seed % 12) * Math.PI / 6);
      ctx.scale(seed % 2 ? -1 : 1, 1);
      ctx.drawImage(frames[colorIndex][frame], -size / 2, -size / 2, size, size);
    } else {
      // Keep nodes visible and interactive while the sprite loads or if it fails.
      ctx.beginPath();
      ctx.arc(0, 0, active ? 7 : 4, 0, 2 * Math.PI);
      ctx.fillStyle = COLORS[colorIndex];
      ctx.fill();
    }
    ctx.restore();
  }, [frames, reducedMotion, session.cursor]);

  const paintHitArea = useCallback((node: TraverserNode, color: string, ctx: CanvasRenderingContext2D) => {
    if (node.x === undefined || node.y === undefined) return;
    // Fill the hollow center too, so the entire animated node remains draggable.
    ctx.beginPath();
    ctx.arc(node.x, node.y, nodeSize(node.id, session.cursor) / 2, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
  }, [session.cursor]);

  return (
    <div className="border-2 border-blue-500 border-dashed overflow-auto max-h-[80vh] max-w-[80vw] p-2">
      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        nodeLabel="label"
        nodeVal={(node: TraverserNode) => Math.pow(nodeSize(node.id, session.cursor) / 8, 2)}
        nodeCanvasObject={drawNode}
        nodePointerAreaPaint={paintHitArea}
        autoPauseRedraw={reducedMotion || !frames}
        linkDirectionalArrowLength={6}
        linkDirectionalArrowRelPos={1}
        cooldownTicks={500}
        d3VelocityDecay={0.1}
        // ForceGraph automatically zooms when the node count changes. Restore the
        // previous camera immediately, before that automatic change is painted.
        onZoom={restoreCamera}
        onEngineTick={restoreCamera}
        onNodeDragEnd={pinTraverserNode}
        onEngineStop={() => {
          graphData.nodes.forEach(pinTraverserNode);
        }}
        linkLabel={(link: TraverserLink) => `step ${link.step}`}
      />
    </div>
  );
}
