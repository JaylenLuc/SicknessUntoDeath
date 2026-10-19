/// <reference lib="webworker" />

import lda, { type NodeTree, type SingletonNode, type TopicTerm } from "lda";
import { Munkres } from "munkres-js";
import * as tf from "@tensorflow/tfjs";
import * as use from "@tensorflow-models/universal-sentence-encoder";
import winkNLP from "wink-nlp";
import model from "wink-eng-lite-web-model";

import { emotionalThemes } from "./arrayOfDreams";

type AnalyzeMessage = {
  type: "analyze";
  id: string;
  text: string;
};

type WarmupMessage = {
  type: "warmup";
};

type WorkerRequest = AnalyzeMessage | WarmupMessage;

type DreamAnalysis = {
  semanticTree: NodeTree | null;
  ldaTree: NodeTree | null;
};

interface LinkTopicStrength {
  topic: string;
  probability: number;
}

const MAX_SEMANTIC_CLUSTERS = 12;
const K_MEANS_ITERATIONS = 12;
const nlp = winkNLP(model);
const theHungarian = new Munkres();

let embeddingModel: use.UniversalSentenceEncoder | null = null;
let normalizedThemeEmbeddings: tf.Tensor2D | null = null;
let initializationPromise: Promise<void> | null = null;

async function initialize(): Promise<void> {
  if (embeddingModel && normalizedThemeEmbeddings) return;
  if (initializationPromise) return initializationPromise;

  initializationPromise = (async () => {
    await tf.setBackend("cpu");
    await tf.ready();

    embeddingModel = await use.load();
    const themeEmbeddings = await embeddingModel.embed(emotionalThemes);
    normalizedThemeEmbeddings = tf.tidy(() => {
      const norms = tf.norm(themeEmbeddings, "euclidean", 1, true).add(1e-12);
      return themeEmbeddings.div(norms) as tf.Tensor2D;
    });
    themeEmbeddings.dispose();
  })();

  try {
    await initializationPromise;
  } catch (error) {
    initializationPromise = null;
    throw error;
  }
}

function tokenize(sentences: string[]): string[][] {
  return sentences.map((sentence) => {
    const sentenceDoc = nlp.readDoc(sentence);
    return sentenceDoc
      .tokens()
      .filter(
        (word) =>
          word.out(nlp.its.stopWordFlag) === false &&
          word.out(nlp.its.type) === "word",
      )
      .out(nlp.its.normal);
  });
}

function calculateClusterCount(sentenceCount: number): number {
  return Math.min(
    MAX_SEMANTIC_CLUSTERS,
    sentenceCount,
    Math.max(1, Math.round(Math.sqrt(sentenceCount))),
  );
}

function calculateLdaTopicCount(tokenCount: number, sentenceCount: number): number {
  const estimate = Math.max(
    1,
    Math.floor(Math.log(Math.max(tokenCount, 2)) / Math.log(1.7)),
  );
  return Math.min(20, Math.max(1, sentenceCount), estimate);
}

function normalizeVector(vector: number[]): number[] {
  const magnitude = Math.sqrt(
    vector.reduce((total, value) => total + value * value, 0),
  );
  if (magnitude === 0) return vector;
  return vector.map((value) => value / magnitude);
}

function cosineSimilarity(a: number[], b: number[]): number {
  let similarity = 0;
  for (let index = 0; index < a.length; index += 1) {
    similarity += a[index] * b[index];
  }
  return similarity;
}

function dotProduct(a: number[], b: number[]): number {
  return a.reduce((total, value, index) => total + value * b[index], 0);
}

function multiplyByCovariance(matrix: number[][], vector: number[]): number[] {
  const projectedRows = matrix.map((row) => dotProduct(row, vector));
  return vector.map((_value, dimension) =>
    matrix.reduce(
      (total, row, rowIndex) =>
        total + row[dimension] * projectedRows[rowIndex],
      0,
    ),
  );
}

