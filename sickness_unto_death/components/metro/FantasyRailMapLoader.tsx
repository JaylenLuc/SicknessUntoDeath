"use client";

import dynamic from "next/dynamic";

const FantasyRailMap = dynamic(() => import("./FantasyRailMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full" />,
});

export default function FantasyRailMapLoader() {
  return <FantasyRailMap />;
}
