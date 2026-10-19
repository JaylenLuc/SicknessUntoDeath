import React from 'react';
import ForceGraph2D from 'react-force-graph-2d';

interface ForceGraphProps {
  graphData: any;
}

export default function ForceGraph({ graphData }: ForceGraphProps) {
  const isStatic = graphData.nodes?.every(
    (node: { fx?: number; fy?: number }) =>
      Number.isFinite(node.fx) && Number.isFinite(node.fy),
  );

  return (
    <ForceGraph2D
      graphData={graphData}
      minZoom={0.5}
      maxZoom={5}
      width={450}   
      height={450}   
      cooldownTicks={isStatic ? 0 : 100}
      d3AlphaDecay={0.04}
      enableNodeDrag={!isStatic}
      linkWidth={(link: { similarity?: number }) =>
        link.similarity === undefined
          ? 1
          : 0.75 + Math.max(0, link.similarity) * 3
      }
      nodeAutoColorBy="group"
      nodeCanvasObject={(node: { name: string; id: string; x: number; y: number; color: string; }, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const label = node.name || node.id || "";
        const fontSize = 12 / globalScale;
        const radius = 7 / globalScale;
        const gap = 5 / globalScale;
        const horizontalPadding = 5 / globalScale;
        const verticalPadding = 3 / globalScale;

        ctx.save();
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = node.color || "#7c3aed";
        ctx.shadowColor = "rgba(15, 23, 42, 0.3)";
        ctx.shadowBlur = 5 / globalScale;
        ctx.fill();
        ctx.shadowColor = "transparent";
        ctx.lineWidth = 2 / globalScale;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
        ctx.stroke();

        ctx.font = `bold ${fontSize}px Courier New`;
        const textWidth = ctx.measureText(label).width;
        const labelX = node.x + radius + gap;
        const labelY = node.y - fontSize / 2 - verticalPadding;
        const labelWidth = textWidth + horizontalPadding * 2;
        const labelHeight = fontSize + verticalPadding * 2;

        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.fillRect(labelX, labelY, labelWidth, labelHeight);

        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#111827";
        ctx.fillText(label, labelX + horizontalPadding, node.y);
        ctx.restore();

        (node as any).__hitRadius = radius + gap + labelWidth;
      }}
      nodePointerAreaPaint={(node: { x: number; y: number; }, color: string, ctx: CanvasRenderingContext2D) => {
        ctx.fillStyle = color;
        const hitRadius = (node as any).__hitRadius ?? 10;
        ctx.fillRect(node.x - 8, node.y - 8, hitRadius + 8, 16);
      }}
    />
  );
}
