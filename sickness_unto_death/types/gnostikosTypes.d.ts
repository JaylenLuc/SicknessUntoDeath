export declare interface sessionGraph {
  nodes: {
    [nodeId: number]: {
      url: string
    }
  }

  urlToNodeId: {
    [url: string]: number
  }

  edges: {
    from: number
    to: number
    step: number
  }[]

  cursor: number | null
  step: number
}