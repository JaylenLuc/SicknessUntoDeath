'use client'; 
import { useState } from 'react';
import dynamic from 'next/dynamic';
import Script from 'next/script';
import { Text } from "@/components/retroui/Text";

const HandTracker = dynamic(() => import('../../components/HandTracker'), { ssr: false });

export default function DaoistFormulas() {
  const [isScriptReady, setIsScriptReady] = useState(false);

  return (
    <div className="flex flex-col p-8 justify-center min-h-screen sm:p-8 font-[family-name:var(--font-courier-prime)]">
      {/* TARGETING LOCAL HOSTED SCRIPT TO BYPASS CORS */}
      <Script 
        src="/mediapipe-hands.js" 
        strategy="lazyOnload"
        onLoad={() => setIsScriptReady(true)}
        onError={(e) => console.error("Local file failed to load:", e)}
      />
      
      <Text as="h3" className='text-center'>Subdue Demons Summon Spirits</Text>
      
      {isScriptReady ? (
        <HandTracker />
      ) : (
        <div className="mb-4 mx-auto max-w-md w-full relative aspect-square border rounded overflow-hidden">
          Loading Hand Tracking Engine...
        </div>
      )}
    </div>
  );
}
