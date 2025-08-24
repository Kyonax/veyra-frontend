import { useState } from "react";
import { Geist, Geist_Mono, Poppins } from "next/font/google";
import Avatar from "@/components/Avatar";
import IntroApp from "@/components/IntroApp";

export const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function Home() {
  const [showAvatar, setShowAvatar] = useState(false);

  return (
    <div className={`${poppins.variable} ${geistSans.variable} ${geistMono.variable} main-container`}>
      {!showAvatar && <IntroApp onStart={() => setShowAvatar(true)} />}
      {showAvatar && <Avatar />}
    </div>
  );
}
