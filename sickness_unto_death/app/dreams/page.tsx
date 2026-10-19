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

type PendingIntegration = {
  resolve: (nodeTree: NodeTree | null) => void;
  reject: (error: Error) => void;
};

type DreamWorkerResponse =
  | { type: 'ready' }
  | { type: 'warmup-error'; error: string }
  | { type: 'result'; id: string; nodeTree: NodeTree | null }
  | { type: 'error'; id: string; error: string };

export default function Dreams() {
  const [textBubble, setTextBubble] = useState('');
  const [nodeTree, setNodeTree] = useState<NodeTree | null>(null);
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
        integration.resolve(response.nodeTree);
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

  const integrateDream = (text: string): Promise<NodeTree | null> => {
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
        {(treeLoadSuspense === true || (nodeTree && nodeTree.nodes?.length > 0 && nodeTree.links?.length > 0)) && (
          <div className="mb-4 mx-auto max-w-md w-full relative aspect-square border rounded overflow-hidden">
            { !treeLoadSuspense ? (
              <ForceGraph2D graphData={nodeTree} />
            ) : (
                <LazyVideo 
                  src="/mindBlown/cat.mp4"
                  className="h-full w-full object-contain touch-none"
                  loop
                  muted
                  playsInline
                  preload="metadata"
                />
                // <Image 
                //   src="/mindBlown/cat.gif" 
                //   alt="The Hungarian is Optimizing Your Latent Dirichlet Clusters, Please Wait I lOve you!" 
                //   fill
                //   className="inset-0 object-contain transition-opacity duration-0 touch-none"
                // />
            )}
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
            setNodeTree(null);
            setIntegrationError('');

            // Give React a frame to mount the loading video before work starts.
            await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

            try {
              setNodeTree(await integrateDream(textBubble));
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
