import winkNLP from 'wink-nlp';
import model from 'wink-eng-lite-web-model';
import lda from '@stdlib/nlp-lda';
const nlp = winkNLP(model);
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
    const ldaModel = lda(sentences, 10, { 
        alpha: 0.1,
        beta: 0.01,
    });
    ldaModel.fit( 1000, 100, 10 );
    const words = ldaModel.getTerms( 0, 10 );
    console.log("-> ",words);


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