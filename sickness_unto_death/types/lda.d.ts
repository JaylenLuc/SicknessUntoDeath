declare module 'lda' {
  export interface TopicTerm {
    term: string;
    probability: number;
  }

  /**
   * Perform Latent Dirichlet Allocation.
   *
   * @param documents - Array of documents (each is a string)
   * @param numberOfTopics - Number of topics to find
   * @param termsPerTopic - Number of terms per topic to return
   */
  export default function lda(
    documents: string[],
    numberOfTopics: number,
    termsPerTopic: number
  ): TopicTerm[][];
  export interface SingletonNode {
    "id": string,
    "name": string,
    "val": string
  }
  export interface Link {
    "source": string,
    "target": string
  }
  export interface NodeTree  {
    "nodes": SingletonNode[];
    "links": Link[],
  }
}
