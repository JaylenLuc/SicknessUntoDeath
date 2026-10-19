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
      <Text as="h4" className='text-center'>
        (Last updated: 2026-10-18)
      </Text>
      <div className="mt-6 h-[80dvh] w-full max-w-[1000px] min-w-0 self-center overflow-hidden sm:h-auto sm:aspect-[4/3]">
        <FantasyRailMap />
      </div>
    </div>
  );
}
