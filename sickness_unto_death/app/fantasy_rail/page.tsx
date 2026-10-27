import type { Metadata } from "next";
import { Text } from "@/components/retroui/Text";
import FantasyRailMap from "@/components/metro/FantasyRailMapLoader";
import FantasyRailLegend from "@/components/metro/FantasyRailLegend";

export const metadata: Metadata = {
  title: "Inter Urbes — LA Fantasy Rail",
  description: "Human necessity.",
};

export default function FantasyRail() {
  return (
    <div className="flex min-h-screen flex-col px-4 py-6 font-[family-name:var(--font-courier-prime)] sm:p-8">
      <Text as="h3" className='text-center'>
        Revival of the Relict Los Angeles Rail System
      </Text>
      <Text as="p" className="mt-2 text-center">
        Includes: An inter-urbes fantasy rail (intra urban planned), For the great people of Los Angeles, Res Ipsa Loquitur
      </Text>
      <Text as="h4" className='text-center'>
        (Last updated: 2026-10-18)
      </Text>
      <div className="mt-6 w-full max-w-[1000px] min-w-0 self-center">
        <div className="h-[80dvh] w-full overflow-hidden sm:h-auto sm:aspect-[4/3]">
          <FantasyRailMap />
        </div>
        <FantasyRailLegend animateOnHover />
      </div>
    </div>
  );
}
