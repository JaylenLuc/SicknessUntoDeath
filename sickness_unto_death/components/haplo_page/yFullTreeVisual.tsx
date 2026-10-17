import * as d3 from "d3";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/retroui/Button";
import { Text } from "@/components/retroui/Text";
import {
  findYFullNodePath,
  getYFullNodeLabel,
  splitYFullSnps,
} from "@/lib/haplogrouper_util/yFullTree";
import type { YFullAge, YFullNode, YFullTreeStats } from "@/types/yFullTypes";

const ROOT_KEY = "__YFULL_ROOT__";
const DEFAULT_ZOOM = 0.72;
const MAX_VISIBLE_NODES = 1_000;

const getNodeKey = (node: YFullNode) => node.id || ROOT_KEY;

const getInitialExpandedNodes = (tree: YFullNode) => {
  const expanded = new Set<string>([getNodeKey(tree)]);
  tree.children.forEach((child) => {
    if (child.children.length > 0) expanded.add(getNodeKey(child));
  });
  return expanded;
};

const getVisibleNodeIds = (tree: YFullNode, expandedNodes: Set<string>) => {
  const visible = new Set<string>();
  const stack = [tree];

  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) continue;

    visible.add(getNodeKey(node));
    if (expandedNodes.has(getNodeKey(node))) stack.push(...node.children);
  }

  return visible;
};

const getInitialTreeState = (tree: YFullNode) => {
  const expandedNodes = getInitialExpandedNodes(tree);
  return {
    expandedNodes,
    visibleNodeIds: getVisibleNodeIds(tree, expandedNodes),
  };
};

const formatAge = (age: YFullAge) =>
  typeof age === "number" ? `${age.toLocaleString()} years ago` : "Not estimated";

const formatAgeRange = (low: YFullAge, high: YFullAge) => {
  if (typeof low !== "number" || typeof high !== "number") return null;
  return `${low.toLocaleString()}–${high.toLocaleString()} years ago`;
};

