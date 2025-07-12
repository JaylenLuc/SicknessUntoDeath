import StopMotion from "../stopMotion";

export default function DreamBubble() {
  const images = [
    "/mindBlown/cloud1.png",
    "/mindBlown/cloud2.png",
    "/mindBlown/cloud3.png",
    "/mindBlown/cloud4.png",
    "/mindBlown/cloud_last.png",
    "/mindBlown/cloud_last_2.png",
    "/mindBlown/cloud_last_3.png",
    "/mindBlown/cloud_last_2.png",
    "/mindBlown/cloud_last.png",
    "/mindBlown/cloud4.png",
    "/mindBlown/cloud3.png",
    "/mindBlown/cloud2.png",
  ];

  return (
      <StopMotion
        images={images}
        frameDuration={300}
        size="lg"
      />
  );
}