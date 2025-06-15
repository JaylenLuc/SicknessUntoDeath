"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

type StopMotionProps = {
    images: string[];          // Array of image paths
    frameDuration?: number;    // How long each image stays visible (ms)
    pauseDuration?: number;    // How long it's hidden between frames (ms)
    size?: 'sm' | 'md' | 'lg'// Size of the component

};

export default function StopMotion({
    images,
    frameDuration = 500,
    pauseDuration = 500,
    size = 'md',
}: StopMotionProps) {
  const [frameIndex, setFrameIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setVisible((prev) => !prev);
      if (!visible) {
        setFrameIndex((prevIndex) => (prevIndex + 1) % images.length);
      }
    }, visible ? frameDuration : pauseDuration);

    return () => clearTimeout(timeout);
  }, [visible, frameIndex, frameDuration, pauseDuration, images.length]);

  return (
    <div
    className={cn(
        "relative",
        size === "sm" && "w-32 h-32",
        size === "md" && "w-64 h-64",
        size === "lg" && "w-96 h-96"
      )}
    >
      {visible && (
        <Image
          src={images[frameIndex]}
          alt={`frame-${frameIndex}`}
          fill
          className="object-contain"
        />
      )}
    </div>
  );
}
