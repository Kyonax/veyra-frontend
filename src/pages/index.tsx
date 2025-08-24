import Image from "next/image";
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import Avatar from "@/components/Avatar";
import IntroApp from "@/components/IntroApp";

export default function Home() {
  return (
    <div className="main-container">
      {/* <Avatar /> */}
      <Avatar />
      {/* <IntroApp /> */}

      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        Testing Footer Layout
      </footer>
    </div>
  );
}
