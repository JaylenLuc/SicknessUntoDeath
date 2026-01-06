"use client";
 
import { sessionGraph } from "@/types/gnostikosTypes";
import { Button} from "../retroui/Button";
 import { Popover} from "../retroui/Popover";
 
export default function TraverserMetadata({ session }: { session: sessionGraph }) {
  return (
    <Popover>
      <Popover.Trigger asChild>
        <Button>Gnostic MetaData</Button>
      </Popover.Trigger>
        <Popover.Content className="flex flex-col p-8 justify-center sm:p-8 font-[family-name:var(--font-courier-prime)] max-w-[80vw]">
        <div className="flex-1 flex flex-col min-w-0">
            <h2>Nodes</h2>
            <div className="overflow-auto max-h-[60vh] p-2">
            {session.nodes !== null ? (
                <ul className="space-y-2">
                {Object.entries(session.nodes).map(([id, urlObj]) => (
                    <li key={id} className="break-words">
                    {id}: {urlObj.url}
                    </li>
                ))}
                <h2>Edges</h2>

                <pre className="whitespace-pre-wrap break-words text-sm">
                    {JSON.stringify(session.edges, null, 2)}
                </pre>

                </ul>
            ) : (
                <h3>Nodes are Null Gnostikos traveller not loaded...</h3>
            )}
            </div>
        </div>
        </Popover.Content>
    </Popover>
  );
}