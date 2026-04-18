"use client";
import { useEffect, useRef, useState } from 'react';

interface LazyVideoProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  src: string;
}

export default function LazyVideo({ src, ...props }: LazyVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasError, setHasError] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handleError = () => {
      setHasError(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };

    const handleLoadStart = () => {
      // Clear any existing timeout when video starts loading
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      
      // Set timeout - if video doesn't load metadata in 5 seconds, show fallback
      timeoutRef.current = setTimeout(() => {
        if (videoElement.readyState === 0) {
          // readyState 0 = HAVE_NOTHING (no data loaded)
          setHasError(true);
        }
      }, 5000);
    };

    const handleCanPlay = () => {
      // Video loaded successfully, clear timeout
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
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
    videoElement.addEventListener('loadstart', handleLoadStart);
    videoElement.addEventListener('canplay', handleCanPlay);

    return () => {
      observer.disconnect();
      videoElement.removeEventListener('error', handleError);
      videoElement.removeEventListener('loadstart', handleLoadStart);
      videoElement.removeEventListener('canplay', handleCanPlay);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (hasError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black text-white text-center p-4">
        <p className="text-sm">portal is not showing, it may be because low power mode is on</p>
      </div>
    );
  }

  return (
    <video ref={videoRef} src={src} {...props} />
  );
}
