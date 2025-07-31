import winkNLP from 'wink-nlp';
import model from 'wink-eng-lite-web-model';
let lda = require('lda');
const nlp = winkNLP(model);
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
export const ldaExecute = (text : string = testText) => {
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

}

const tokenize = (text: string[]) => {
    return text.map(sentence => {
        const doc = nlp.readDoc(sentence);
        return doc.tokens()
            .filter(word => word.out(nlp.its.stopWordFlag) === false && word.out(nlp.its.type) === "word")
            .out(nlp.its.normal)

    });
}


const testText = " I had a dream that I was flying over a vast ocean, the waves sparkling under the sun. Suddenly, I found myself on a beach, feeling the warm sand beneath my feet. The sky was clear, and I could see distant mountains in the horizon. I love this world world world!";