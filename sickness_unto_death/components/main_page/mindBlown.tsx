import StopMotion from "../stopMotion";

export default function MindBlown() {
  const images = [
    "/mindBlown/mind_explosion1.png",
    "/mindBlown/mind_explosion1-5.png",
    "/mindBlown/mind_explosion2.png",
    "/mindBlown/mind_explosion3.png",
    "/mindBlown/mind_explosion4.png",
    "/mindBlown/mind_explosion.png",
    "/mindBlown/mind_explosion4.png",
    "/mindBlown/mind_explosion3.png",
    "/mindBlown/mind_explosion2.png",
    "/mindBlown/mind_explosion1-5.png",
  ];

  return (
      <StopMotion
        images={images}
        frameDuration={400}
        size="lg"
      />
  );
}