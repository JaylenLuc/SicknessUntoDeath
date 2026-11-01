import Image from "next/image";

type RailEmblemProps = {
  className?: string;
  sizes: string;
  priority?: boolean;
};

export default function RailEmblem({
  className = "",
  sizes,
  priority = false,
}: RailEmblemProps) {
  return (
    <Image
      src="/temp_logo_rail.png"
      alt="Los Angeles Omni-Rail emblem"
      width={1265}
      height={1243}
      sizes={sizes}
      priority={priority}
      className={`h-auto shrink-0 object-contain ${className}`}
    />
  );
}
