"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";

const initialMembers = [
  { k: "1", image: "/kateZines/kateZine1.png" },
  { k: "2", image: "/kateZines/kateZine2.png" },
  { k: "3", image: "/kateZines/kateZine3.png" },
  { k: "4", image: "/kateZines/kateZine4.png" },
  { k: "5", image: "/kateZines/kateZine5.png" },
];

const rotationAngles = [-1, 1, -0.5, -0.75];

export default function ZineStack() {
  const [members, setMembers] = useState(initialMembers);

  const handleSwipe = () => {
    setMembers((prev) => {
      const next = [...prev];
      const first = next.shift();
      if (first) next.push(first);
      return next;
    });
  };

  return (
    <div className="relative w-64 h-64 mx-auto">
      {members.map((item, index) => {
        const isTop = index === 0;

        return (
          <motion.div
            key={item.k}
            className="absolute w-64 h-64 overflow-hidden pointer-events-auto"
            drag={isTop ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.3}
            onDragEnd={(_, info) => {
                if (info.offset.x > 50) handleSwipe();
                if (info.offset.x < -50) handleSwipe();
            }}
            initial={{ 
                y: index * 10, 
                scale: 1 - index * 0.05, 
                rotate: rotationAngles[index % rotationAngles.length] 
            }}
            animate={{ 
                y: index * 10, 
                scale: 1 - index * 0.05, 
                rotate: rotationAngles[index % rotationAngles.length]
            }}
            transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 20 
            }}
            style={{ 
                zIndex: members.length - index,
                touchAction: "pan-y",
                userSelect: "none",
                WebkitTouchCallout: "none",
                WebkitUserSelect: "none"
            }}
        >
            <div className="relative w-full h-full">
              <Image
                alt="zine"
                src={item.image}
                fill
                className="object-contain pointer-events-none"
                draggable={false}  
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
