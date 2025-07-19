"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bagOfWords = void 0;
var wink_nlp_1 = require("wink-nlp");
var wink_eng_lite_web_model_1 = require("wink-eng-lite-web-model");
var nlp = (0, wink_nlp_1.default)(wink_eng_lite_web_model_1.default);
var bagOfWords = function (text) {
    var doc = nlp.readDoc(text);
    var sentences = doc.sentences().out();
    var tokenizedSentences = tokenize(sentences);
    var vocab = tokenizedSentences.reduce(function (acc, sentence) {
        sentence.forEach(function (word) {
            if (!acc.includes(word)) {
                acc.push(word);
            }
        });
        return acc;
    }, []);
    var matrix = tokenizedSentences.map(function (sentence) {
        var vector = new Array(vocab.length).fill(0);
        sentence.forEach(function (word) {
            var index = vocab.indexOf(word);
            if (index !== -1) {
                vector[index] += 1;
            }
        });
        return vector;
    });
    return { sentences: sentences, vocab: vocab, matrix: matrix };
};
exports.bagOfWords = bagOfWords;
var tokenize = function (text) {
    return text.map(function (sentence) {
        var doc = nlp.readDoc(sentence);
        return doc.tokens()
            .filter(function (word) { return word.out(nlp.its.stopWordFlag) === false && word.out(nlp.its.type) === "word"; })
            .out(nlp.its.normal);
    });
};
var testText = " I had a dream that I was flying over a vast ocean, the waves sparkling under the sun. Suddenly, I found myself on a beach, feeling the warm sand beneath my feet. The sky was clear, and I could see distant mountains in the horizon.";
console.log((0, exports.bagOfWords)(testText));
