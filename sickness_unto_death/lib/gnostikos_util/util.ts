import { sessionGraph } from "@/types/gnostikosTypes"

export const toForceGraph = (session: sessionGraph) => {
    return {
        nodes: Object.entries(session.nodes).map(([id, node]) => ({
        id: Number(id),
        label: node.url
        })),

        links: session.edges.map(e => ({
        source: e.from,
        target: e.to,
        step: e.step
        }))
    }
}