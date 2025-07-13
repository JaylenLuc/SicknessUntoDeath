import { cn } from '@/lib/utils';
import Image from 'next/image';
import DreamBubble from '@/components/dreams_page/dreamBubble';
import { Text } from "@/components/retroui/Text";
export default function Dreams() {
  return (
    <div className="flex flex-col items-center min-h-screen sm:p-2 font-[family-name:var(--font-courier-prime)] bg-[#d2b48c] overflow-hidden">
      <Text as="h2" className="text-center">As Deep as the Ocean, As Grounded as the Soil</Text>
      <div className="flex flex-col pt-8 items-center flex-1 justify-end">
        <div className="mb-16">
          <DreamBubble/>
        </div>
        <div className="w-96 h-96 mt-8">
          <Image
            key={0}
            src={"/mindBlown/dream1.png"}
            alt={`frame-0`}
            fill
            className={cn(
              "object-contain transition-opacity duration-0 z-10"
            )}
          />
        </div>
      </div>
    </div>
  );
}