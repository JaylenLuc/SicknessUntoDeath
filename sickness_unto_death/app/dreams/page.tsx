import { cn } from '@/lib/utils';
import Image from 'next/image';

export default function Dreams() {
  return (
    <div className="justify-items-center min-h-screen sm:p-20 font-[family-name:var(--font-courier-prime)] bg-[#d2b48c] overflow-hidden">
        Dreams
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-144 h-144">
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