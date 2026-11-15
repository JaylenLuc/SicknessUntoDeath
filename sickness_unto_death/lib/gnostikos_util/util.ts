import type { sessionGraph } from "@/types/gnostikosTypes";

export type TraverserNode = {
  id: number; label: string;
  x?: number; y?: number; vx?: number; vy?: number;
  fx?: number; fy?: number;
};
export type TraverserLink = {
  source: number | TraverserNode; target: number | TraverserNode; step: number;
};
export type TraverserGraphData = { nodes: TraverserNode[]; links: TraverserLink[] };

const endpointId = (endpoint: number | TraverserNode) => typeof endpoint === "number" ? endpoint : endpoint.id;
const linkKey = (link: TraverserLink) => `${endpointId(link.source)}:${endpointId(link.target)}:${link.step}`;
const positioned = (node: TraverserNode) => Number.isFinite(node.x) && Number.isFinite(node.y);

export function pinTraverserNode(node: TraverserNode) {
  if (!positioned(node)) return;
  node.fx = node.x;
  node.fy = node.y;
  node.vx = node.vy = 0;
}

export function toForceGraph(session: sessionGraph, previous?: TraverserGraphData): TraverserGraphData {
  const oldNodes = new Map(previous?.nodes.map((node) => [node.id, node]));
  const added = new Set<TraverserNode>();
  const nodes = Object.entries(session.nodes).map(([id, data]) => {
    const old = oldNodes.get(Number(id));
    // Reused IDs with different URLs belong to a new/cleared session.
    if (old?.label === data.url) return old;
    const node: TraverserNode = { id: Number(id), label: data.url };
    added.add(node);
    return node;
  });
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const oldLinks = new Map(previous?.links.map((link) => [linkKey(link), link]));
  const links = session.edges.filter((edge) => byId.has(edge.from) && byId.has(edge.to)).map((edge) => {
    const link = { source: edge.from, target: edge.to, step: edge.step };
    const old = oldLinks.get(linkKey(link));
    // D3 replaces link IDs with node references; only reuse links whose nodes survived.
    return old && !added.has(byId.get(edge.from)!) && !added.has(byId.get(edge.to)!) ? old : link;
  });

  // Cursor changes and repeated polling must not restart the simulation.
  if (previous && nodes.length === previous.nodes.length && links.length === previous.links.length
    && nodes.every((node, i) => node === previous.nodes[i])
    && links.every((link, i) => link === previous.links[i])) return previous;

  const anchors = nodes.filter((node) => !added.has(node) && positioned(node));
  anchors.forEach(pinTraverserNode);
  if (anchors.length) {
    const pending = new Set(added);
    const seedNear = (node: TraverserNode, x: number, y: number) => {
      const angle = node.id * 2.399963229728653; // Golden angle separates new siblings.
      node.x = x + Math.cos(angle) * 60;
      node.y = y + Math.sin(angle) * 60;
      node.vx = node.vy = 0;
      pending.delete(node);
    };
    // Also handle several new nodes arriving in one poll, in any ID order.
    let progressed = true;
    while (pending.size && progressed) {
      progressed = false;
      for (const node of pending) {
        for (const link of links) {
          const source = endpointId(link.source), target = endpointId(link.target);
          const neighbor = source === node.id ? byId.get(target) : target === node.id ? byId.get(source) : undefined;
          if (neighbor && positioned(neighbor)) {
            seedNear(node, neighbor.x!, neighbor.y!);
            progressed = true;
            break;
          }
        }
      }
    }
    const centerX = anchors.reduce((sum, node) => sum + node.x!, 0) / anchors.length;
    const centerY = anchors.reduce((sum, node) => sum + node.y!, 0) / anchors.length;
    for (const node of pending) seedNear(node, centerX, centerY);
  }
  return { nodes, links };
}
