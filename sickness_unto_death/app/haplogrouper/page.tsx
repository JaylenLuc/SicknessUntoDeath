"use client"

import { Text } from "@/components/retroui/Text";
import {initializeTree,returnPhyloTree , returnXMLString} from "@/lib/haplogrouper_util/haplogroupClassifier";
import { Button } from "@/components/retroui/Button";
import { useEffect, useState } from "react";
//import { D3PhyloTreeV1 } from "@/components/haplo_page/phyloTreeVisualArtVariant1";
import { D3PhyloTree } from "@/components/haplo_page/phyloTreeVisual";
import { node } from "@/types/haplogroupClassifierTypes";
import { D3PhyloTreeV1 } from "@/components/haplo_page/phyloTreeVisualArtVariant1";
export default function Haplogrouper() {
  const [xmlTree, setXmlTree] = useState<string | null>(null);
  const [phyloTree, setPhyloTree] = useState<null | node>(null);
  const [stub, setStub] = useState<string>("");
  const [showMtDnaTree, setShowMtDnaTree] = useState(false);

  useEffect(() => {
      initializeTree()
      .then(() => {
        setXmlTree(returnXMLString());
        setPhyloTree(returnPhyloTree());
      })

  }, []);
  return (
    <div className="flex flex-col p-8 justify-center min-h-screen sm:p-8 font-[family-name:var(--font-courier-prime)]">
      <div className="relative h-64 pointer-events-none">
        {showMtDnaTree && (
          <div className="absolute inset-0 flex items-center justify-center bg-blue-500 opacity-75">
            <D3PhyloTreeV1 phyloTree={phyloTree} />
          </div>
        )}
        <div className={`absolute inset-0 z-10 flex items-center justify-center ${showMtDnaTree ? "text-white" : "text-black"}`}>
          <Text as="h3" className='text-center'>Whereof Does your Ancestral Purpose Come From ?</Text>
        </div>
      </div>

      <Button
        type="button"
        className="mx-auto mb-8 bg-[#b9d3ba] hover:bg-[#a8c7aa]"
        aria-expanded={showMtDnaTree}
        aria-controls="mtdna-tree-results"
        onClick={() => setShowMtDnaTree((isVisible) => !isVisible)}
      >
        {showMtDnaTree ? "Hide" : "Show"} mtDNA tree (revised Cambridge Reference Sequence)
      </Button>

      {showMtDnaTree && (
        <div id="mtdna-tree-results">
          <Button
            type="button"
            className="mx-auto mb-8"
            onClick={() => {
              setStub("dih");
            }}
          >
            Test dih
          </Button>
          <Text as="h3" className='text-center'>{stub}</Text>
          <div className="mx-auto h-64 w-full overflow-y-scroll rounded-xl border p-4 text-center">
            <pre className="whitespace-pre overflow-auto p-4">{xmlTree}</pre>
          </div>
          <div className="mx-auto mt-8 h-[calc(100dvh-2rem)] min-h-80 w-full touch-pan-x touch-pan-y overflow-auto rounded-xl border bg-[#b9d3ba] p-4">
            <D3PhyloTree phyloTree={phyloTree} />
          </div>
        </div>
      )}
    </div>
  );
}