function principalDirection(
  matrix: number[][],
  seed: number[],
  orthogonalTo?: number[],
): number[] {
  let direction = normalizeVector(seed);

  for (let iteration = 0; iteration < 40; iteration += 1) {
    let next = multiplyByCovariance(matrix, direction);
    if (orthogonalTo) {
      const overlap = dotProduct(next, orthogonalTo);
      next = next.map(
        (value, index) => value - overlap * orthogonalTo[index],
      );
    }
    const magnitude = Math.sqrt(
      next.reduce((total, value) => total + value * value, 0),
    );
    if (magnitude < 1e-10) return new Array<number>(next.length).fill(0);
    const normalized = normalizeVector(next);
    direction = normalized;
  }

  return direction;
}

function projectCentroidsTo2D(centroids: number[][]): Array<[number, number]> {
  if (centroids.length === 1) return [[0, 0]];

  const dimensions = centroids[0].length;
  const means = Array.from({ length: dimensions }, (_, dimension) =>
    centroids.reduce(
      (total, centroid) => total + centroid[dimension],
      0,
    ) / centroids.length,
  );
  const centered = centroids.map((centroid) =>
    centroid.map((value, dimension) => value - means[dimension]),
  );
  const firstComponent = principalDirection(
    centered,
    Array.from({ length: dimensions }, (_, index) => Math.sin(index + 1)),
  );
  const secondComponent = principalDirection(
    centered,
    Array.from({ length: dimensions }, (_, index) => Math.cos(index + 1)),
    firstComponent,
  );
  const rawCoordinates = centered.map(
    (centroid) => [
      dotProduct(centroid, firstComponent),
      dotProduct(centroid, secondComponent),
    ] as [number, number],
  );
  const largestMagnitude = Math.max(
    ...rawCoordinates.flatMap(([x, y]) => [Math.abs(x), Math.abs(y)]),
    1e-9,
  );
  const scale = 130 / largestMagnitude;

  return rawCoordinates.map(([x, y]) => [x * scale, y * scale]);
}

function clusterSentenceVectors(
  sentenceVectors: number[][],
  clusterCount: number,
): { assignments: number[]; centroids: number[][] } {
  const vectors = sentenceVectors.map(normalizeVector);
  const centroids: number[][] = [vectors[0].slice()];

  // Deterministic farthest-point initialization gives better coverage than
  // choosing random sentences and keeps repeat runs stable.
  while (centroids.length < clusterCount) {
    let farthestIndex = 0;
    let lowestBestMatch = Number.POSITIVE_INFINITY;

    vectors.forEach((vector, vectorIndex) => {
      const bestMatch = Math.max(
        ...centroids.map((centroid) => cosineSimilarity(vector, centroid)),
      );
      if (bestMatch < lowestBestMatch) {
        lowestBestMatch = bestMatch;
        farthestIndex = vectorIndex;
      }
    });
    centroids.push(vectors[farthestIndex].slice());
  }

  const assignments = new Array<number>(vectors.length).fill(-1);

  for (let iteration = 0; iteration < K_MEANS_ITERATIONS; iteration += 1) {
    let changed = false;

    vectors.forEach((vector, vectorIndex) => {
      let bestCluster = 0;
      let bestSimilarity = Number.NEGATIVE_INFINITY;

      centroids.forEach((centroid, clusterIndex) => {
        const similarity = cosineSimilarity(vector, centroid);
        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestCluster = clusterIndex;
        }
      });

      if (assignments[vectorIndex] !== bestCluster) changed = true;
      assignments[vectorIndex] = bestCluster;
    });

    const sums = Array.from({ length: clusterCount }, () =>
      new Array<number>(vectors[0].length).fill(0),
    );
    const counts = new Array<number>(clusterCount).fill(0);

    vectors.forEach((vector, vectorIndex) => {
      const clusterIndex = assignments[vectorIndex];
      counts[clusterIndex] += 1;
      vector.forEach((value, dimension) => {
        sums[clusterIndex][dimension] += value;
      });
    });

    centroids.forEach((centroid, clusterIndex) => {
      if (counts[clusterIndex] === 0) return;
      centroids[clusterIndex] = normalizeVector(
        sums[clusterIndex].map((value) => value / counts[clusterIndex]),
      );
    });

    if (!changed) break;
  }

  return { assignments, centroids };
}

