"use client";
import { useEffect, useRef } from 'react';

interface LazyVideoProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  src: string;
}

export default function LazyVideo({ src, ...props }: LazyVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const playPromise = videoElement.play();
          if (playPromise !== undefined) {
            playPromise.catch(() => {
              // Autoplay prevented or other play error - this is fine
            });
          }
        } else {
          videoElement.pause();
        }
      },
      { threshold: 0.25 }
    );

    observer.observe(videoElement);
    return () => observer.disconnect();
  }, []);

  return (
    <video ref={videoRef} src={src} {...props} />
  );
}
