"use client"
import { cn } from '@/lib/utils';
import Image from 'next/image';
import DreamBubble from '@/components/dreams_page/dreamBubble';
import { Text } from "@/components/retroui/Text";
import { Button } from "@/components/retroui/Button";
import { ldaExecute } from '@/lib/dreams_util/LDA';
import { NodeTree } from 'lda';
import { useState } from 'react';
import dynamic from 'next/dynamic';
const ForceGraph2D = dynamic(() => import('../../components/dreams_page/forceGraph'), { ssr: false });
export default function Dreams() {
  const [textBubble, setTextBubble] = useState('');
  const [nodeTree, setNodeTree] = useState<NodeTree | null>(null);

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

        {nodeTree && nodeTree.nodes?.length > 0 && nodeTree.links?.length > 0 && (
          <div className="mb-4 mx-auto max-w-md w-full relative aspect-square border rounded overflow-hidden">
            <ForceGraph2D graphData={nodeTree} />
          </div>
        )}

        <Button
          className="mx-auto mb-8"  
          onClick={async () => {
            const nodeTreeRes = await ldaExecute(textBubble);
            setNodeTree(nodeTreeRes?.nodeTreeLDA ?? null);
          }} 
        >
          <span>Integrate</span>
        </Button>
      </div>
    </div>
  );
}