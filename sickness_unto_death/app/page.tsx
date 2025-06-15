import { Text } from "@/components/retroui/Text";
import ArtCon from "@/components/artCon";
export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-courier-prime)] bg-[#d2b48c]">
    <Text as="h2">Let the wind carry</Text>
    <div className="relative w-64 h-64">
      <ArtCon />
      </div>
    </div>
  );
}
