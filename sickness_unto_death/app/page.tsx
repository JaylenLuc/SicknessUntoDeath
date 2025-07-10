import { Text } from "@/components/retroui/Text";
import ArtCon from "@/components/main_page/artCon";
import MindBlown from "@/components/main_page/mindBlown";
import Link from "next/link";
export default function Home() {
  return (
    <div className="justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-courier-prime)] bg-[#d2b48c] overflow-hidden">
      <Text as="h2" className="text-center">Let the wind carry</Text>
      <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-8">
        <ArtCon />
        <Link href="/dreams">
          <MindBlown />
        </Link>
      </div>
    </div>
  );
}
