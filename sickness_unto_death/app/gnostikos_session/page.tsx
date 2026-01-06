"use client"

import { useEffect, useRef, useState } from "react"
import { sessionGraph } from "@/types/gnostikosTypes"
import { Text } from "@/components/retroui/Text";
import TraverserMetadata from "@/components/gnostikos_page/traverser_metadata";
import { Button } from "@/components/retroui/Button";
import dynamic from "next/dynamic"
import { Popover } from "@/components/retroui/Popover";
const TraverserGraph = dynamic(
  () => import("@/components/gnostikos_page/traverser_graph"),
  { ssr: false }
)
enum Mode {
  EXT = 1,
  DEMO = 0,
}
export default function SessionPage() {
    const [graph, setGraph] = useState<sessionGraph | null>(null)
    const [mode, setMode] = useState<Mode>(Mode.DEMO)
    const [session, setSession] = useState(null)
    const [isFull, setFull] = useState(false)
    const [open, setOpen] = useState(false);
    const prevEdgesCountRef = useRef<number | null>(null);

    const requestSession = () => {
        window.postMessage({ type: "GET_SESSION" }, "*")
    }
    useEffect(() => {
        requestSession()

        const interval = setInterval(requestSession, 1000) 

        const handler = (event: MessageEvent) => {
            if (event.data?.type === "SESSION_DATA") {
                setSession(event.data.session)
                setMode(Mode.EXT)
                if (event.data.session.nodes.length > 200 || event.data.session.edges.length > 200){
                    setFull(true);
                    clearInterval(interval)
                    window.removeEventListener("message", handler)
                    return;
                }
                if (prevEdgesCountRef.current === null || prevEdgesCountRef.current !== event.data.session.edges.length){
                    prevEdgesCountRef.current = event.data.session.edges.length;
                    setGraph({
                        nodes: event.data.session.nodes,
                        urlToNodeId: event.data.session.urlToNodeId,
                        edges: event.data.session.edges,
                        cursor: event.data.session.cursor,
                        step: event.data.session.step
                    })
                }
 
            }
        }

        window.addEventListener("message", handler)

        return () => {
            clearInterval(interval)
            window.removeEventListener("message", handler)
        }
    }, [])

    let inner;
    if (mode === Mode.DEMO){

        inner = <h1>Gnostic Caravan not loaded or active UNDER BETA</h1>
    }
    else if (session ===  null) {
        inner = <h1>Session not loaded</h1>
    }
    else if (graph ===  null) {
        inner = <h1>TRAVERSAL DATUM STRUCTURE NOT LOADED</h1>
    }else{
        inner = <div>
                    {isFull && <h2>Caravan is full and will stop receving gnostic downloads</h2>}
                    <div className="mb-4 flex items-center justify-center">
                        <TraverserMetadata session={session}/>
                        <Button onClick={() => { 
                            window.postMessage({ type: "CLEAR_SESSION" }, "*")
                            setGraph({
                                nodes: {},
                                urlToNodeId: {},
                                edges: [],
                                cursor: null,
                                step: 0
                            })
                            setFull(false);
                        }}
                        > 
                            Clean Caravan
                        </Button>
                    </div>
                    <div className="mb-4 flex items-center justify-center">
                        <TraverserGraph session={graph}/>
                    </div>
                </div>
    }
  return (
    <div className="flex flex-col p-8 justify-center min-h-screen sm:p-8 font-[family-name:var(--font-courier-prime)]">
        <div className="flex items-center justify-between mb-4">
            <div className="flex-1 flex-col items-center text-center">
                <Text as="h3">Gnostikos Traversal Session BETA</Text>
                <Text className="text-sm mt-1 opacity-80">Gnostikos Traversal — 200 edges/nodes max</Text>
            </div>
            <Popover open={open} onOpenChange={setOpen}>
                <Popover.Trigger asChild>
                    <div
                    onMouseEnter={() => setOpen(true)}
                    onMouseLeave={() => setOpen(false)}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setOpen(false)}
                    >
                    <a href="/gnostikos_traverser_EXT.zip" download>
                        <Button className="ml-4 w-auto">Download chrome extension</Button>
                    </a>
                    </div>
                </Popover.Trigger>

                <Popover.Content side="bottom" align="end" className="w-72 font-[family-name:var(--font-courier-prime)]">
                    <Text>
                        This extension contains the Chrome Gnostikos Traverser; go to{" "}
                        <code className="font-mono">chrome://extensions/</code> then click{" "}
                        <strong>Load unpacked</strong>. Locate your von Neuman probe and load it in. 
                        I am not harvesting any data and all traversal data is stored locally in your browser.
                    </Text>
                </Popover.Content>
            </Popover>
        </div>
        <div className="flex-1 flex-row">
    
            <div className="flex justify-center">
                <div className="mb-4 flex items-center justify-center">{inner}</div>
            </div>
        </div>
    </div>
  )

}
