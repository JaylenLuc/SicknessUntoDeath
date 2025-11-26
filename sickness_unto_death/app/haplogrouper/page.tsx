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
        <div className="absolute inset-0 flex items-center justify-center bg-blue-500 opacity-75">
             <D3PhyloTreeV1 phyloTree={phyloTree} />
        </div>
        <div className="absolute inset-0 flex items-center justify-center text-white z-10">
          <Text as="h3" className='text-center'>Whereof Does your Ancestral Purpose Come From ?</Text>
        </div>
      </div>

      <Button
          className="mx-auto mb-8"  
          onClick={() => {
            setStub("dih");
          }}
      >Test dih</Button>
      <Text as="h3" className='text-center'>{stub}</Text>
      <div className="rounded mx-auto text-center overflow-y-scroll h-64 w-full border p-4 rounded-xl"> 
        <pre className="whitespace-pre overflow-auto p-4">{xmlTree}</pre> 
      </div>
      <div className="m-8 mx-auto border w-full p-4 rounded-xl bg-[#b9d3ba] overflow-y-scroll">
        <D3PhyloTree phyloTree={phyloTree} />
      </div>
    </div>
  );
}