export const YFullTreeVisual = ({
  tree,
  stats,
}: {
  tree: YFullNode;
  stats: YFullTreeStats;
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const pinnedNodeRef = useRef<YFullNode | null>(null);
  const previewCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusRequestRef = useRef<YFullNode | null>(null);
  const hasRenderedRef = useRef(false);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const treeOriginRef = useRef({ x: 0, y: 0 });
  const [treeState, setTreeState] = useState(() => getInitialTreeState(tree));
  const [activeNode, setActiveNode] = useState<YFullNode | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const [query, setQuery] = useState("");
  const [searchMessage, setSearchMessage] = useState("");
  const [limitMessage, setLimitMessage] = useState("");
  const { expandedNodes, visibleNodeIds } = treeState;

  const cancelPreviewClose = useCallback(() => {
    if (previewCloseTimerRef.current !== null) {
      clearTimeout(previewCloseTimerRef.current);
      previewCloseTimerRef.current = null;
    }
  }, []);

  const schedulePreviewClose = useCallback(() => {
    cancelPreviewClose();
    previewCloseTimerRef.current = setTimeout(() => {
      if (pinnedNodeRef.current === null) setActiveNode(null);
      previewCloseTimerRef.current = null;
    }, 250);
  }, [cancelPreviewClose]);

  const closeDetails = useCallback(() => {
    cancelPreviewClose();
    pinnedNodeRef.current = null;
    setIsPinned(false);
    setActiveNode(null);
  }, [cancelPreviewClose]);

  const visibleRoot = useMemo(
    () =>
      d3.hierarchy<YFullNode>(tree, (node) =>
        expandedNodes.has(getNodeKey(node)) ? node.children : undefined,
      ),
    [expandedNodes, tree],
  );

  const resetZoom = useCallback(() => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;

    const { clientWidth } = svgRef.current;
    const { x, y } = treeOriginRef.current;
    const transform = d3.zoomIdentity
      .translate(clientWidth / 2 - x * DEFAULT_ZOOM, 92 - y * DEFAULT_ZOOM)
      .scale(DEFAULT_ZOOM);

    d3.select(svgRef.current)
      .transition()
      .duration(250)
      .call(zoomBehaviorRef.current.transform, transform);
  }, []);

  const zoomBy = useCallback((factor: number) => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current).transition().duration(180).call(zoomBehaviorRef.current.scaleBy, factor);
  }, []);

  const toggleBranch = useCallback((node: YFullNode) => {
    if (node.children.length === 0) return;

    const key = getNodeKey(node);
    const nextExpanded = new Set(expandedNodes);
    const nextVisible = new Set(visibleNodeIds);

    if (nextExpanded.has(key)) {
      nextExpanded.delete(key);

      // Remove every currently visible descendant and forget its expansion
      // state, so reopening this branch starts with only its direct children.
      const stack = [...node.children];
      while (stack.length > 0) {
        const descendant = stack.pop();
        if (!descendant) continue;

        const descendantKey = getNodeKey(descendant);
        nextVisible.delete(descendantKey);
        if (nextExpanded.delete(descendantKey)) stack.push(...descendant.children);
      }

      setLimitMessage("");
      setTreeState({ expandedNodes: nextExpanded, visibleNodeIds: nextVisible });
      return;
    }

    const newVisibleCount = nextVisible.size + node.children.length;
    if (newVisibleCount > MAX_VISIBLE_NODES) {
      setLimitMessage(
        `That expansion would exceed the ${MAX_VISIBLE_NODES.toLocaleString()}-node safety limit. Collapse another branch or search for a more specific haplogroup.`,
      );
      return;
    }

    nextExpanded.add(key);
    node.children.forEach((child) => nextVisible.add(getNodeKey(child)));
    setLimitMessage("");
    setTreeState({ expandedNodes: nextExpanded, visibleNodeIds: nextVisible });
  }, [expandedNodes, visibleNodeIds]);

  useEffect(() => () => cancelPreviewClose(), [cancelPreviewClose]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const path = findYFullNodePath(tree, query);

    if (!path) {
      setLimitMessage("");
      setSearchMessage(`No exact haplogroup or SNP match for “${query.trim()}”.`);
      return;
    }

    // Expand only the ancestors; the matched branch remains visible but
    // collapsed until the user explicitly opens it.
    const searchExpandedNodes = new Set<string>();
    const searchVisibleNodeIds = new Set<string>([getNodeKey(tree)]);

    for (const ancestor of path.slice(0, -1)) {
      searchExpandedNodes.add(getNodeKey(ancestor));
      ancestor.children.forEach((child) => searchVisibleNodeIds.add(getNodeKey(child)));

      if (searchVisibleNodeIds.size > MAX_VISIBLE_NODES) {
        setLimitMessage(
          `That path would exceed the ${MAX_VISIBLE_NODES.toLocaleString()}-node safety limit. Try a more specific descendant haplogroup or SNP.`,
        );
        return;
      }
    }

    setTreeState({
      expandedNodes: searchExpandedNodes,
      visibleNodeIds: searchVisibleNodeIds,
    });
    const match = path[path.length - 1];
    setActiveNode(match);
    focusRequestRef.current = match;
    setLimitMessage("");
    setSearchMessage(`Showing ${getYFullNodeLabel(match)} and its ancestral path.`);
  };

  useEffect(() => {
    if (!svgRef.current) return;

    const svgElement = svgRef.current;
    const svg = d3.select(svgElement);
    const previousTransform = d3.zoomTransform(svgElement);
    const isFirstRender = !hasRenderedRef.current;
    svg.selectAll("*").remove();

    const layout = d3.tree<YFullNode>().nodeSize([82, 170]);
    layout(visibleRoot);

    const nodes = visibleRoot.descendants();
    const marginTop = 52;

    const zoomLayer = svg.append("g");
    const graphLayer = zoomLayer
      .append("g")
      .attr("transform", `translate(0, ${marginTop})`);

    const rootX = visibleRoot.x ?? 0;
    const rootY = (visibleRoot.y ?? 0) + marginTop;
    treeOriginRef.current = { x: rootX, y: rootY };

    const zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.18, 6])
      .on("zoom", (event) => zoomLayer.attr("transform", event.transform.toString()));
    zoomBehaviorRef.current = zoomBehavior;
    svg.call(zoomBehavior);

    graphLayer
      .selectAll("path.link")
      .data(visibleRoot.links())
      .join("path")
      .attr("class", "link")
      .attr("fill", "none")
      .attr("stroke", "#705b4d")
      .attr("stroke-width", 1.5)
      .attr("d", (link) => {
        const sourceX = link.source.x ?? 0;
        const sourceY = link.source.y ?? 0;
        const targetX = link.target.x ?? 0;
        const targetY = link.target.y ?? 0;
        const midpointY = (sourceY + targetY) / 2;
        return `M${sourceX},${sourceY}C${sourceX},${midpointY} ${targetX},${midpointY} ${targetX},${targetY}`;
      });

    const nodeGroups = graphLayer
      .selectAll<SVGGElement, d3.HierarchyPointNode<YFullNode>>("g.node")
      .data(nodes)
      .join("g")
      .attr("class", "node")
      .attr("transform", (node) => `translate(${node.x}, ${node.y})`)
      .attr("tabindex", 0)
      .attr("role", "button")
      .attr("aria-label", (node) => {
        const snpCount = splitYFullSnps(node.data.snps).length;
        return `${getYFullNodeLabel(node.data)} details, ${snpCount} defining SNP${snpCount === 1 ? "" : "s"}`;
      })
      .style("cursor", "pointer")
      .style("outline", "none")
      .on("pointerenter", (event, node) => {
        if (event.pointerType !== "touch" && pinnedNodeRef.current === null) {
          cancelPreviewClose();
          setActiveNode(node.data);
        }
      })
      .on("pointerleave", (event) => {
        if (event.pointerType !== "touch" && pinnedNodeRef.current === null) {
          schedulePreviewClose();
        }
      })
      .on("focus", (_event, node) => {
        if (pinnedNodeRef.current === null) {
          cancelPreviewClose();
          setActiveNode(node.data);
        }
      })
      .on("blur", () => {
        if (pinnedNodeRef.current === null) schedulePreviewClose();
      })
      .on("click", (event, node) => {
        event.stopPropagation();
        cancelPreviewClose();

        if (pinnedNodeRef.current === node.data) {
          closeDetails();
          return;
        }

        pinnedNodeRef.current = node.data;
        setIsPinned(true);
        setActiveNode(node.data);
      })
      .on("keydown", (event, node) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        cancelPreviewClose();

        if (pinnedNodeRef.current === node.data) {
          closeDetails();
          return;
        }

        pinnedNodeRef.current = node.data;
        setIsPinned(true);
        setActiveNode(node.data);
      });

    nodeGroups
      .append("circle")
      .attr("class", "node-detail-circle")
      .attr("r", 6)
      .attr("fill", (node) => {
        if (expandedNodes.has(getNodeKey(node.data))) return "#47755b";
        return node.data.children.length > 0 ? "#9c6644" : "#d4a373";
      })
      .attr("stroke", "#111")
      .attr("stroke-width", 1.5);

    nodeGroups
      .append("text")
      .attr("text-anchor", "middle")
      .attr("y", -14)
      .attr("font-size", 11)
      .attr("font-weight", 600)
      .attr("paint-order", "stroke")
      .attr("stroke", "#b9d3ba")
      .attr("stroke-width", 4)
      .attr("fill", "#111")
      .text((node) => getYFullNodeLabel(node.data));

    const branchToggles = graphLayer
      .selectAll<SVGGElement, d3.HierarchyPointNode<YFullNode>>("g.branch-toggle")
      .data(nodes.filter((node) => node.data.children.length > 0))
      .join("g")
      .attr("class", "branch-toggle")
      .attr("transform", (node) => `translate(${(node.x ?? 0) + 16}, ${node.y ?? 0})`)
      .attr("tabindex", 0)
      .attr("role", "button")
      .attr("aria-label", (node) => {
        const action = expandedNodes.has(getNodeKey(node.data)) ? "Hide" : "Expand";
        return `${action} descendants of ${getYFullNodeLabel(node.data)}`;
      })
      .style("cursor", "pointer")
      .style("outline", "none")
      .on("click", (event, node) => {
        event.stopPropagation();
        toggleBranch(node.data);
      })
      .on("keydown", (event, node) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        event.stopPropagation();
        toggleBranch(node.data);
      });

    branchToggles
      .append("rect")
      .attr("x", -7)
      .attr("y", -7)
      .attr("width", 14)
      .attr("height", 14)
      .attr("rx", 2)
      .attr("fill", "#fff8dc")
      .attr("stroke", "#111")
      .attr("stroke-width", 1.5);

    branchToggles
      .append("text")
      .attr("text-anchor", "middle")
      .attr("y", 4)
      .attr("font-size", 12)
      .attr("font-weight", 700)
      .attr("fill", "#111")
      .attr("pointer-events", "none")
      .text((node) => (expandedNodes.has(getNodeKey(node.data)) ? "−" : "+"));

    const focusRequest = focusRequestRef.current;
    if (focusRequest || isFirstRender) {
      const target = focusRequest
        ? nodes.find((node) => node.data === focusRequest) ?? visibleRoot
        : visibleRoot;
      const targetX = target.x ?? 0;
      const targetY = (target.y ?? 0) + marginTop;
      const centeredTransform = d3.zoomIdentity
        .translate(
          svgElement.clientWidth / 2 - targetX * DEFAULT_ZOOM,
          svgElement.clientHeight / 2 - targetY * DEFAULT_ZOOM,
        )
        .scale(DEFAULT_ZOOM);
      svg.call(zoomBehavior.transform, centeredTransform);
      focusRequestRef.current = null;
    } else {
      svg.call(zoomBehavior.transform, previousTransform);
    }
    hasRenderedRef.current = true;
    svg.on("click", closeDetails);
  }, [
    cancelPreviewClose,
    closeDetails,
    expandedNodes,
    schedulePreviewClose,
    toggleBranch,
    visibleRoot,
  ]);

  useEffect(() => {
    if (!svgRef.current) return;

    d3.select(svgRef.current)
      .selectAll<SVGGElement, d3.HierarchyPointNode<YFullNode>>("g.node")
      .select("circle.node-detail-circle")
      .attr("fill", (node) => {
        if (node.data === activeNode) return "#f4a261";
        if (expandedNodes.has(getNodeKey(node.data))) return "#47755b";
        return node.data.children.length > 0 ? "#9c6644" : "#d4a373";
      })
      .attr("stroke-width", (node) => (node.data === activeNode ? 3 : 1.5));
  }, [activeNode, expandedNodes]);

  const snps = activeNode ? splitYFullSnps(activeNode.snps) : [];
  const visibleNodeCount = visibleNodeIds.size;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border-2 border-black bg-[#fff8dc] p-3">
        <form className="flex min-w-64 flex-1 flex-wrap items-end gap-2" onSubmit={handleSearch}>
          <label className="flex min-w-56 flex-1 flex-col gap-1 text-sm font-bold" htmlFor="yfull-search">
            Find a haplogroup or SNP
            <input
              id="yfull-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="R-L21, M269, A0-T…"
              className="rounded-md border-2 border-black bg-white px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-[#f4a261]"
            />
          </label>
          <Button type="submit" size="sm">Find</Button>
        </form>
        <div className="text-right text-xs leading-5">
          <div>{stats.nodeCount.toLocaleString()} branches</div>
          <div>
            {visibleNodeCount.toLocaleString()} / {MAX_VISIBLE_NODES.toLocaleString()} visible
          </div>
        </div>
        {searchMessage && <p className="w-full text-sm" aria-live="polite">{searchMessage}</p>}
        {limitMessage && (
          <p className="w-full rounded-md border-2 border-black bg-[#fae583] p-2 text-sm" role="alert">
            {limitMessage}
          </p>
        )}
      </div>

      <div className="relative min-h-[32rem] flex-1 overflow-hidden rounded-xl border-2 border-black bg-[#b9d3ba]">
        <div className="absolute top-3 left-3 z-20 flex flex-wrap gap-2">
          <Button type="button" size="sm" aria-label="Zoom in" onClick={() => zoomBy(1.5)}>+</Button>
          <Button type="button" size="sm" aria-label="Zoom out" onClick={() => zoomBy(1 / 1.5)}>−</Button>
          <Button type="button" size="sm" variant="outline" onClick={resetZoom}>Reset view</Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              const expandedNodes = new Set([getNodeKey(tree)]);
              setTreeState({
                expandedNodes,
                visibleNodeIds: getVisibleNodeIds(tree, expandedNodes),
              });
              setActiveNode(null);
              focusRequestRef.current = null;
              setLimitMessage("");
            }}
          >
            Collapse branches
          </Button>
        </div>

        <svg
          ref={svgRef}
          className="block h-full min-h-[32rem] w-full cursor-grab touch-none active:cursor-grabbing"
          aria-label="Interactive Y-DNA haplogroup tree"
        />

        <div className="pointer-events-none absolute right-3 bottom-3 rounded-md border border-black bg-[#fff8dc]/90 px-2 py-1 text-xs">
          Click + to expand a branch
        </div>
      </div>

      {activeNode && (
        <aside
          role={isPinned ? "dialog" : "tooltip"}
          aria-label={`${getYFullNodeLabel(activeNode)} details`}
          aria-live="polite"
          onPointerEnter={cancelPreviewClose}
          onPointerLeave={() => {
            if (pinnedNodeRef.current === null) schedulePreviewClose();
          }}
          className="fixed inset-x-4 bottom-4 z-50 max-h-[75dvh] overflow-y-auto rounded-xl border-2 border-black bg-[#fff8dc] p-4 shadow-lg sm:right-4 sm:left-auto sm:w-[28rem]"
        >
          <div className="mb-3 flex items-start justify-between gap-4">
            <div>
              <Text as="h3">{getYFullNodeLabel(activeNode)}</Text>
              <p className="text-sm text-[#5a5a5a]">
                {activeNode.children.length.toLocaleString()} direct descendant branches
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={isPinned ? "" : "sm:hidden"}
              onClick={closeDetails}
            >
              Close
            </Button>
          </div>

          <dl className="space-y-3 text-sm">
            <div>
              <dt className="font-bold">Formed</dt>
              <dd>{formatAge(activeNode.formed)}</dd>
              {formatAgeRange(activeNode.formedlowage, activeNode.formedhighage) && (
                <dd className="text-xs text-[#5a5a5a]">
                  Range: {formatAgeRange(activeNode.formedlowage, activeNode.formedhighage)}
                </dd>
              )}
            </div>
            <div>
              <dt className="font-bold">Most recent common ancestor (TMRCA)</dt>
              <dd>{formatAge(activeNode.tmrca)}</dd>
              {formatAgeRange(activeNode.tmrcalowage, activeNode.tmrcahighage) && (
                <dd className="text-xs text-[#5a5a5a]">
                  Range: {formatAgeRange(activeNode.tmrcalowage, activeNode.tmrcahighage)}
                </dd>
              )}
            </div>
            <div>
              <dt className="font-bold">Defining SNPs ({snps.length.toLocaleString()})</dt>
              <dd className="mt-1 break-words">
                {snps.length > 0 ? snps.slice(0, 40).join(", ") : "None listed"}
                {snps.length > 40 && ` … and ${snps.length - 40} more`}
              </dd>
            </div>
          </dl>
        </aside>
      )}
    </div>
  );
};
