  'use client';

  import React, { useEffect, useRef, useState } from 'react';

  export default function HandTracker() {
    const GESTURE_TO_CHARACTER = {
      fist: '石',
      one: '一',
      two: '二',
      three: '三',
      open: '手',
      four: '四',
      goldenDragonSeal: '黄金雙龍印'
    };

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [formula, setFormula] = useState('');
    const [videoAspectRatio, setVideoAspectRatio] = useState('4 / 3');

 const SWAP_HANDEDNESS = true;
  const FLIP_PALM_SIGN = false;

  function handLabel(hand: any) {
    if (!SWAP_HANDEDNESS) return hand.label;
    return hand.label === 'Left' ? 'Right' : hand.label === 'Right' ? 'Left' : hand.label;
  }

  function palmSide(landmarks: any[]) {
    const wrist = landmarks[0];
    const indexMcp = landmarks[5];
    const pinkyMcp = landmarks[17];

    const side = Math.sign(
      (indexMcp.x - wrist.x) * (pinkyMcp.y - wrist.y) -
        (indexMcp.y - wrist.y) * (pinkyMcp.x - wrist.x)
    );

    return FLIP_PALM_SIGN ? side * -1 : side;
  }

  function normalizedPalmSide(hand: any) {
    const label = handLabel(hand);
    return label === 'Left' ? hand.side * -1 : hand.side;
  }

  function isPalmFacingCamera(hand: any) {
    return normalizedPalmSide(hand) > 0;
  }

  function isBackOfHandFacingCamera(hand: any) {
    return normalizedPalmSide(hand) < 0;
  }


 function recognizeGoldenDragonSeal(results: any) {
    const hands = results.multiHandLandmarks;
    if (!hands || hands.length < 2) return false;

    const fingerMap = {
      index: [5, 6, 8],
      middle: [9, 10, 12],
      ring: [13, 14, 16],
      pinky: [17, 18, 20]
    } as const;

    type FingerName = keyof typeof fingerMap;

    function dist(a: any, b: any) {
      return Math.hypot(a.x - b.x, a.y - b.y);
    }

    function fingerIsOut(landmarks: any[], finger: FingerName) {
      const [mcp, pip, tip] = fingerMap[finger];

      const extended =
        dist(landmarks[0], landmarks[tip]) >
        dist(landmarks[0], landmarks[pip]) * 1.18;

      const horizontal =
        Math.abs(landmarks[tip].x - landmarks[mcp].x) >
        Math.abs(landmarks[tip].y - landmarks[mcp].y) * 1.15;

      return extended && horizontal;
    }

    function getOutFingers(landmarks: any[]) {
      return (Object.keys(fingerMap) as FingerName[]).filter((finger) =>
        fingerIsOut(landmarks, finger)
      );
    }

    function avgTip(landmarks: any[], fingers: FingerName[]) {
      return fingers.reduce(
        (sum, finger) => {
          const tip = fingerMap[finger][2];

          return {
            x: sum.x + landmarks[tip].x / fingers.length,
            y: sum.y + landmarks[tip].y / fingers.length,
            z: sum.z + (landmarks[tip].z || 0) / fingers.length
          };
        },
        { x: 0, y: 0, z: 0 }
      );
    }

    function avgVector(landmarks: any[], fingers: FingerName[]) {
      return fingers.reduce(
        (sum, finger) => {
          const [mcp, , tip] = fingerMap[finger];

          return {
            x: sum.x + (landmarks[tip].x - landmarks[mcp].x) / fingers.length,
            y: sum.y + (landmarks[tip].y - landmarks[mcp].y) / fingers.length
          };
        },
        { x: 0, y: 0 }
      );
    }

    const analyzedHands = hands.map((landmarks: any[], index: number) => {
      const outFingers = getOutFingers(landmarks);

      return {
        landmarks,
        label: results.multiHandedness?.[index]?.label,
        outFingers,
        count: outFingers.length,
        side: palmSide(landmarks)
      };
    });

    function hasExactOutFingers(
      outFingers: FingerName[],
      expected: FingerName[]
    ) {
      return (
        outFingers.length === expected.length &&
        expected.every((finger) => outFingers.includes(finger))
      );
    }

    const twoFingerHand = analyzedHands.find(
      (hand: any) =>
        handLabel(hand) === 'Right' &&
        isPalmFacingCamera(hand) &&
        hasExactOutFingers(hand.outFingers, ['index', 'middle'])
    );

    const threeFingerHand = analyzedHands.find(
      (hand: any) =>
        handLabel(hand) === 'Left' &&
        isBackOfHandFacingCamera(hand) &&
        hasExactOutFingers(hand.outFingers, ['index', 'middle', 'ring'])
    );



    if (!twoFingerHand || !threeFingerHand) return false;

    const twoTips = avgTip(twoFingerHand.landmarks, twoFingerHand.outFingers);
    const threeTips = avgTip(threeFingerHand.landmarks, threeFingerHand.outFingers);

    const twoVector = avgVector(twoFingerHand.landmarks, twoFingerHand.outFingers);
    const threeVector = avgVector(threeFingerHand.landmarks, threeFingerHand.outFingers);

    const tipsAreClose =
      Math.abs(twoTips.x - threeTips.x) < 0.35 &&
      Math.abs(twoTips.y - threeTips.y) < 0.2;

    const fingersFaceEachOther = twoVector.x * threeVector.x < 0;

    const twoFingerHandIsInFront =
      Math.abs(twoTips.z - threeTips.z) < 0.15 || twoTips.z < threeTips.z;
      const rightHandIsAboveLeftHand = twoTips.y < threeTips.y;


    return (
      tipsAreClose &&
      fingersFaceEachOther &&
      twoFingerHandIsInFront &&
      rightHandIsAboveLeftHand
    );



  }


  // - Index finger:
  //     - 5 = base knuckle / MCP
  //     - 6 = middle knuckle / PIP
  //     - 7 = upper knuckle / DIP
  //     - 8 = fingertip

    function isFingerExtended(landmarks: any[], tipIdx: number, pipIdx: number) {
      return landmarks[tipIdx].y < landmarks[pipIdx].y;
    }
    function isOkSign(landmarks: any[]) {
      const thumbTip = landmarks[4];
      const indexTip = landmarks[8];
      const wrist = landmarks[0];
      const middleMcp = landmarks[9];

      const handScale = Math.hypot(
        middleMcp.x - wrist.x,
        middleMcp.y - wrist.y
    );

    const thumbIndexTouching =
      Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y) <
      handScale * 0.45;

    const middle = isFingerExtended(landmarks, 12, 10);
    const ring = isFingerExtended(landmarks, 16, 14);
    const pinky = isFingerExtended(landmarks, 20, 18);

    return thumbIndexTouching && middle && ring && pinky;
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
      if (isOkSign(landmarks)) return 'three'; 
      if (extendedCount === 4) return 'four';

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

        if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
          setFormula((prevFormula) => (prevFormula === '' ? prevFormula : ''));
          return;
        }

        const isGoldenDragonSeal = recognizeGoldenDragonSeal(results);

        if (isGoldenDragonSeal) {
          setFormula((prevFormula) =>
            prevFormula === GESTURE_TO_CHARACTER.goldenDragonSeal
              ? prevFormula
              : GESTURE_TO_CHARACTER.goldenDragonSeal
          );
        } else {
          const gesture = recognizeGesture(results.multiHandLandmarks[0]);
          const nextFormula = gesture ? GESTURE_TO_CHARACTER[gesture] : '';

          setFormula((prevFormula) =>
            prevFormula === nextFormula ? prevFormula : nextFormula
          );
        }

        const connections = (window as any).HAND_CONNECTIONS || [];

        for (const landmarks of results.multiHandLandmarks) {
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 3;
          ctx.fillStyle = '#3b82f6';

          for (const [startIdx, endIdx] of connections) {
            const a = toCanvasPoint(landmarks[startIdx], videoRect);
            const b = toCanvasPoint(landmarks[endIdx], videoRect);

            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }

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
