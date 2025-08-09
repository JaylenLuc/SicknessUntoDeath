declare module "munkres-js" {
  export class Munkres {
    compute(costMatrix: number[][]): [number, number][];
  }
}
