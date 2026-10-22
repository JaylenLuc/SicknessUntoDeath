import StopMotion from "../stopMotion";

const ART_CON_FRAMES = [
  "/art_con/art_con3.webp",
  "/art_con/art_con1.webp",
  "/art_con/art_con2.webp",
  "/art_con/art_con1.webp",
];

export default function ArtCon({ className }: { className?: string }) {
  return (
      <StopMotion
        images={ART_CON_FRAMES}
        frameDuration={400}
        size="lg"
        className={className}
      />
  );
}
