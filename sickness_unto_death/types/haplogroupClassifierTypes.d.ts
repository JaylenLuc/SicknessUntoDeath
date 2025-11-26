export declare interface node {
    name: string | null,
    mutations: Array,
    accessionNr: string,
    reference: string,
    children: Array<node>
};