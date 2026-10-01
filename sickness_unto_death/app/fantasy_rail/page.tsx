"use client";

import { Text } from "@/components/retroui/Text";
import FantasyRailMap from "@/components/metro/FantasyRailMapLoader";

export default function FantasyRail() {
  return (
    <div className="flex min-h-screen flex-col p-8 font-[family-name:var(--font-courier-prime)]">
      <Text as="h3" className='text-center'>
        Revival of the Relict Los Angeles Rail System
      </Text>
      <div className="mt-6 aspect-[4/3] w-[min(90vw,1000px)] min-w-0 overflow-hidden self-center">
        <FantasyRailMap />
      </div>
    </div>
  );
}
