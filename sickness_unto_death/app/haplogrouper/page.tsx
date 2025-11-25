"use client"

import { Text } from "@/components/retroui/Text";
import {readAndParseTree, returnXMLString} from "@/lib/haplogrouper_util/haplogroupClassifier";
import { Button } from "@/components/retroui/Button";
import { useEffect, useState } from "react";
export default function Haplogrouper() {
  const [stubTree, setStubTree] = useState<null|string>(null);

  useEffect(() => {
      readAndParseTree()
  }, []);
  return (
    <div className="flex flex-col p-8 justify-center min-h-screen sm:p-8 font-[family-name:var(--font-courier-prime)]">
      <Text as="h3" className='text-center'>Whereof Does your Ancestral Purpose Come From ?</Text>
      <Button
          className="mx-auto mb-8"  
          onClick={() => {
            //STUB FOR NOW
            const xmlString = returnXMLString();
            if (xmlString != null) {
              setStubTree(xmlString);
            }
          }}
      >Test dih</Button>
      
      <div className="rounded mx-auto text-center overflow-y-scroll h-64 w-full border p-4 bg-secondary/20"> 
        <pre className="whitespace-pre overflow-auto p-4">{stubTree}</pre> 
      </div>
    </div>
  );
}
