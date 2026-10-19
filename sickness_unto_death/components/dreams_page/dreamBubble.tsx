import StopMotion from "../stopMotion";

const DREAM_BUBBLE_FRAMES = [
  "/mindBlown/cloud1.webp",
  "/mindBlown/cloud2.webp",
  "/mindBlown/cloud3.webp",
  "/mindBlown/cloud4.webp",
  "/mindBlown/cloud_last.webp",
  "/mindBlown/cloud_last_2.webp",
  "/mindBlown/cloud_last_3.webp",
  "/mindBlown/cloud_last_2.webp",
  "/mindBlown/cloud_last.webp",
  "/mindBlown/cloud4.webp",
  "/mindBlown/cloud3.webp",
  "/mindBlown/cloud2.webp",
];

export default function DreamBubble() {
  return (
      <StopMotion
        images={DREAM_BUBBLE_FRAMES}
        frameDuration={200}
        size="lg"
      />
  );
}
