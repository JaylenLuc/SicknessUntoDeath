import React from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import useStationNodeAnimation, { stationNodeSize } from '@/components/animations/useStationNodeAnimation';

interface ForceGraphProps {
  graphData: any;
}

export default function ForceGraph({ graphData }: ForceGraphProps) {
  const { drawAnimation, autoPauseRedraw } = useStationNodeAnimation();
  const isStatic = graphData.nodes?.every(
    (node: { fx?: number; fy?: number }) =>
      Number.isFinite(node.fx) && Number.isFinite(node.fy),
  );

  return (
    <ForceGraph2D
      graphData={graphData}
      autoPauseRedraw={autoPauseRedraw}
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
      nodeVal={(node: { id: string }) => Math.pow(stationNodeSize(node.id) / 8, 2)}
      nodeCanvasObject={(node: { name: string; id: string; x: number; y: number; color: string; }, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const label = node.name || node.id || "";
        const fontSize = 12 / globalScale;
        const radius = stationNodeSize(node.id) / 2;
        const gap = 5 / globalScale;
        const horizontalPadding = 5 / globalScale;
        const verticalPadding = 3 / globalScale;

        ctx.save();
        const drawn = drawAnimation(ctx, {
          id: node.id, x: node.x, y: node.y,
          size: radius * 2, color: node.color || "#7c3aed",
        });
        if (!drawn) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, 7 / globalScale, 0, 2 * Math.PI);
          ctx.fillStyle = node.color || "#7c3aed";
          ctx.fill();
        }

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

      }}
      nodePointerAreaPaint={(node: { name: string; id: string; x: number; y: number; }, color: string, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const radius = stationNodeSize(node.id) / 2;
        ctx.save();
        ctx.font = `bold ${12 / globalScale}px Courier New`;
        const labelWidth = ctx.measureText(node.name || node.id || "").width + 10 / globalScale;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillRect(node.x + radius + 5 / globalScale, node.y - 9 / globalScale, labelWidth, 18 / globalScale);
        ctx.restore();
      }}
    />
  );
}
