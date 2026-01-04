"use client"

import { useEffect, useState } from "react"
import { sessionGraph } from "@/types/gnostikosTypes"
import { Text } from "@/components/retroui/Text";
enum Mode {
  EXT = 1,
  DEMO = 0,
}
export default function SessionPage() {
    const [graph, setGraph] = useState<sessionGraph | null>(null)
    const [mode, setMode] = useState<Mode>(Mode.DEMO)
    const [session, setSession] = useState(null)
  useEffect(() => {
    window.postMessage({ type: "GET_SESSION" }, "*")

    const handler = (event: MessageEvent) => {
        //is session data received from content.js the mediattor between nextJs and Background JS crawler LOGIC
        if (event.data?.type === "SESSION_DATA") {
            setSession(event.data.session)
            setMode(Mode.EXT)
            setGraph(event.data.graph)
            console.log("EXT")
        }else{
            setMode(Mode.DEMO)
            console.log("DEMO")
        }
    }

    window.addEventListener("message", handler)
    return () => window.removeEventListener("message", handler)
  }, [])

    let inner;
     if (mode === Mode.DEMO){

        inner = <h1>Gnostic Caravan not loaded or active</h1>
    }
    else if (session ===  null) {
         inner = <h1>Session not loaded</h1>
    }
    else if (graph ===  null) {
        inner = <h1>TRAVERSAL DATUM STRUCTURE NOT LOADED</h1>
    }else{
        inner = <div>
                    <h2>Nodes</h2>
                    { graph.nodes !== null && mode === Mode.EXT ? (
                        <ul>
                            {Object.entries(graph.nodes).map(([id, urlObj]) => (
                            <li key={id}>
                                {id}: {urlObj.url}
                            </li>
                            ))}
                            <h2>Edges</h2>
                            <pre>{JSON.stringify(graph.edges, null, 2)}</pre>
                        </ul>
                        ) : (<h3>Nodes are Null Gnostikos traveller not loaded...</h3>)
                    }
                </div>
    }
  return (
    <div className="flex flex-col p-8 justify-center min-h-screen sm:p-8 font-[family-name:var(--font-courier-prime)]">
      <Text as="h3" className='text-center'>Gnostikos Traversal Session </Text>
        <div className="flex-1 flex flex-col">
            <div className="flex justify-center">
                {inner}
            </div>
        </div>
    </div>
  )

}
