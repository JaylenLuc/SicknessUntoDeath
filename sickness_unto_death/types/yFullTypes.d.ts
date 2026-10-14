export type YFullAge = number | "-";

export interface YFullNode {
  id: string;
  snps: string;
  formed: YFullAge;
  formedlowage: YFullAge;
  formedhighage: YFullAge;
  tmrca: YFullAge;
  tmrcalowage: YFullAge;
  tmrcahighage: YFullAge;
  children: YFullNode[];
}

export interface YFullTreeStats {
  nodeCount: number;
  snpCount: number;
}
