"use client";

import { Text } from "@/components/retroui/Text";
import ArtCon from "@/components/main_page/artCon";
import MindBlown from "@/components/main_page/mindBlown";
import ZineStack from "@/components/main_page/zineStack";
import Link from "next/link";
import Image from "next/image";
import LazyVideo from "@/components/LazyVideo";
import { useEffect, useRef } from "react";

const HOME_TILE_CLASS = "relative aspect-square h-auto w-full min-w-0 overflow-hidden rounded";
const HOME_LINK_CLASS = "block min-w-0 w-full";

export default function Home() {
  const calamansiRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = calamansiRef.current;
    if (!img) return;

    // Restart the GIF every 10 seconds to keep it looping
    const interval = setInterval(() => {
      const currentSrc = img.src.split('?')[0];
      img.src = currentSrc + '?' + new Date().getTime();
    }, 50000);

    return () => clearInterval(interval);
  }, []);
  return (
    <div className="min-h-screen px-2 py-6 pb-12 font-[family-name:var(--font-courier-prime)] sm:p-20">
      <Text as="h3" className="-z-20 mb-5 text-center sm:mb-8">Let the wind carry</Text>
      <div className="mx-auto grid w-full max-w-[52rem] grid-cols-3 items-center gap-2 sm:gap-8">
        <Link href="/dreams" className={HOME_LINK_CLASS}>
          <ArtCon className={HOME_TILE_CLASS} />
        </Link>
        <Link href="https://canarydisambiguation.itch.io/" className={HOME_LINK_CLASS}>
          <div className={HOME_TILE_CLASS}>
            <LazyVideo 
              src="/plant.mp4" 
              className="h-full w-full object-contain touch-none" 
              loop
              muted
              playsInline
              preload="metadata"
            />
          </div>
        </Link>
        <Link href="/haplogrouper" className={HOME_LINK_CLASS}>
          <MindBlown className={HOME_TILE_CLASS} />
        </Link>
        <Link href="https://www.youtube.com/watch?v=QOowQeKyNkQ" className={HOME_LINK_CLASS}>
          <div className={HOME_TILE_CLASS}>
            <LazyVideo 
              src="/memories.mp4" 
              className="h-full w-full object-contain touch-none" 
              loop
              muted
              playsInline
              preload="metadata"
            />
          </div>
        </Link>
        <Link href="/gnostikos_session" className={HOME_LINK_CLASS}>
          <div className={HOME_TILE_CLASS}>
            <Image 
              src="/mindBlown/MOONGif2.gif" 
              alt="MOOOOOOO" 
              unoptimized={true}
              fill
              className="inset-0 object-contain transition-opacity duration-0 touch-none"
            />
          </div>
        </Link>
        <ZineStack/>
        <Link href="https://calamansi-dreamscape.printify.me/" className={HOME_LINK_CLASS}>
          <div className={HOME_TILE_CLASS}>
            <Image 
              ref={calamansiRef}
              src="/art_con/calamansi.gif" 
              alt="SHOP" 
              unoptimized={true}
              fill
              className="inset-0 object-contain transition-opacity duration-0 touch-none"
            />
          </div>
        </Link>
        <Link href="/daoist_formulas" className={HOME_LINK_CLASS}>
          <div className={HOME_TILE_CLASS}>
            <LazyVideo 
              src="/sun.mp4" 
              className="h-full w-full object-contain touch-none mix-blend-multiply" 
              loop
              muted
              playsInline
              preload="metadata"
            />
          </div>
        </Link>
        <Link href="" className={HOME_LINK_CLASS}>
          <div className={HOME_TILE_CLASS}>
            <Image 
              src="/planet.gif" 
              alt="yayyyyyyy" 
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
