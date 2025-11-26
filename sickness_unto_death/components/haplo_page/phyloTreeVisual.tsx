import * as d3 from 'd3';
import { useEffect, useRef } from 'react';
import { node } from '@/types/haplogroupClassifierTypes';
// ...existing code...
export const D3PhyloTree = ({ phyloTree }: { phyloTree: node | null }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!phyloTree || !svgRef.current) return;

    const baseWidth = 1200;
    const baseHeight = 800;
    const margin = { top: 10, right: 10, bottom: 10, left: 10 };
    const nodeSeparationX = 30;  // vertical spacing between levels
    const nodeSeparationY = 90; // horizontal spacing between siblings / depth

    // clear previous drawing
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // use nodeSize to force spacing
    const treeLayout = d3.tree<d3.HierarchyPointNode<node>>().nodeSize([nodeSeparationX, nodeSeparationY]);

    const root = d3.hierarchy<node>(phyloTree);
    treeLayout(root as any); 

    // compute extents to size the svg properly
    const xMin = d3.min(root.descendants(), d => d.x) ?? 0;
    const xMax = d3.max(root.descendants(), d => d.x) ?? baseHeight;
    const yMin = d3.min(root.descendants(), d => d.y) ?? 0;
    const yMax = d3.max(root.descendants(), d => d.y) ?? baseWidth;

    const svgWidth = Math.max(baseWidth, yMax - yMin + margin.left + margin.right);
    const svgHeight = Math.max(baseHeight, xMax - xMin + margin.top + margin.bottom);

    svg
      .attr('width', svgWidth)
      .attr('height', svgHeight)
      .attr('viewBox', `0 0 ${svgWidth} ${svgHeight}`);

    // group offset so all coords are positive
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left - yMin}, ${margin.top - xMin})`);

    // links
    g.selectAll('line.link')
      .data(root.links())
      .enter()
      .append('line')
      .classed('link', true)
      .attr('x1', d => (d.source.y ?? 0))
      .attr('y1', d => (d.source.x ?? 0))
      .attr('x2', d => (d.target.y ?? 0))
      .attr('y2', d => (d.target.x ?? 0))
      .attr('stroke', '#999')
      .attr('stroke-width', 1.5);

    // nodes
    const nodeGroup = g.selectAll('g.node')
      .data(root.descendants())
      .enter()
      .append('g')
      .classed('node', true)
      .attr('transform', d => `translate(${d.y}, ${d.x})`);

    nodeGroup.append('circle')
      .attr('r', 6)
      .attr('fill', '#9c6644');

    nodeGroup.append('text')
      .attr('x', 0)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .attr('font-size', 12)
      .text(d => d.data.name || '');
  }, [phyloTree]);

  return <svg ref={svgRef} />;
};