import type { YFullNode, YFullTreeStats } from "@/types/yFullTypes";

const YFULL_TREE_PATH = "/current_tree.json";

export const getYFullNodeLabel = (node: YFullNode) => node.id || "Y-DNA root";

export const splitYFullSnps = (snps: string) =>
  snps
    .split(",")
    .map((snp) => snp.trim())
    .filter(Boolean);

export const getYFullTreeStats = (tree: YFullNode): YFullTreeStats => {
  let nodeCount = 0;
  let snpCount = 0;
  const stack = [tree];

  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) continue;

    nodeCount += 1;
    snpCount += splitYFullSnps(node.snps).length;
    stack.push(...node.children);
  }

  return { nodeCount, snpCount };
};

const normalizeYFullTree = (tree: YFullNode) => {
  const stack = [tree];

  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) continue;

    const rawChildren = (node as YFullNode & { children?: YFullNode[] }).children;
    node.children = Array.isArray(rawChildren) ? rawChildren : [];
    stack.push(...node.children);
  }

  return tree;
};

export const loadYFullTree = async () => {
  const response = await fetch(YFULL_TREE_PATH);

  if (!response.ok) {
    throw new Error(`Unable to load the YFull tree (${response.status})`);
  }

  // YFull omits `children` on terminal branches. Normalize them once so the
  // visualization can treat every entry as the same recursive shape.
  const tree = normalizeYFullTree((await response.json()) as YFullNode);
  return { tree, stats: getYFullTreeStats(tree) };
};

export const findYFullNodePath = (tree: YFullNode, rawQuery: string): YFullNode[] | null => {
  const query = rawQuery.trim().toUpperCase();
  if (!query) return null;

  const stack: Array<{ node: YFullNode; path: YFullNode[] }> = [
    { node: tree, path: [tree] },
  ];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;

    const { node, path } = current;
    const idMatches = node.id.toUpperCase() === query;
    const snpMatches = node.snps
      .split(/[\/,]/)
      .some((snp) => snp.trim().toUpperCase() === query);

    if (idMatches || snpMatches) return path;

    for (let index = node.children.length - 1; index >= 0; index -= 1) {
      const child = node.children[index];
      stack.push({ node: child, path: [...path, child] });
    }
  }

  return null;
};
