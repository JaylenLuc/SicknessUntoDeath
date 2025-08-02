import winkNLP from 'wink-nlp';
import model from 'wink-eng-lite-web-model';
import lda, { TopicTerm } from 'lda';
import * as use from '@tensorflow-models/universal-sentence-encoder';
import * as tf from '@tensorflow/tfjs';
import { emotionalThemes } from './arrayOfDreams';
const nlp = winkNLP(model);
let embeddingModel: use.UniversalSentenceEncoder | null = null;
let labelEmbeddings: tf.Tensor2D | null = null;
let isInitialized = false;

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
  if (isInitialized && embeddingModel != null && labelEmbeddings != null) {
    console.log("model already loaded")
    return;
  }
  
  try {
    await initializeTensorFlow();
    
    console.log('Loading Universal Sentence Encoder...');
    embeddingModel = await use.load();
    console.log('Model loaded successfully');
    
    console.log('Creating label embeddings...');
    labelEmbeddings = await embeddingModel.embed(emotionalThemes) as unknown as tf.Tensor2D;
    console.log('Label embeddings created');
    
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
        const res = (Math.log(inputLength) / Math.log(1.5)) 
        return res >= MAX_TOPICS ? MAX_TOPICS : res;
}
export const ldaExecute = async (text : string) => {
    if (text.length < 10 || text,length > 3000){
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
    console.log("lda result", result);
    const topicTermMatrix :  { [key: string]: TopicTerm[] } = {}
    result.forEach(async wordGroup => {
        const listOfTerms = wordGroup.map(tt => tt['term']);
        const topic = await topicCoherence(listOfTerms);
        if (!(topic in topicTermMatrix)){
            topicTermMatrix[topic] = wordGroup
        }else{
            topicTermMatrix[topic] = [...topicTermMatrix[topic], ...wordGroup ]
        }
    });
    console.log("topic to term matrix : ", topicTermMatrix)
    return {
        topicTermMatrixLDA : topicTermMatrix
    }

}

const cosineSimilarity = (a: tf.Tensor1D, b: tf.Tensor1D): number => {
  const dotProduct = tf.dot(a, b).dataSync()[0];
  const normA = tf.norm(a).dataSync()[0];
  const normB = tf.norm(b).dataSync()[0];
  return dotProduct / (normA * normB);
};

const topicCoherence = async (topicsTerms: string[]): Promise<string> => {
if (embeddingModel === null || labelEmbeddings === null || isInitialized != true){
    return "Something went wrong";
}
    const embeddings: tf.Tensor2D = await embeddingModel.embed(topicsTerms) as unknown as tf.Tensor2D;;
    const topicEmbedding = tf.mean(embeddings, 0) as tf.Tensor1D;

    let bestLabel = '';
    let bestScore = -1;

    for (let i = 0; i < emotionalThemes.length; i++) {
        const labelEmbeddingSqueezed = tf.squeeze(
            tf.slice(labelEmbeddings as unknown as tf.Tensor2D, [i, 0], [1, labelEmbeddings.shape[1]])
        ) as tf.Tensor1D;
        const sim = cosineSimilarity(topicEmbedding, labelEmbeddingSqueezed);
        if (sim > bestScore) {
            bestScore = sim;
            bestLabel = emotionalThemes[i];
            // Clean up intermediate tensors
            labelEmbeddingSqueezed.dispose();
        }
    }
        // Clean up tensors
    embeddings.dispose();
    topicEmbedding.dispose();
    console.log("best label: ",bestLabel)
    return bestLabel;
};

const tokenize = (text: string[]) => {
    return text.map(sentence => {
        const doc = nlp.readDoc(sentence);
        return doc.tokens()
            .filter(word => word.out(nlp.its.stopWordFlag) === false && word.out(nlp.its.type) === "word")
            .out(nlp.its.normal)

    });
}


const testText = " I had a dream that I was flying over a vast ocean, the waves sparkling under the sun. Suddenly, I found myself on a beach, feeling the warm sand beneath my feet. The sky was clear, and I could see distant mountains in the horizon. I love this world world world!";