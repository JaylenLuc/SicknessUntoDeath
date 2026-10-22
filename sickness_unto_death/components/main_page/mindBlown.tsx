import StopMotion from "../stopMotion";

const MIND_BLOWN_FRAMES = [
  "/mindBlown/mind_explosion1.webp",
  "/mindBlown/mind_explosion1-5.webp",
  "/mindBlown/mind_explosion2.webp",
  "/mindBlown/mind_explosion3.webp",
  "/mindBlown/mind_explosion.webp",
  "/mindBlown/mind_explosion3.webp",
  "/mindBlown/mind_explosion2.webp",
  "/mindBlown/mind_explosion1-5.webp",
];

export default function MindBlown({ className }: { className?: string }) {
  return (
      <StopMotion
        images={MIND_BLOWN_FRAMES}
        frameDuration={400}
        size="lg"
        className={className}
      />
  );
}
