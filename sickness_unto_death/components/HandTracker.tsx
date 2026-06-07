  'use client';

  import React, { useEffect, useRef, useState } from 'react';

  export default function HandTracker() {
    const GESTURE_TO_CHARACTER = {
      fist: '石',
      one: '一',
      two: '二',
      three: '三',
      open: '手'
    };

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [formula, setFormula] = useState('');
    const [videoAspectRatio, setVideoAspectRatio] = useState('4 / 3');

    function isFingerExtended(landmarks: any[], tipIdx: number, pipIdx: number) {
      return landmarks[tipIdx].y < landmarks[pipIdx].y;
    }

    function recognizeGesture(landmarks: any[]) {
      const index = isFingerExtended(landmarks, 8, 6);
      const middle = isFingerExtended(landmarks, 12, 10);
      const ring = isFingerExtended(landmarks, 16, 14);
      const pinky = isFingerExtended(landmarks, 20, 18);

      const extendedCount = [index, middle, ring, pinky].filter(Boolean).length;

      if (extendedCount === 0) return 'fist';
      if (index && !middle && !ring && !pinky) return 'one';
      if (index && middle && !ring && !pinky) return 'two';
      if (index && middle && ring && !pinky) return 'three';
      if (extendedCount === 4) return 'open';

      return null;
    }

    function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement) {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);

      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      return {
        ctx,
        width: rect.width,
        height: rect.height
      };
    }

    function getVideoRect(canvas: HTMLCanvasElement, video: HTMLVideoElement) {
      const canvasRect = canvas.getBoundingClientRect();
      const videoRatio = video.videoWidth / video.videoHeight;
      const canvasRatio = canvasRect.width / canvasRect.height;

      if (canvasRatio > videoRatio) {
        const width = canvasRect.height * videoRatio;
        return {
          x: (canvasRect.width - width) / 2,
          y: 0,
          width,
          height: canvasRect.height
        };
      }

      const height = canvasRect.width / videoRatio;
      return {
        x: 0,
        y: (canvasRect.height - height) / 2,
        width: canvasRect.width,
        height
      };
    }

    function toCanvasPoint(
      point: any,
      rect: { x: number; y: number; width: number; height: number }
    ) {
      return {
        x: rect.x + point.x * rect.width,
        y: rect.y + point.y * rect.height
      };
    }

    useEffect(() => {
      if (typeof window === 'undefined' || !videoRef.current) return;

      let stream: MediaStream | null = null;
      let handsInstance: any = null;
      let animationFrameId: number | null = null;

      const HandsClass = (window as any).Hands;
      if (!HandsClass) return;

      handsInstance = new HandsClass({
        locateFile: (file: string) => `/${file}`
      });

      handsInstance.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      handsInstance.onResults((results: any) => {
        const canvasEl = canvasRef.current;
        const videoEl = videoRef.current;
        if (!canvasEl || !videoEl) return;

        const resized = resizeCanvasToDisplaySize(canvasEl);
        if (!resized) return;

        const { ctx, width: w, height: h } = resized;
        const videoRect = getVideoRect(canvasEl, videoEl);

        ctx.clearRect(0, 0, w, h);

        const connections = (window as any).HAND_CONNECTIONS || [];

        if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
          setFormula((prevFormula) => (prevFormula === '' ? prevFormula : ''));
          return;
        }

        for (const landmarks of results.multiHandLandmarks) {
          ctx.strokeStyle = '#38f89e';
          ctx.lineWidth = 3;
          ctx.fillStyle = '#3b3ef4';

          for (const [startIdx, endIdx] of connections) {
            const a = toCanvasPoint(landmarks[startIdx], videoRect);
            const b = toCanvasPoint(landmarks[endIdx], videoRect);

            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }

          const gesture = recognizeGesture(landmarks);
          const nextFormula = gesture ? GESTURE_TO_CHARACTER[gesture] : '';
          setFormula((prevFormula) => (prevFormula === nextFormula ? prevFormula : nextFormula));

          for (const point of landmarks) {
            const p = toCanvasPoint(point, videoRect);

            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
            ctx.fill();
          }
        }
      });

      const processVideoFrame = async () => {
        if (videoRef.current?.readyState === videoRef.current.HAVE_ENOUGH_DATA && handsInstance) {
          try {
            await handsInstance.send({ image: videoRef.current });
          } catch (err) {
            console.error('Frame processing error:', err);
          }
        }

        animationFrameId = requestAnimationFrame(processVideoFrame);
      };

      navigator.mediaDevices
        .getUserMedia({ video: { width: 640, height: 480 } })
        .then((userStream) => {
          stream = userStream;

          if (videoRef.current) {
            videoRef.current.srcObject = userStream;
            videoRef.current.onloadedmetadata = () => {
              const videoEl = videoRef.current;
              if (!videoEl) return;

              setVideoAspectRatio(`${videoEl.videoWidth} / ${videoEl.videoHeight}`);
              videoEl.play();

              animationFrameId = requestAnimationFrame(processVideoFrame);
            };
          }
        })
        .catch((err) => console.error('Webcam access error:', err));

      return () => {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        if (handsInstance) handsInstance.close();
        if (stream) stream.getTracks().forEach((track) => track.stop());
      };
    }, []);

    return (
      <div>
        <div
          className="mb-4 mx-auto w-full max-w-md relative border rounded overflow-hidden bg-black"
          style={{ aspectRatio: videoAspectRatio }}
        >
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-contain"
            style={{ transform: 'scaleX(-1)' }}
            playsInline
            muted
          />

          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full pointer-events-none"
            style={{ transform: 'scaleX(-1)' }}
          />
        </div>

        <div className="min-h-[4rem] flex flex-col justify-center items-center text-4xl">
          {formula || '\u00A0'}
        </div>
      </div>
    );
  }
