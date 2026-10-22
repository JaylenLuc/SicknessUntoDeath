"use client";

import { useEffect, useMemo, useState, useRef } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

type StopMotionProps = {
    images: string[];          
    frameDuration?: number;    
    pauseDuration?: number;    
    size?: 'sm' | 'md' | 'lg';
    className?: string;

};

export default function StopMotion({
    images,
    frameDuration = 500,
    pauseDuration = 0,
    size = 'md',
    className,
}: StopMotionProps) {
  const [frameIndex, setFrameIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [decodedSources, setDecodedSources] = useState<Set<string>>(() => new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const uniqueImages = useMemo(() => [...new Set(images)], [images]);
  const allFramesDecoded = uniqueImages.every((src) => decodedSources.has(src));

  // IntersectionObserver for lazy loading
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.25 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Animation loop - only runs when visible
  useEffect(() => {
    if (!isVisible || !allFramesDecoded || images.length === 0) return;

    const interval = setInterval(() => {
      setFrameIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, frameDuration + pauseDuration);
  
    return () => clearInterval(interval);
  }, [allFramesDecoded, frameDuration, pauseDuration, images, isVisible]);
  
  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden",
        size === "sm" && "w-32 h-32",
        size === "md" && "w-64 h-64",
        size === "lg" && "w-96 h-96",
        className,
      )}
    >
      {uniqueImages.map((src) => (
        <Image
          key={src}
          src={src}
          alt=""
          aria-hidden="true"
          fill
          sizes="(max-width: 640px) 100vw, 384px"
          loading="eager"
          decoding="async"
          unoptimized
          onLoad={(event) => {
            const image = event.currentTarget;
            void image.decode().catch(() => undefined).then(() => {
              setDecodedSources((current) => {
                if (current.has(src)) return current;
                const next = new Set(current);
                next.add(src);
                return next;
              });
            });
          }}
          className={cn(
            "inset-0 object-contain [transform:translateZ(0)] [backface-visibility:hidden]",
            images[frameIndex] === src ? "z-10 opacity-100" : "z-0 opacity-0",
          )}
        />
      ))}
    </div>
  );
}
