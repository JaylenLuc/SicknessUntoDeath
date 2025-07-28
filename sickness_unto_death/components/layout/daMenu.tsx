"use client";
import { Button } from "@/components/retroui/Button";
import {Menu} from "@/components/retroui/Menu";
import { Link as LucideLink} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function DaMenu() {
  return (
    <Menu>
        <Menu.Trigger asChild className="right-30">
          <Button className="p-0 bg-transparent border-none shadow-none hover:bg-transparent focus:outline-none ">
            <Image
              src="/fingertree.png"
              alt="Menu"
              width={256}
              height={256}
              className="object-contain"
              priority
            />
          </Button>
        </Menu.Trigger>
        <Menu.Content className="min-w-36">
            <Menu.Item>
              <Link href="/" className="flex flex-1"><LucideLink className="mr-2"/> Home</Link>
            </Menu.Item>
            <Menu.Item>
              <a href="/dreams" className="flex flex-1"><LucideLink className="mr-2"/> Dreams</a>
            </Menu.Item>
            <Menu.Item>
              <a href="https://artifical-life.vercel.app" className="flex flex-1"><LucideLink className="mr-2"/> Artificial Life</a>
            </Menu.Item>
        </Menu.Content>
    </Menu>
  );
}   