'use client';
import React, { useEffect, useRef } from 'react';

export default function HandTracker() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

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

    // ---- Draw the results onto the overlay canvas ----
    handsInstance.onResults((results) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      const connections = window.HAND_CONNECTIONS || [];

      if (results.multiHandLandmarks) {
        for (const landmarks of results.multiHandLandmarks) {
          // Draw the bones (connections between landmarks)
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

          // Draw the joints (the 21 landmark points)
          ctx.fillStyle = '#FF0066';
          for (const point of landmarks) {
            ctx.beginPath();
            ctx.arc(point.x * w, point.y * h, 4, 0, 2 * Math.PI);
            ctx.fill();
          }
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
            // Match canvas pixel size to the video so coordinates line up
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
    <div style={{ position: 'relative', width: '640px', height: '480px', margin: '0 auto' }}>
      <video
        ref={videoRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '640px',
          height: '480px',
          transform: 'scaleX(-1)',   // mirror so it feels like a mirror
          backgroundColor: '#000',
          objectFit: 'cover'
        }}
        playsInline
        muted
      />
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '640px',
          height: '480px',
          transform: 'scaleX(-1)',   // mirror to match the video
          pointerEvents: 'none'
        }}
      />
    </div>
  );
}