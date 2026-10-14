import * as d3 from 'd3';
import { useCallback, useEffect, useRef, useState } from 'react';
import { node } from '@/types/haplogroupClassifierTypes';
import { Button } from '@/components/retroui/Button';
import { Text } from '@/components/retroui/Text';

const DEFAULT_ZOOM = 0.5;
const ROOT_SCREEN_Y = 96;

export const D3PhyloTree = ({ phyloTree }: { phyloTree: node | null }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const pinnedNodeRef = useRef<node | null>(null);
  const previewCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const treeOriginRef = useRef({ x: 0, y: 0 });
  const [activeNode, setActiveNode] = useState<node | null>(null);
  const [isPinned, setIsPinned] = useState(false);

  const cancelPreviewClose = useCallback(() => {
    if (previewCloseTimerRef.current !== null) {
      clearTimeout(previewCloseTimerRef.current);
      previewCloseTimerRef.current = null;
    }
  }, []);

  const schedulePreviewClose = useCallback(() => {
    cancelPreviewClose();
    previewCloseTimerRef.current = setTimeout(() => {
      if (pinnedNodeRef.current === null) {
        setActiveNode(null);
      }
      previewCloseTimerRef.current = null;
    }, 250);
  }, [cancelPreviewClose]);

  const closeDetails = useCallback(() => {
    cancelPreviewClose();
    pinnedNodeRef.current = null;
    setIsPinned(false);
    setActiveNode(null);
  }, [cancelPreviewClose]);

  const zoomBy = useCallback((factor: number) => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;

    d3.select(svgRef.current)
      .transition()
      .duration(200)
      .call(zoomBehaviorRef.current.scaleBy, factor);
  }, []);

  const resetZoom = useCallback(() => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;

    const { clientWidth } = svgRef.current;
    const { x, y } = treeOriginRef.current;
    const initialTransform = d3.zoomIdentity
      .translate(clientWidth / 2 - x * DEFAULT_ZOOM, ROOT_SCREEN_Y - y * DEFAULT_ZOOM)
      .scale(DEFAULT_ZOOM);

    d3.select(svgRef.current)
      .transition()
      .duration(250)
      .call(zoomBehaviorRef.current.transform, initialTransform);
  }, []);

  useEffect(() => () => cancelPreviewClose(), [cancelPreviewClose]);

  useEffect(() => {
    if (!phyloTree || !svgRef.current) return;

    const labelCharactersPerLine = 4;
    const labelLineHeight = 14;
    const labelFontSize = 12;
    const labelLineWidth = labelCharactersPerLine * labelFontSize * 0.65;
    const getLabelLines = (name: string | null) =>
      (name || '').match(new RegExp(`.{1,${labelCharactersPerLine}}`, 'g')) || [''];

    const maxLabelLines = d3.max(
      d3.hierarchy<node>(phyloTree).descendants(),
      d => getLabelLines(d.data.name).length,
    ) ?? 1;
    const horizontalLabelPadding = labelLineWidth / 2 + 12;
    const margin = {
      top: maxLabelLines * labelLineHeight + 18,
      right: horizontalLabelPadding,
      bottom: 18,
      left: horizontalLabelPadding,
    };
    const nodeSeparationX = labelLineWidth + 10; // near-minimum safe horizontal spacing
    const nodeSeparationY = 260; // vertical spacing between levels

    // clear previous drawing
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // use nodeSize to force spacing
    const treeLayout = d3.tree<d3.HierarchyPointNode<node>>().nodeSize([nodeSeparationX, nodeSeparationY]);

    const root = d3.hierarchy<node>(phyloTree);
    treeLayout(root as any); 

    // compute extents to size the svg properly
    const xMin = d3.min(root.descendants(), d => d.x) ?? 0;
    const yMin = d3.min(root.descendants(), d => d.y) ?? 0;

    svg
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', null);

    const zoomLayer = svg.append('g').classed('zoom-layer', true);

    // group offset so all coords are positive
    const g = zoomLayer.append('g')
      .attr('transform', `translate(${margin.left - xMin}, ${margin.top - yMin})`);

    const rootX = (root.x ?? 0) + margin.left - xMin;
    const rootY = (root.y ?? 0) + margin.top - yMin;
    treeOriginRef.current = { x: rootX, y: rootY };

    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 8])
      .on('zoom', event => {
        zoomLayer.attr('transform', event.transform.toString());
      });

    zoomBehaviorRef.current = zoomBehavior;
    svg.call(zoomBehavior);

    const initialTransform = d3.zoomIdentity
      .translate(
        svgRef.current.clientWidth / 2 - rootX * DEFAULT_ZOOM,
        ROOT_SCREEN_Y - rootY * DEFAULT_ZOOM,
      )
      .scale(DEFAULT_ZOOM);
    svg.call(zoomBehavior.transform, initialTransform);

    // links
    g.selectAll('line.link')
      .data(root.links())
      .enter()
      .append('line')
      .classed('link', true)
      .attr('x1', d => (d.source.x ?? 0))
      .attr('y1', d => (d.source.y ?? 0))
      .attr('x2', d => (d.target.x ?? 0))
      .attr('y2', d => (d.target.y ?? 0))
      .attr('stroke', '#999')
      .attr('stroke-width', 1.5);

    // nodes
    const nodeGroup = g.selectAll('g.node')
      .data(root.descendants())
      .enter()
      .append('g')
      .classed('node', true)
      .attr('transform', d => `translate(${d.x}, ${d.y})`)
      .attr('tabindex', 0)
      .attr('role', 'button')
      .attr('aria-label', d => {
        const name = d.data.name || 'Unnamed haplogroup';
        const mutationCount = d.data.mutations.length;
        return `${name}, ${mutationCount} mutation${mutationCount === 1 ? '' : 's'}`;
      })
      .style('cursor', 'pointer')
      .style('outline', 'none')
      .on('pointerenter', (event: PointerEvent, d) => {
        if (event.pointerType !== 'touch' && pinnedNodeRef.current === null) {
          cancelPreviewClose();
          setActiveNode(d.data);
        }
      })
      .on('pointerleave', (event: PointerEvent) => {
        if (event.pointerType !== 'touch' && pinnedNodeRef.current === null) {
          schedulePreviewClose();
        }
      })
      .on('focus', (_event, d) => {
        if (pinnedNodeRef.current === null) {
          cancelPreviewClose();
          setActiveNode(d.data);
        }
      })
      .on('blur', () => {
        if (pinnedNodeRef.current === null) {
          schedulePreviewClose();
        }
      })
      .on('click', (event: MouseEvent, d) => {
        event.stopPropagation();
        cancelPreviewClose();

        if (pinnedNodeRef.current === d.data) {
          closeDetails();
          return;
        }

        pinnedNodeRef.current = d.data;
        setIsPinned(true);
        setActiveNode(d.data);
      })
      .on('keydown', (event: KeyboardEvent, d) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;

        event.preventDefault();
        cancelPreviewClose();
        if (pinnedNodeRef.current === d.data) {
          closeDetails();
          return;
        }

        pinnedNodeRef.current = d.data;
        setIsPinned(true);
        setActiveNode(d.data);
      });

    nodeGroup.append('circle')
      .attr('r', 6)
      .attr('fill', '#9c6644');

    const labels = nodeGroup.append('text')
      .attr('x', 0)
      .attr('y', d => {
        const lineCount = getLabelLines(d.data.name).length;
        return -12 - (lineCount - 1) * labelLineHeight;
      })
      .attr('text-anchor', 'middle')
      .attr('font-size', labelFontSize);

    labels.selectAll('tspan')
      .data(d => getLabelLines(d.data.name))
      .join('tspan')
      .attr('x', 0)
      .attr('dy', (_line, index) => index === 0 ? 0 : labelLineHeight)
      .text(line => line);

    svg.on('click', closeDetails);
  }, [cancelPreviewClose, closeDetails, phyloTree, schedulePreviewClose]);

  useEffect(() => {
    if (!svgRef.current) return;

    d3.select(svgRef.current)
      .selectAll<SVGGElement, d3.HierarchyPointNode<node>>('g.node')
      .select('circle')
      .attr('fill', d => d.data === activeNode ? '#f4a261' : '#9c6644')
      .attr('stroke', d => d.data === activeNode ? '#000' : 'none')
      .attr('stroke-width', d => d.data === activeNode ? 3 : 0);
  }, [activeNode]);

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden">
      <div className="absolute top-3 left-3 z-20 flex gap-2">
        <Button type="button" size="sm" aria-label="Zoom in" onClick={() => zoomBy(1.5)}>
          +
        </Button>
        <Button type="button" size="sm" aria-label="Zoom out" onClick={() => zoomBy(1 / 1.5)}>
          −
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={resetZoom}>
          Reset
        </Button>
      </div>

      <svg
        ref={svgRef}
        className="block h-full w-full cursor-grab touch-none active:cursor-grabbing"
        aria-label="Interactive mitochondrial DNA haplogroup tree"
      />

      {activeNode && (
        <aside
          role={isPinned ? 'dialog' : 'tooltip'}
          aria-label={`${activeNode.name || 'Unnamed haplogroup'} details`}
          aria-live="polite"
          onPointerEnter={cancelPreviewClose}
          onPointerLeave={() => {
            if (pinnedNodeRef.current === null) {
              schedulePreviewClose();
            }
          }}
          className="fixed inset-x-4 bottom-4 z-50 max-h-[70dvh] overflow-y-auto rounded-xl border-2 border-black bg-[#fff8dc] p-4 shadow-lg sm:right-4 sm:left-auto sm:w-96"
        >
          <div className="mb-3 flex items-start justify-between gap-4">
            <Text as="h3">{activeNode.name || 'Unnamed haplogroup'}</Text>
            {isPinned && (
              <Button type="button" size="sm" variant="outline" onClick={closeDetails}>
                Close
              </Button>
            )}
          </div>

          <dl className="space-y-3 text-sm">
            <div>
              <dt className="font-bold">Mutations</dt>
              <dd>
                {activeNode.mutations.length > 0 ? (
                  <ul className="mt-1 list-inside list-disc">
                    {activeNode.mutations.map((mutation, index) => (
                      <li key={`${String(mutation)}-${index}`}>{String(mutation)}</li>
                    ))}
                  </ul>
                ) : (
                  'None listed'
                )}
              </dd>
            </div>

            <div>
              <dt className="font-bold">Accession number</dt>
              <dd>{activeNode.accessionNr || 'Not listed'}</dd>
            </div>

            <div>
              <dt className="font-bold">Reference</dt>
              <dd className="break-words">{activeNode.reference || 'Not listed'}</dd>
            </div>

            <div>
              <dt className="font-bold">Direct child haplogroups</dt>
              <dd>
                {activeNode.children.length > 0
                  ? activeNode.children.map(child => child.name || 'Unnamed').join(', ')
                  : 'None'}
              </dd>
            </div>
          </dl>
        </aside>
      )}
    </div>
  );
};
