import * as d3 from 'd3';
import { useEffect, useRef } from 'react';
import { node } from '@/types/haplogroupClassifierTypes';

export const D3PhyloTreeV1 = ({ phyloTree }: { phyloTree: node | null }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!phyloTree || !svgRef.current) return;

    const width = 1200;
    const height = 800;

    const tree = d3.tree<node>().size([width, height]);
    const root = d3.hierarchy(phyloTree);
    tree(root);

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    // Draw links
    svg.selectAll('line')
      .data(root.links())
      .enter()
      .append('line')
      .attr('x1', (d) => (d.source.x ?? 0))
      .attr('y1', (d) => (d.source.y ?? 0))
      .attr('x2', (d) => (d.target.x ?? 0))
      .attr('y2', (d) => (d.target.y ?? 0))
      .attr('stroke', '#999');

    // Draw nodes
    svg.selectAll('circle')
      .data(root.descendants())
      .enter()
      .append('circle')
      .attr('cx', (d) => (d.x ?? 0))
      .attr('cy', (d) => (d.y ?? 0))
      .attr('r', 8)
      .attr('fill', '#69b3a2');

    // Draw labels
    // svg.selectAll('text')
    //   .data(root.descendants())
    //   .enter()
    //   .append('text')
    //   .attr('x', (d) => d.x)
    //   .attr('y', (d) => d.y - 15)
    //   .attr('text-anchor', 'middle')
    //   .text((d) => d.data.name)
    //   .attr('font-size', '12px');
  }, [phyloTree]);

  return <svg ref={svgRef} />;
};