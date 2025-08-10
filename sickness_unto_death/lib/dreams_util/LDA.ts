import winkNLP from 'wink-nlp';
import model from 'wink-eng-lite-web-model';
import lda, { TopicTerm, SingletonNode, NodeTree } from 'lda';
import * as use from '@tensorflow-models/universal-sentence-encoder';
import * as tf from '@tensorflow/tfjs';
import { emotionalThemes } from './arrayOfDreams';
import { Munkres } from 'munkres-js';
const theHungarian = new Munkres();
const nlp = winkNLP(model);
let embeddingModel: use.UniversalSentenceEncoder | null = null;
const themeEmbeddings: tf.Tensor1D[] = [];
let isInitialized = false;
interface LinkTopicStrength {
  topic : string;
  probability: number;
}
const initializeTensorFlow = async (): Promise<void> => {
  try {

    let backendInitialized = false;
    
    try {
      await tf.setBackend('webgl');
      await tf.ready();
      backendInitialized = true;
      console.log('TensorFlow.js initialized with WebGL backend');
    } catch (webglError) {
      console.warn('WebGL backend failed, trying CPU:', webglError);
      
      try {
        await tf.setBackend('cpu');
        await tf.ready();
        backendInitialized = true;
        console.log('TensorFlow.js initialized with CPU backend');
      } catch (cpuError) {
        console.error('CPU backend also failed:', cpuError);
      }
    }
    
    if (!backendInitialized) {
      throw new Error('No backend could be initialized');
    }
    
    const testTensor = tf.tensor1d([1, 2, 3]);
    testTensor.dispose();
    
    console.log('Backend verification successful:', tf.getBackend());
  } catch (error) {
    console.error('Failed to initialize TensorFlow.js:', error);
    throw new Error('TensorFlow.js initialization failed');
  }
};

