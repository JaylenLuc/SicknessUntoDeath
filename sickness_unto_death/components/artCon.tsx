import StopMotion from "./stopMotion";

export default function ArtCon() {
  const images = [
    "/art_con/art_con3.png",
    "/art_con/art_con1.png",
    "/art_con/art_con2.png",
    "/art_con/art_con1.png",
  ];

  return (
      <StopMotion
        images={images}
        frameDuration={500}
        pauseDuration={0}
        size="lg"
      />
  );
}