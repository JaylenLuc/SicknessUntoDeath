import { cn } from '@/lib/utils';
import Image from 'next/image';

export default function Dreams() {
  return (
    <div className="flex flex-col min-h-screen sm:p-20 font-[family-name:var(--font-courier-prime)] bg-[#d2b48c] overflow-hidden">
      Dreams
      <div className="flex-1" />
      <div className="mx-auto w-96 h-96">
        <Image
          key={0}
          src={"/mindBlown/dream1.png"}
          alt={`frame-0`}
          fill
          className={cn(
            "object-contain transition-opacity duration-0"
          )}
        />
      </div>
    </div>
  );
}