import { Text } from "@/components/retroui/Text";
import ArtCon from "@/components/main_page/artCon";
export default function Home() {
  return (
    <div className="grid grid-cols-1 grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-courier-prime)] bg-[#d2b48c] overflow-hidden">
      <Text as="h2">Let the wind carry</Text>
      <ArtCon />
    </div>
  );
}
