"use client";
import { useEffect, useRef, useState } from 'react';

interface LazyVideoProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  src: string;
}

export default function LazyVideo({ src, ...props }: LazyVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handleError = () => {
      setHasError(true);
    };

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
    videoElement.addEventListener('error', handleError);

    return () => {
      observer.disconnect();
      videoElement.removeEventListener('error', handleError);
    };
  }, []);

  if (hasError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black text-white text-center p-4">
        <p className="text-sm">portal isn't showing, it may be because low power mode is on</p>
      </div>
    );
  }

  return (
    <video ref={videoRef} src={src} {...props} />
  );
}
