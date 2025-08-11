/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import ForceGraph2D from 'react-force-graph-2d';

interface ForceGraphProps {
  graphData: any;
}

export default function ForceGraph({ graphData }: ForceGraphProps) {
  return (
    <ForceGraph2D
      graphData={graphData}
      minZoom={0.5}
      maxZoom={5}
      width={450}   
      height={450}   
      nodeAutoColorBy="group"
      nodeCanvasObject={(node: { name: any; id: any; x: number; y: number; color: string; }, ctx: any, globalScale: number) => {
        const label = node.name || node.id || ""; // your node label key here
        const fontSize = 12 / globalScale;
        ctx.font = `${fontSize}px Courier New`;
        const textWidth = ctx.measureText(label).width;
        const bckgDimensions : number[] = [textWidth as number, fontSize as number].map(
          (n) => n + fontSize * 0.2
        ); // padding
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        ctx.fillRect(
          node.x - bckgDimensions[0] / 2,
          node.y - bckgDimensions[1] / 2,
        ...bckgDimensions
        );

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = node.color || "black";
        ctx.fillText(label, node.x, node.y);

        (node as any).__bckgDimensions = bckgDimensions;
      }}
      nodePointerAreaPaint={(node: { x: number; y: number; }, color: any, ctx: any) => {
        ctx.fillStyle = color;
        const bckgDimensions = (node as any).__bckgDimensions;
        if (bckgDimensions) {
          ctx.fillRect(
            node.x - bckgDimensions[0] / 2,
            node.y - bckgDimensions[1] / 2,
            ...bckgDimensions
          );
        }
      }}
    />
  );
}
