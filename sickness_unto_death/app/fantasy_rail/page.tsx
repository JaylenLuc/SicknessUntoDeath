import type { Metadata } from "next";
import { Text } from "@/components/retroui/Text";
import FantasyRailMap from "@/components/metro/FantasyRailMapLoader";
import FantasyRailLegend from "@/components/metro/FantasyRailLegend";

export const metadata: Metadata = {
  title: "LA Fantasy Rail",
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
      <Text as="p" className="mt-3 text-center">
        In this world, an evil is the best tool of appropriation, an ignorant is the best victim, and the Good have the most to lose.
        As time passes, there can be much grief for a lost life for which you will never get back. As time passes one such aforementioned
        evil is when our children grow up not knowing of the absolutely sublimity of human spirit and engineering they have lost through 
        time forgotten, so much so that it feels like time immemorial. It is not simply grief bu the deprivation of basic human right 
        to have our government serve us and build a community where out neighbors can live like creatures not like commodities. 
      </Text>
      <Text as="h4" className='text-center'>
        (Last updated: 2026-10-27)
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
