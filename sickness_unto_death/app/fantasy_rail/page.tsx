"use client";

import Image from "next/image";
import { Text } from "@/components/retroui/Text";
import FantasyRailMap from "@/components/metro/FantasyRailMapLoader";

export default function FantasyRail() {
  return (
    <div className="flex min-h-screen flex-col px-4 py-6 font-[family-name:var(--font-courier-prime)] sm:p-8">
      <Text as="h3" className='text-center'>
        Revival of the Relict Los Angeles Rail System
      </Text>
      <div className="mt-6 aspect-[4/3] w-full max-w-[1000px] min-w-0 self-center overflow-hidden">
        <FantasyRailMap />
      </div>
      <Image
        src="/la-metro-rail/legend_1.png"
        alt="Fantasy rail network legend"
        width={4500}
        height={2775}
        sizes="(max-width: 700px) calc(100vw - 2rem), 1000px"
        className="mt-6 h-auto w-full max-w-[1000px] self-center"
      />
    </div>
  );
}
