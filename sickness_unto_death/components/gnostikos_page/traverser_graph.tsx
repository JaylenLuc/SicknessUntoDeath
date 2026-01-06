import { toForceGraph } from "@/lib/gnostikos_util/util"
import { sessionGraph } from "@/types/gnostikosTypes"
import { useMemo, useRef } from "react"
import ForceGraph2D from "react-force-graph-2d"

export default function TraverserGraph  ({ session }: { session: sessionGraph })  {
  const fgRef = useRef<any>(null)
  const graphData = useMemo(
    () => toForceGraph(session),
    [session]
  )

  return (
    <div className="border-2 border-blue-500 border-dashed overflow-auto max-h-[80vh] max-w-[80vw] p-2">
        <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        nodeLabel="label"
        nodeAutoColorBy="id"
        linkDirectionalArrowLength={6}
        linkDirectionalArrowRelPos={1}
        cooldownTicks={500}    
        d3VelocityDecay={0.1}
        nodeCanvasObject={(node: { id: number | null; x: any; y: any }, ctx: { beginPath: () => void; arc: (arg0: any, arg1: any, arg2: number, arg3: number, arg4: number) => void; fillStyle: any; fill: () => void }) => {
            const isActive = node.id === session.cursor
            const radius = isActive ? 7 : 4

            ctx.beginPath()
            ctx.arc(node.x!, node.y!, radius, 0, 2 * Math.PI)
            ctx.fillStyle = isActive ? "brown" : (node as any).color
            ctx.fill()
        }}

        onEngineStop={() => {
            fgRef.current?.d3Force("charge")?.strength(0)
            fgRef.current?.d3Force("link")?.strength(0)
      }}
        linkLabel={(link: { step: any }) => `step ${link.step}`}
        />
    </div>
  )
}