const ensureModelLoaded = async (): Promise<void> => {
  if (isInitialized && embeddingModel != null && themeEmbeddings != null) {
    console.log("model already loaded")
    return;
  }
  
  try {
    await initializeTensorFlow();
    
    console.log('Loading Universal Sentence Encoder...');
    embeddingModel = await use.load();
    console.log('Model loaded successfully');
    
    console.log('Creating label embeddings...');
    for (let i = 0 ; i < emotionalThemes.length; i++){
      const embeddedEmotion = await embeddingModel.embed(emotionalThemes[i]) as unknown as tf.Tensor2D;
      const meanEmbedding = tf.mean(embeddedEmotion, 0) as tf.Tensor1D;
      embeddedEmotion.dispose();
      themeEmbeddings.push(meanEmbedding);
    }
    console.log('Label embeddings created: ', themeEmbeddings);
    
    isInitialized = true;
  } catch (error) {
    console.error('Failed to load models:', error);
    throw new Error('Model loading failed');
  }
};
const MAX_TOPICS = 40;
const lengthOfInput = (matrix : number[][]) => {
    return matrix.reduce((acc, sentence) => {
        return acc + sentence.length;
    }, 0);
}
const numberOfTopics = (inputLength : number) => {
        const res = (Math.log(inputLength) / Math.log(1.9)) 
        return res >= MAX_TOPICS ? MAX_TOPICS : res;
}
export const ldaExecute = async (text : string) => {
    if (text.length < 10 || text.length > 3000){
        throw new Error('Text invalid');
    }
    await ensureModelLoaded();
    const doc = nlp.readDoc( text );
    const sentences = doc.sentences().out();
    const tokenizedSentences = tokenize(sentences);
    console.log("tokenizedSentences", tokenizedSentences);
    const vocab = tokenizedSentences.reduce((acc, sentence) => {
        sentence.forEach(word => {
            if (!acc.includes(word)) {
                acc.push(word); 
            }
        });
        return acc;
    }, [] as string[]);
    const matrix : number[][] = tokenizedSentences.map(sentence => {
        const vector = new Array(vocab.length).fill(0);
        sentence.forEach(word => {
            const index = vocab.indexOf(word);
            if (index !== -1) {
                vector[index] += 1;
            }
        })
        return vector;  
    });
    console.log(sentences, vocab, matrix);
    const inputLength = lengthOfInput(matrix);
    const numTopics = Math.floor(numberOfTopics(inputLength));
    console.log("inputLength", inputLength, "numberOfTopics", numTopics);
    const result = lda(sentences, numTopics, 5);
    if (result.length == 0){
      return null;
    }
    console.log("lda result", result);
    const topicTermMatrix:  { [key: string]: TopicTerm[] } = {}
    const topicEmbeddings: tf.Tensor1D[] = await Promise.all(
      result.map(async wordGroup => {
        const terms = wordGroup.map(w => w.term);
        // embed returns Tensor2D (terms x embeddingDim), so you might need to average them
        const embeddings = await embeddingModel!.embed(terms) as unknown as tf.Tensor2D;
        const meanEmbedding = tf.mean(embeddings, 0) as tf.Tensor1D;
        embeddings.dispose();
        return meanEmbedding;
      })
    );

    const similarityMatrix: number[][] = topicEmbeddings.map(topicVec =>
      themeEmbeddings.map(themeVec => cosineSimilarity(topicVec, themeVec))
    );
    const costMatrix = similarityMatrix.map(row =>
      row.map(score => 1 - score)
    );
    
    const assignments = theHungarian.compute(costMatrix);
    for (const [topicIdx, themeIdx] of assignments) {
      const label = emotionalThemes[themeIdx];
      topicTermMatrix[label] = result[topicIdx];
    }
    const nodeTree = buildNodes(topicTermMatrix);
    return {
        topicTermMatrixLDA : topicTermMatrix,
        nodeTreeLDA : nodeTree
    }

}

  const buildNodes = (topicTermMatrix: {[key: string]: TopicTerm[];}) => {
    const adjacencyLinkMatrix : {[key: string] : LinkTopicStrength[];} = {}
    const nodes : NodeTree = {
      "nodes": [],
      "links": [],
    }
    const ldaEntries = Object.entries(topicTermMatrix);
    ldaEntries.forEach((entry, i) => {
      const [topic, topicTermArray] = entry;
        const singletonNode : SingletonNode = {
          "id": `${i}-${topic}`,
          "name": topic,
          "val": topic
        }
      
      nodes.nodes.push(singletonNode)
      topicTermArray.forEach(topicterm => {
        const term = topicterm.term;
        if (!(term in adjacencyLinkMatrix) ){
          adjacencyLinkMatrix[term] = [];
        }
        const topicStrengthObj = {
          topic : singletonNode.id,
          probability : topicterm.probability
        }
        adjacencyLinkMatrix[term].push(topicStrengthObj);
      })

    })
    //build the links from teh adjacency matrix
    const linkSet = new Set<string>();

    Object.values(adjacencyLinkMatrix).forEach(topicList => {
      for (let i = 0; i < topicList.length; i++) {
        for (let j = i + 1; j < topicList.length; j++) {
          const [a, b] = [topicList[i].topic, topicList[j].topic].sort();
          const key = `${a}-${b}`;
          if (!linkSet.has(key)) {
            linkSet.add(key);
            nodes.links.push({ source: a, target: b });
          }
        }
      }
    });

    //     {
    //     "nodes": [ 
    //         { 
    //           "id": "id1",
    //           "name": "name1",
    //           "val": 1 
    //         },
    //         { 
    //           "id": "id2",
    //           "name": "name2",
    //           "val": 10 
    //         },
    //         ...
    //     ],
    //     "links": [
    //         {
    //             "source": "id1",
    //             "target": "id2"
    //         },
    //         ...
    //     ]
    // }
    console.log(nodes)
    return nodes;
  }

const cosineSimilarity = (a: tf.Tensor1D, b: tf.Tensor1D): number => {
  const dotProduct = tf.dot(a, b).dataSync()[0];
  const normA = tf.norm(a).dataSync()[0];
  const normB = tf.norm(b).dataSync()[0];
  return dotProduct / (normA * normB);
};


const tokenize = (text: string[]) => {
    return text.map(sentence => {
        const doc = nlp.readDoc(sentence);
        return doc.tokens()
            .filter(word => word.out(nlp.its.stopWordFlag) === false && word.out(nlp.its.type) === "word")
            .out(nlp.its.normal)

    });
}


// const testText = " I had a dream that I was flying over a vast ocean, the waves sparkling under the sun. Suddenly, I found myself on a beach, feeling the warm sand beneath my feet. The sky was clear, and I could see distant mountains in the horizon. I love this world world world!";