'use client';

import { useEffect, useState } from "react";
import { StreamingAvatarProvider } from "@/components/logic";
import Avatar from "./Avatar";

export default function AvatarWrapper() {
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        // This gives time for the module to load without causing immediate errors
        const timer = setTimeout(() => {
            setIsReady(true);
        }, 100);

        return () => clearTimeout(timer);
    }, []);

    if (!isReady) {
        return (
            <div className="w-full flex flex-col gap-4 items-center justify-center p-8">
                <div className="text-white">Initializing...</div>
            </div>
        );
    }

    return (
        <StreamingAvatarProvider basePath={process.env.NEXT_PUBLIC_BASE_API_URL}>
            <Avatar />
        </StreamingAvatarProvider>
    );
}
