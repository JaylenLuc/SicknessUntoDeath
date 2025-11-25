import { Text } from "@/components/retroui/Text";
import ArtCon from "@/components/main_page/artCon";
import MindBlown from "@/components/main_page/mindBlown";
import ZineStack from "@/components/main_page/zineStack";
import Link from "next/link";
import Image from "next/image";
export default function Home() {
  return (
    <div className="justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-courier-prime)]">
      <Text as="h3" className="text-center -z-20">Let the wind carry</Text>
      <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-8">
        <Link href="/dreams">
          <ArtCon />
        </Link>
        <Link href="/haplogrouper">
          <MindBlown />
        </Link>
        <div className = "relative overflow-hidden w-64 h-64">
          <Image 
            src="/mindBlown/MOONGif2.gif" 
            alt="MOOOOOOO" 
            unoptimized={true}
            fill
            className="inset-0 object-contain transition-opacity duration-0 touch-none"
          />
        </div>
        <ZineStack/>
        <Link href="https://calamansi-dreamscape.printify.me/">
          <div className = "relative overflow-hidden w-64 h-64">
            <Image 
              src="/art_con/calamansi.gif" 
              alt="SHOP" 
              unoptimized={true}
              fill
              className="inset-0 object-contain transition-opacity duration-0 touch-none"
            />
          </div>
        </Link>
      </div>
    </div>
  );
}
