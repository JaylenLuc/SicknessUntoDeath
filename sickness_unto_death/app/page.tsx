"use client";

import { Text } from "@/components/retroui/Text";
import ArtCon from "@/components/main_page/artCon";
import MindBlown from "@/components/main_page/mindBlown";
import ZineStack from "@/components/main_page/zineStack";
import Link from "next/link";
import Image from "next/image";
import LazyVideo from "@/components/LazyVideo";
import { useEffect, useRef } from "react";

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
    <div className="justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-courier-prime)]">
      <Text as="h3" className="text-center -z-20">Let the wind carry</Text>
      <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-8">
        <Link href="/dreams">
          <ArtCon />
        </Link>
        <Link href="https://canarydisambiguation.itch.io/">
          <div className = "relative overflow-hidden w-64 h-64 rounded">
            <LazyVideo 
              src="/plant.mp4" 
              className="inset-0 object-contain transition-opacity duration-0 touch-none" 
              loop
              muted
              playsInline
              preload="metadata"
            />
          </div>
        </Link>
        <Link href="/haplogrouper">
          <MindBlown />
        </Link>
        <Link href="https://www.youtube.com/watch?v=QOowQeKyNkQ">
          <div className = "relative overflow-hidden w-64 h-64 rounded">
            <LazyVideo 
              src="/memories.mp4" 
              className="inset-0 object-contain transition-opacity duration-0 touch-none" 
              loop
              muted
              playsInline
              preload="metadata"
            />
          </div>
        </Link>
        <Link href="/gnostikos_session">
          <div className = "relative overflow-hidden w-64 h-64">
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
        <Link href="https://calamansi-dreamscape.printify.me/">
          <div className = "relative overflow-hidden w-64 h-64">
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
        <Link href="https://en.wikipedia.org/wiki/Sun_Yat-sen">
          <div className = "relative overflow-hidden w-64 h-64 rounded">
            <LazyVideo 
              src="/sun.mp4" 
              className="inset-0 object-contain transition-opacity duration-0 touch-none mix-blend-multiply" 
              loop
              muted
              playsInline
              preload="metadata"
            />
          </div>
        </Link>
      </div>
    </div>
  );
}