function extractClusterKeywords(
  sentences: string[],
  assignments: number[],
  clusterCount: number,
): TopicTerm[][] {
  return Array.from({ length: clusterCount }, (_, clusterIndex) => {
    const clusterSentences = sentences.filter(
      (_sentence, sentenceIndex) => assignments[sentenceIndex] === clusterIndex,
    );
    return lda(clusterSentences, 1, 5)[0] ?? [];
  });
}

function buildNodes(topicTermMatrix: Record<string, TopicTerm[]>): NodeTree {
  const adjacencyLinkMatrix: Record<string, LinkTopicStrength[]> = {};
  const nodes: NodeTree = { nodes: [], links: [] };

  Object.entries(topicTermMatrix).forEach(([topic, topicTermArray], index) => {
    const [shortName] = topic.split(":", 1);
    const singletonNode: SingletonNode = {
      id: `${index}-${topic}`,
      name: shortName,
      val: topic,
      group: index,
      keywords: topicTermArray.map(({ term }) => term),
    } as SingletonNode;

    nodes.nodes.push(singletonNode);

    topicTermArray.forEach((topicTerm) => {
      if (topicTerm.probability < 0.038) return;

      const topicList = adjacencyLinkMatrix[topicTerm.term] ?? [];
      topicList.push({
        topic: singletonNode.id,
        probability: topicTerm.probability,
      });
      adjacencyLinkMatrix[topicTerm.term] = topicList;
    });
  });

  const linkSet = new Set<string>();
  Object.values(adjacencyLinkMatrix).forEach((topicList) => {
    for (let i = 0; i < topicList.length; i += 1) {
      for (let j = i + 1; j < topicList.length; j += 1) {
        const [a, b] = [topicList[i].topic, topicList[j].topic].sort();
        const key = `${a}-${b}`;
        if (linkSet.has(key)) continue;

        linkSet.add(key);
        nodes.links.push({ source: a, target: b });
      }
    }
  });

  return nodes;
}

async function matchThemes(representations: tf.Tensor2D): Promise<number[][]> {
  const similarities = tf.tidy(() => {
    const norms = tf.norm(representations, "euclidean", 1, true).add(1e-12);
    const normalizedRepresentations = representations.div(norms);
    return tf.matMul(
      normalizedRepresentations,
      normalizedThemeEmbeddings!,
      false,
      true,
    );
  });

  try {
    const similarityMatrix = (await similarities.array()) as number[][];
    return theHungarian.compute(
      similarityMatrix.map((row) => row.map((score) => 1 - score)),
    );
  } finally {
    similarities.dispose();
  }
}

async function buildLdaTree(
  sentences: string[],
  tokenCount: number,
): Promise<NodeTree | null> {
  const topicCount = calculateLdaTopicCount(tokenCount, sentences.length);
  const topics = lda(sentences, topicCount, 5);
  if (topics.length === 0) return null;

  const termsByTopic = topics.map((topic) => topic.map(({ term }) => term));
  const flattenedTerms = termsByTopic.flat();
  if (flattenedTerms.length === 0) return null;

  const termEmbeddings = await embeddingModel!.embed(flattenedTerms);
  const topicEmbeddings = tf.tidy(() => {
    let offset = 0;
    const means = termsByTopic.map((terms) => {
      const topicSlice = termEmbeddings.slice(
        [offset, 0],
        [terms.length, termEmbeddings.shape[1]],
      );
      offset += terms.length;
      return topicSlice.mean(0);
    });
    return tf.stack(means) as tf.Tensor2D;
  });

  try {
    const themeAssignments = await matchThemes(topicEmbeddings);
    const topicTermMatrix: Record<string, TopicTerm[]> = {};

    for (const [topicIndex, themeIndex] of themeAssignments) {
      if (topicIndex >= topics.length || themeIndex >= emotionalThemes.length) continue;
      topicTermMatrix[emotionalThemes[themeIndex]] = topics[topicIndex];
    }

    return buildNodes(topicTermMatrix);
  } finally {
    termEmbeddings.dispose();
    topicEmbeddings.dispose();
  }
}

