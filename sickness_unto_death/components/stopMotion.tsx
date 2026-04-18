"use client";

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

type StopMotionProps = {
    images: string[];          
    frameDuration?: number;    
    pauseDuration?: number;    
    size?: 'sm' | 'md' | 'lg'

};

export default function StopMotion({
    images,
    frameDuration = 500,
    pauseDuration = 0,
    size = 'md',
}: StopMotionProps) {
  const [frameIndex, setFrameIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
    if (!isVisible) return;

    const interval = setInterval(() => {
      setFrameIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, frameDuration + pauseDuration);
  
    return () => clearInterval(interval);
  }, [frameDuration, pauseDuration, images.length, isVisible]);
  
  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden",
        size === "sm" && "w-32 h-32",
        size === "md" && "w-64 h-64",
        size === "lg" && "w-96 h-96"
      )}
    >
      {images.map((image, index) => (
        <Image
          key={index}
          src={image}
          alt={`frame-${index}`}
          fill
          className={cn(
            "inset-0 object-contain transition-opacity duration-0",
            frameIndex === index ? "opacity-100 z-10" : "opacity-0 z-0"
          )}
        />
      ))}
    </div>
  );
}
