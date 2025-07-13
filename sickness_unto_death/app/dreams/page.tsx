import { cn } from '@/lib/utils';
import Image from 'next/image';
import DreamBubble from '@/components/dreams_page/dreamBubble';
import { Text } from "@/components/retroui/Text";
export default function Dreams() {
  return (
    <div className="flex flex-col justify-center min-h-screen sm:p-8 font-[family-name:var(--font-courier-prime)] bg-[#d2b48c] overflow-hidden">
      <Text>As deep as the Ocean, As grounded as the Soil</Text>
      <div className="flex-1 flex flex-col">
        <div className="flex justify-center">
          <DreamBubble />
        </div>
          <Image
            key={0}
            src={"/mindBlown/dream1.png"}
            alt={`frame-0`}
            fill
            className={cn(
              "transition-opacity object-contain duration-0 z-10"
            )}
          />
      </div>
    </div>
  );
}