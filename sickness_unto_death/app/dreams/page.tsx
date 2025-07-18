"use client"
import { cn } from '@/lib/utils';
import Image from 'next/image';
import DreamBubble from '@/components/dreams_page/dreamBubble';
import { Text } from "@/components/retroui/Text";
import { Button } from "@/components/retroui/Button";
import { bagOfWords } from '@/lib/dreams_util/LDA';
export default function Dreams() {
  return (
    <div className="flex flex-col justify-center min-h-screen sm:p-8 font-[family-name:var(--font-courier-prime)] bg-[#d2b48c] overflow-hidden">
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
        <Button
          className="mx-auto mb-8"  
          onClick={() => console.log(bagOfWords())} 
        >
          <span>Integrate</span>
        </Button>
      </div>
    </div>
  );
}