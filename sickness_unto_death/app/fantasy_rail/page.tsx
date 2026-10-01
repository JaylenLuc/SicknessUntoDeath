"use client";

import { Text } from "@/components/retroui/Text";
import FantasyRailMap from "@/components/metro/FantasyRailMapLoader";

export default function FantasyRail() {
  return (
    <div className="flex min-h-screen flex-col p-8 font-[family-name:var(--font-courier-prime)]">
      <Text as="h3" className='text-center'>
        Revival of the Relict Los Angeles Rail System
      </Text>
      <div className="mt-6 h-[70vh] min-h-[400px] w-[50vw] min-w-0 overflow-hidden justify-self-center self-center">
        <FantasyRailMap />
      </div>
    </div>
  );
}
