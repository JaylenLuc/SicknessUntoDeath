export declare interface node {
    name: string | null,
    mutations: Array<string>,
    accessionNr: string,
    reference: string,
    children: Array<node>
};
