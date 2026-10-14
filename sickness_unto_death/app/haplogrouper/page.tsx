"use client"

import { Text } from "@/components/retroui/Text";
import {initializeTree,returnPhyloTree , returnXMLString} from "@/lib/haplogrouper_util/haplogroupClassifier";
import { loadYFullTree } from "@/lib/haplogrouper_util/yFullTree";
import { Button } from "@/components/retroui/Button";
import { useState } from "react";
//import { D3PhyloTreeV1 } from "@/components/haplo_page/phyloTreeVisualArtVariant1";
import { D3PhyloTree } from "@/components/haplo_page/phyloTreeVisual";
import { node } from "@/types/haplogroupClassifierTypes";
import { D3PhyloTreeV1 } from "@/components/haplo_page/phyloTreeVisualArtVariant1";
import { YFullTreeVisual } from "@/components/haplo_page/yFullTreeVisual";
import type { YFullNode, YFullTreeStats } from "@/types/yFullTypes";
export default function Haplogrouper() {
  const [xmlTree, setXmlTree] = useState<string | null>(null);
  const [phyloTree, setPhyloTree] = useState<null | node>(null);
  const [stub, setStub] = useState<string>("");
  const [showMtDnaTree, setShowMtDnaTree] = useState(false);
  const [yFullTree, setYFullTree] = useState<YFullNode | null>(null);
  const [yFullStats, setYFullStats] = useState<YFullTreeStats | null>(null);
  const [showYDnaTree, setShowYDnaTree] = useState(false);
  const [loadingTree, setLoadingTree] = useState<"y" | "mt" | null>(null);
  const [treeError, setTreeError] = useState<string | null>(null);

  const toggleYDnaTree = async () => {
    if (showYDnaTree) {
      setShowYDnaTree(false);
      return;
    }

    setShowMtDnaTree(false);
    setTreeError(null);
    if (!yFullTree) {
      setLoadingTree("y");
      try {
        const { tree, stats } = await loadYFullTree();
        setYFullTree(tree);
        setYFullStats(stats);
      } catch (error) {
        setTreeError(error instanceof Error ? error.message : "Unable to load the Y-DNA tree");
        return;
      } finally {
        setLoadingTree(null);
      }
    }
    setShowYDnaTree(true);
  };

  const toggleMtDnaTree = async () => {
    if (showMtDnaTree) {
      setShowMtDnaTree(false);
      return;
    }

    setShowYDnaTree(false);
    setTreeError(null);
    if (!phyloTree) {
      setLoadingTree("mt");
      try {
        await initializeTree();
        setXmlTree(returnXMLString());
        setPhyloTree(returnPhyloTree());
      } catch (error) {
        setTreeError(error instanceof Error ? error.message : "Unable to load the mtDNA tree");
        return;
      } finally {
        setLoadingTree(null);
      }
    }
    setShowMtDnaTree(true);
  };
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

      <div className="mx-auto mb-8 flex flex-wrap justify-center gap-3">
        <Button
          type="button"
          className="bg-[#b9d3ba] hover:bg-[#a8c7aa]"
          aria-expanded={showYDnaTree}
          aria-controls="ydna-tree-results"
          disabled={loadingTree !== null}
          onClick={toggleYDnaTree}
        >
          {loadingTree === "y" ? "Loading Y-DNA…" : `${showYDnaTree ? "Hide" : "Explore"} Y-DNA tree`}
        </Button>
        <Button
          type="button"
          variant="outline"
          aria-expanded={showMtDnaTree}
          aria-controls="mtdna-tree-results"
          disabled={loadingTree !== null}
          onClick={toggleMtDnaTree}
        >
          {loadingTree === "mt" ? "Loading mtDNA…" : `${showMtDnaTree ? "Hide" : "Explore"} mtDNA tree`}
        </Button>
      </div>

      {treeError && (
        <p role="alert" className="mx-auto mb-6 rounded-lg border-2 border-black bg-red-100 p-3">
          {treeError}
        </p>
      )}

      {showYDnaTree && yFullTree && yFullStats && (
        <section id="ydna-tree-results" className="h-[calc(100dvh-2rem)] min-h-[42rem]">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <Text as="h3">YFull Y-DNA tree</Text>
            <a
              href="https://github.com/YFullTeam/YTree"
              target="_blank"
              rel="noreferrer"
              className="text-sm underline underline-offset-2"
            >
              Data: YFull YTree · CC BY 4.0
            </a>
          </div>
          <YFullTreeVisual tree={yFullTree} stats={yFullStats} />
        </section>
      )}

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
