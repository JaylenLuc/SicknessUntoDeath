"use client"
import { cn } from '@/lib/utils';
import Image from 'next/image';
import DreamBubble from '@/components/dreams_page/dreamBubble';
import { Text } from "@/components/retroui/Text";
import { Button } from "@/components/retroui/Button";
import type { NodeTree } from 'lda';
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import LazyVideo from '@/components/LazyVideo';
const ForceGraph2D = dynamic(() => import('../../components/dreams_page/forceGraph'), { ssr: false });

type DreamAnalysis = {
  semanticTree: NodeTree | null;
  ldaTree: NodeTree | null;
};

type SemanticClusterNode = NodeTree['nodes'][number] & {
  sentenceCount?: number;
  keywords?: string[];
  centroidDimensions?: number;
  centroidPreview?: number[];
  projectedX?: number;
  projectedY?: number;
};

type PendingIntegration = {
  resolve: (analysis: DreamAnalysis) => void;
  reject: (error: Error) => void;
};

type DreamWorkerResponse =
  | { type: 'ready' }
  | { type: 'warmup-error'; error: string }
  | { type: 'result'; id: string; analysis: DreamAnalysis }
  | { type: 'error'; id: string; error: string };

export default function Dreams() {
  const [textBubble, setTextBubble] = useState('');
  const [analysis, setAnalysis] = useState<DreamAnalysis | null>(null);
  const [treeLoadSuspense, setTreeLoadSuspense] = useState(false);
  const [integrationError, setIntegrationError] = useState('');
  const workerRef = useRef<Worker | null>(null);
  const pendingIntegrations = useRef(new Map<string, PendingIntegration>());

  useEffect(() => {
    const pending = pendingIntegrations.current;
    const worker = new Worker(
      new URL('../../lib/dreams_util/lda.worker.ts', import.meta.url),
      { type: 'module' },
    );

    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<DreamWorkerResponse>) => {
      const response = event.data;

      if (response.type === 'warmup-error') {
        console.warn('Dream model warmup failed:', response.error);
        return;
      }
      if (response.type === 'ready') return;

      const integration = pending.get(response.id);
      if (!integration) return;

      pending.delete(response.id);
      if (response.type === 'result') {
        integration.resolve(response.analysis);
      } else {
        integration.reject(new Error(response.error));
      }
    };

    worker.postMessage({ type: 'warmup' });

    return () => {
      worker.terminate();
      workerRef.current = null;
      pending.forEach(({ reject }) => {
        reject(new Error('Dream integration was cancelled.'));
      });
      pending.clear();
    };
  }, []);

  const integrateDream = (text: string): Promise<DreamAnalysis> => {
    const worker = workerRef.current;
    if (!worker) {
      return Promise.reject(new Error('Dream integration is still preparing.'));
    }

    const id = `${Date.now()}-${Math.random()}`;
    return new Promise((resolve, reject) => {
      pendingIntegrations.current.set(id, { resolve, reject });
      worker.postMessage({ type: 'analyze', id, text });
    });
  };

  const textBubbleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextBubble(event.target.value); 
  }
  
  return (
    <div className="flex flex-col p-8 justify-center min-h-screen sm:p-8 font-[family-name:var(--font-courier-prime)]">
      <Text as="h3" className='text-center'>As deep as the Ocean, As grounded as the Soil</Text>
      <div className="flex-1 flex flex-col">
        <div className="flex justify-center">
          <DreamBubble />
        </div>
        <div className="relative mx-auto w-full max-w-md aspect-square mt-auto mb-8">
          <Image
            key={0}
            src={"/mindBlown/dream1.png"}
            alt={`frame-0`}
            fill
            className={cn(
              "object-contain z-10"
            )}
          />
        </div>
        <form className="relative mx-auto w-full max-w-md aspect-square mt-auto mb-8 overflow-hidden">
          <Image 
            src="/mindBlown/notes.png"
            alt="note page"
            fill
            className="object-contain -z-10 rounded-md pointer-events-none"
          />

          {/* Scrollable and clipped input area, aligned to note area */}
          <div className="absolute top-[20%] left-[15%] right-[10%] bottom-[20%] overflow-hidden">
            <textarea
              onChange={e => textBubbleChange(e)}
              placeholder="Letter from yourself to yourself"
              value={textBubble}
              className="w-full min-h-full resize-none bg-transparent text-black placeholder-gray-500 focus:outline-none"
            />
          </div>
        </form>
        {treeLoadSuspense && (
          <div className="mb-4 mx-auto max-w-md w-full relative aspect-square border rounded overflow-hidden">
            <LazyVideo
              src="/mindBlown/cat.mp4"
              className="h-full w-full object-contain touch-none"
              loop
              muted
              playsInline
              preload="metadata"
            />
          </div>
        )}

        {!treeLoadSuspense && analysis && (
          <div className="mx-auto mb-4 w-full max-w-md space-y-8">
            <section>
              <h4 className="text-center text-lg font-bold">
                Spherical k-means sentence clusters
              </h4>
              <p className="mb-2 text-center text-sm">
                Complete sentences are embedded into 512 dimensions and grouped
                with spherical k-means using cosine similarity. PCA projects the
                centroids onto fixed 2D coordinates; nodes do not move.
              </p>
              {analysis.semanticTree?.nodes?.length ? (
                <div className="relative aspect-square overflow-hidden rounded border">
                  <ForceGraph2D graphData={analysis.semanticTree} />
                </div>
              ) : (
                <p className="text-center text-sm">No semantic clusters found.</p>
              )}

              {analysis.semanticTree?.nodes?.length ? (
                <details className="mt-3 rounded border bg-white/70 p-3 text-sm">
                  <summary className="cursor-pointer font-bold">
                    View spherical k-means centroid data
                  </summary>
                  <p className="mt-2 text-xs">
                    Each centroid is normalized. The first 8 dimensions are shown
                    from its full 512-dimensional vector.
                  </p>
                  <div className="mt-3 space-y-3">
                    {(analysis.semanticTree.nodes as SemanticClusterNode[]).map((node) => (
                      <div key={node.id} className="rounded border bg-white p-2">
                        <div className="font-bold">{node.name}</div>
                        <div>{node.sentenceCount ?? 0} sentence(s)</div>
                        <div>
                          Keywords: {node.keywords?.join(', ') || 'none'}
                        </div>
                        <code className="mt-1 block break-all text-xs">
                          centroid[{node.centroidDimensions ?? 512}]: [
                          {node.centroidPreview?.join(', ') || ''}, …]
                        </code>
                        <code className="mt-1 block text-xs">
                          PCA position: ({node.projectedX ?? 0}, {node.projectedY ?? 0})
                        </code>
                      </div>
                    ))}
                  </div>
                </details>
              ) : null}
            </section>

            <section>
              <h4 className="text-center text-lg font-bold">
                LDA bag-of-words topics
              </h4>
              <p className="mb-2 text-center text-sm">
                Word-frequency topics matched to emotional themes using embeddings
                of the LDA topic words. Sentence order and context are not preserved.
              </p>
              {analysis.ldaTree?.nodes?.length ? (
                <div className="relative aspect-square overflow-hidden rounded border">
                  <ForceGraph2D graphData={analysis.ldaTree} />
                </div>
              ) : (
                <p className="text-center text-sm">No LDA topics found.</p>
              )}
            </section>
          </div>
        )}

        {integrationError && (
          <p role="alert" className="mx-auto mb-4 max-w-md text-center text-sm text-red-700">
            {integrationError}
          </p>
        )}

        <Button
          className="mx-auto mb-8"  
          disabled={treeLoadSuspense || textBubble.length < 10 || textBubble.length > 3000}
          onClick={async () => {
            if (treeLoadSuspense === true || textBubble.length < 10 || textBubble.length > 3000){
              return;
            }
            setTreeLoadSuspense(true);
            setAnalysis(null);
            setIntegrationError('');

            // Give React a frame to mount the loading video before work starts.
            await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

            try {
              setAnalysis(await integrateDream(textBubble));
            } catch (error) {
              setIntegrationError(
                error instanceof Error ? error.message : 'Dream integration failed.',
              );
            } finally {
              setTreeLoadSuspense(false);
            }
          }} 
        >
          <span>Integrate</span>
        </Button>
      </div>
    </div>
  );
}
