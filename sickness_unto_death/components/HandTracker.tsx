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
    function isFingerExtended(landmarks, tipIdx, pipIdx) {
    return landmarks[tipIdx].y < landmarks[pipIdx].y;
  }

  function recognizeGesture(landmarks) {
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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [formula, setFormula] = useState(''); // State to hold the recognized formula character
  function resizeCanvasToDisplaySize(canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    return {
      ctx,
      width: rect.width,
      height: rect.height
    };
  }
  useEffect(() => {
    if (typeof window === 'undefined' || !videoRef.current) return;

    let stream = null;
    let handsInstance = null;
    let animationFrameId = null;

    const HandsClass = window.Hands;
    if (!HandsClass) return;

    handsInstance = new HandsClass({
      locateFile: (file) => `/${file}`
    });

    handsInstance.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

  handsInstance.onResults((results) => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;

    const resized = resizeCanvasToDisplaySize(canvasEl);
    if (!resized) return;

    const { ctx, width: w, height: h } = resized;

    ctx.clearRect(0, 0, w, h);

    const connections = window.HAND_CONNECTIONS || [];

    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      setFormula((prevFormula) => (prevFormula === '' ? prevFormula : ''));
      return;
    }

    for (const landmarks of results.multiHandLandmarks) {
      ctx.strokeStyle = '#00FF88';
      ctx.lineWidth = 3;

      for (const [startIdx, endIdx] of connections) {
        const a = landmarks[startIdx];
        const b = landmarks[endIdx];

        ctx.beginPath();
        ctx.moveTo(a.x * w, a.y * h);
        ctx.lineTo(b.x * w, b.y * h);
        ctx.stroke();
      }

      ctx.fillStyle = '#FF0066';

      const gesture = recognizeGesture(landmarks);
      const nextFormula = gesture ? GESTURE_TO_CHARACTER[gesture] : '';
      setFormula((prevFormula) => (prevFormula === nextFormula ? prevFormula : nextFormula));

      for (const point of landmarks) {
        ctx.beginPath();
        ctx.arc(point.x * w, point.y * h, 4, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  });

    const processVideoFrame = async () => {
      if (videoRef.current?.readyState === videoRef.current?.HAVE_ENOUGH_DATA && handsInstance) {
        try {
          await handsInstance.send({ image: videoRef.current });
        } catch (err) {
          console.error("Frame processing error:", err);
        }
      }
      animationFrameId = requestAnimationFrame(processVideoFrame);
    };

    navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
      .then((userStream) => {
        stream = userStream;
        if (videoRef.current) {
          videoRef.current.srcObject = userStream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            if (canvasRef.current) {
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;
              }
            animationFrameId = requestAnimationFrame(processVideoFrame);
          };
        }
      })
      .catch((err) => console.error("Webcam access error:", err));

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (handsInstance) handsInstance.close();
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, []);

  return (
    <div>
      <div className="mb-4 mx-auto w-full max-w-md relative aspect-[4/3] border rounded overflow-hidden bg-[#25cb91]">
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