async function buildSemanticTree(sentences: string[]): Promise<NodeTree> {
  const clusterCount = calculateClusterCount(sentences.length);
  const sentenceEmbeddings = await embeddingModel!.embed(sentences);

  try {
    const sentenceVectors = (await sentenceEmbeddings.array()) as number[][];
    const {
      assignments: sentenceAssignments,
      centroids,
    } = clusterSentenceVectors(sentenceVectors, clusterCount);
    const clusterKeywords = extractClusterKeywords(
      sentences,
      sentenceAssignments,
      clusterCount,
    );
    const projectedCentroids = projectCentroidsTo2D(centroids);
    const nodes = clusterKeywords.map((keywords, clusterIndex) => {
      const sentenceCount = sentenceAssignments.filter(
        (assignment) => assignment === clusterIndex,
      ).length;

      const [projectedX, projectedY] = projectedCentroids[clusterIndex];
      return {
        id: `semantic-cluster-${clusterIndex}`,
        name: `Cluster ${clusterIndex + 1}`,
        val: String(sentenceCount),
        group: clusterIndex,
        sentenceCount,
        keywords: keywords.map(({ term }) => term),
        centroidDimensions: centroids[clusterIndex].length,
        centroidPreview: centroids[clusterIndex]
          .slice(0, 8)
          .map((value) => Number(value.toFixed(4))),
        projectedX: Number(projectedX.toFixed(2)),
        projectedY: Number(projectedY.toFixed(2)),
        x: projectedX,
        y: projectedY,
        fx: projectedX,
        fy: projectedY,
      } as SingletonNode;
    });

    const links: NodeTree["links"] = [];
    const linkSet = new Set<string>();

    // Connect every cluster to its two closest centroid neighbors. The graph
    // layout then places semantically similar sentence clusters near each other.
    centroids.forEach((centroid, sourceIndex) => {
      const nearest = centroids
        .map((candidate, targetIndex) => ({
          targetIndex,
          similarity:
            sourceIndex === targetIndex
              ? Number.NEGATIVE_INFINITY
              : cosineSimilarity(centroid, candidate),
        }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, Math.min(2, centroids.length - 1));

      nearest.forEach(({ targetIndex, similarity }) => {
        const [a, b] = [sourceIndex, targetIndex].sort((left, right) => left - right);
        const key = `${a}-${b}`;
        if (linkSet.has(key)) return;
        linkSet.add(key);
        links.push({
          source: `semantic-cluster-${a}`,
          target: `semantic-cluster-${b}`,
          similarity,
        } as NodeTree["links"][number]);
      });
    });

    return { nodes, links };
  } finally {
    sentenceEmbeddings.dispose();
  }
}

async function analyze(text: string): Promise<DreamAnalysis> {
  if (text.length < 10 || text.length > 3000) {
    throw new Error("Text must contain between 10 and 3000 characters.");
  }

  await initialize();

  const doc = nlp.readDoc(text);
  const sentences = doc.sentences().out() as string[];
  const tokenizedSentences = tokenize(sentences);
  const tokenCount = tokenizedSentences.reduce(
    (total, sentence) => total + sentence.length,
    0,
  );
  if (sentences.length === 0 || tokenCount === 0) {
    throw new Error("Please enter a few words that can be analyzed.");
  }

  // Run the two model passes sequentially to keep peak memory and CPU
  // contention low inside the worker.
  const semanticTree = await buildSemanticTree(sentences);
  const ldaTree = await buildLdaTree(sentences, tokenCount);

  return { semanticTree, ldaTree };
}

self.addEventListener("message", async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;

  if (request.type === "warmup") {
    try {
      await initialize();
      self.postMessage({ type: "ready" });
    } catch (error) {
      self.postMessage({
        type: "warmup-error",
        error: error instanceof Error ? error.message : "Model warmup failed.",
      });
    }
    return;
  }

  try {
    const analysis = await analyze(request.text);
    self.postMessage({ type: "result", id: request.id, analysis });
  } catch (error) {
    self.postMessage({
      type: "error",
      id: request.id,
      error: error instanceof Error ? error.message : "Dream integration failed.",
    });
  }
});

export {};
