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

interface LinkTopicStrength {
  topic: string;
  probability: number;
}

const MAX_TOPICS = 20;
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
    const embeddings = await embeddingModel.embed(emotionalThemes);
    normalizedThemeEmbeddings = tf.tidy(() => {
      const norms = tf.norm(embeddings, "euclidean", 1, true);
      return embeddings.div(norms) as tf.Tensor2D;
    });
    embeddings.dispose();
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

function calculateTopicCount(tokenCount: number, sentenceCount: number): number {
  const estimate = Math.max(1, Math.floor(Math.log(Math.max(tokenCount, 2)) / Math.log(1.7)));
  return Math.min(MAX_TOPICS, Math.max(1, sentenceCount), estimate);
}

function buildNodes(topicTermMatrix: Record<string, TopicTerm[]>): NodeTree {
  const adjacencyLinkMatrix: Record<string, LinkTopicStrength[]> = {};
  const nodes: NodeTree = { nodes: [], links: [] };

  Object.entries(topicTermMatrix).forEach(([topic, topicTermArray], index) => {
    const singletonNode: SingletonNode = {
      id: `${index}-${topic}`,
      name: topic,
      val: topic,
    };

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

async function analyze(text: string): Promise<NodeTree | null> {
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

  const topicCount = calculateTopicCount(tokenCount, sentences.length);
  const result = lda(sentences, topicCount, 5);

  if (result.length === 0) return null;

  const termsByTopic = result.map((wordGroup) =>
    wordGroup.map((topicTerm) => topicTerm.term),
  );
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

  const similarities = tf.tidy(() => {
    const normalizedTopics = topicEmbeddings.div(
      tf.norm(topicEmbeddings, "euclidean", 1, true),
    );
    return tf.matMul(
      normalizedTopics,
      normalizedThemeEmbeddings!,
      false,
      true,
    );
  });

  const similarityMatrix = (await similarities.array()) as number[][];
  termEmbeddings.dispose();
  topicEmbeddings.dispose();
  similarities.dispose();

  const assignments = theHungarian.compute(
    similarityMatrix.map((row) => row.map((score) => 1 - score)),
  );
  const topicTermMatrix: Record<string, TopicTerm[]> = {};

  for (const [topicIndex, themeIndex] of assignments) {
    if (topicIndex >= result.length || themeIndex >= emotionalThemes.length) continue;
    topicTermMatrix[emotionalThemes[themeIndex]] = result[topicIndex];
  }

  return buildNodes(topicTermMatrix);
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
    const nodeTree = await analyze(request.text);
    self.postMessage({ type: "result", id: request.id, nodeTree });
  } catch (error) {
    self.postMessage({
      type: "error",
      id: request.id,
      error: error instanceof Error ? error.message : "Dream integration failed.",
    });
  }
});

export {};
