"use client";

import { Text } from "@/components/retroui/Text";
import ArtCon from "@/components/main_page/artCon";
import MindBlown from "@/components/main_page/mindBlown";
import ZineStack from "@/components/main_page/zineStack";
import Link from "next/link";
import Image from "next/image";
import {
  type MouseEvent,
  type VideoHTMLAttributes,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

const HOME_TILE_CLASS = "relative aspect-square h-auto w-full min-w-0 overflow-hidden rounded";
const HOME_LINK_CLASS = "block min-w-0 w-full";

interface HomeVideoProps extends VideoHTMLAttributes<HTMLVideoElement> {
  src: string;
}

function HomeVideo({ src, muted, ...props }: HomeVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [needsTap, setNeedsTap] = useState(false);
  const [hasError, setHasError] = useState(false);

  const clearLoadTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const playVideo = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = Boolean(muted);

    try {
      await video.play();
      setNeedsTap(false);
      setHasError(false);
    } catch (error) {
      if ((error as DOMException)?.name !== "AbortError") {
        setNeedsTap(true);
      }
    }
  }, [muted]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleError = () => {
      clearLoadTimeout();
      setHasError(true);
      setNeedsTap(true);
    };
    const handleCanPlay = () => clearLoadTimeout();
    const handlePlaying = () => {
      clearLoadTimeout();
      setHasError(false);
      setNeedsTap(false);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          clearLoadTimeout();
          timeoutRef.current = setTimeout(() => {
            if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
              setNeedsTap(true);
            }
          }, 5000);
          void playVideo();
        } else {
          clearLoadTimeout();
          video.pause();
        }
      },
      { threshold: 0.25 },
    );

    observer.observe(video);
    video.addEventListener("error", handleError);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("playing", handlePlaying);

    return () => {
      observer.disconnect();
      video.removeEventListener("error", handleError);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("playing", handlePlaying);
      clearLoadTimeout();
    };
  }, [clearLoadTimeout, playVideo, src]);

  const handleManualPlay = async (event: MouseEvent<HTMLButtonElement>) => {
    // Consume only the first tap so the surrounding link remains usable once
    // Safari allows playback.
    event.preventDefault();
    event.stopPropagation();

    const video = videoRef.current;
    if (!video) return;

    if (hasError) video.load();
    await playVideo();
  };

  return (
    <div className="relative h-full w-full">
      <video ref={videoRef} src={src} muted={muted} {...props} />
      {needsTap && (
        <button
          type="button"
          onClick={handleManualPlay}
          className="absolute inset-0 flex cursor-pointer items-center justify-center"
          aria-label={hasError ? "Retry video" : "Play video"}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/75 text-white shadow-lg backdrop-blur-sm">
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="ml-0.5 h-4 w-4 fill-current"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </button>
      )}
    </div>
  );
}

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
            <HomeVideo 
              src="/plant.mp4" 
              poster="/plant-poster.jpg"
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
            <HomeVideo 
              src="/memories.mp4" 
              poster="/memories-poster.jpg"
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
            <HomeVideo 
              src="/sun.mp4" 
              poster="/sun-poster.jpg"
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
        <Link href="" className={HOME_LINK_CLASS}>
          <div className={HOME_TILE_CLASS}>
            <HomeVideo 
              src="/star-transparent.webm" 
              poster="/star-poster.png"
              className="h-full w-full object-contain touch-none" 
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
