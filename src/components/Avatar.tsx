import Image from "next/image";
import myImage from '@/assets/Blue Modern Pitch Deck Presentation .png';

import {
  AvatarQuality,
  StreamingEvents,
  VoiceChatTransport,
  VoiceEmotion,
  StartAvatarRequest,
  STTProvider,
  ElevenLabsModel,
} from "@heygen/streaming-avatar";
import {
  useEffect,
  useRef,
  useState,
  Fragment,
  memo,
  useMemo,
  useCallback,
} from "react";
import { useMemoizedFn, useUnmount } from "ahooks";

import { Button } from "@/components/Button";
import { AvatarVideo } from "@/components/AvatarSession/AvatarVideo";
import { useStreamingAvatarSession } from "@/components/logic/useStreamingAvatarSession";
import { AvatarControls } from "@/components/AvatarSession/AvatarControls";
import { useVoiceChat } from "@/components/logic/useVoiceChat";
import {
  StreamingAvatarProvider,
  StreamingAvatarSessionState,
} from "@/components/logic";
import { LoadingIcon } from "@/components/Icons";
import { MessageHistory } from "@/components/AvatarSession/MessageHistory";
import { MessagePusher } from "@/components/MessagePusher";
import { v4 as uuidv4 } from "uuid";

import { AVATARS, API_ENDPOINTS, PROMPT } from "@/constants/Data";

interface BrandData {
  brand_id: number;
  brand_name: string;
  brand_logo: string;
  user_phone: string;
  user_name: string;
  main_color: string;
}

const DEFAULT_BRAND_DATA: BrandData = {
  brand_id: 1,
  brand_name: "Default Brand",
  brand_logo: "",
  user_phone: "unknown",
  user_name: "User",
  main_color: "#ACAF50"
};

type StartMode = "video" | "text";

const InteractiveAvatarInner = memo(function InteractiveAvatar() {
  const { initAvatar, startAvatar, stopAvatar, sessionState, stream } =
    useStreamingAvatarSession();
  const { startVoiceChat } = useVoiceChat();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const mediaStream = useRef<HTMLVideoElement>(null);
  const autoStartedRef = useRef(false);

  const { userId, autoStart, initialMode } = useMemo(() => {
    if (typeof window === "undefined") {
      return { userId: null, autoStart: false, initialMode: "video" as StartMode };
    }
    const params = new URLSearchParams(window.location.search);
    const uid = params.get("userId");
    const auto = params.get("autoStart");
    const m = params.get("mode");
    const sanitizedMode: StartMode = m === "text" ? "text" : "video";
    return {
      userId: uid,
      autoStart: auto === "true",
      initialMode: sanitizedMode,
    };
  }, []);

  const fetchAccessToken = useCallback(async () => {
    try {
      const response = await fetch("/api/get-access-token", {
        method: "POST",
      });
      const token = await response.text();
      return token;
    } catch (error) {
      console.error("Error fetching access token:", error);
      throw error;
    }
  }, []);

  const fetchBrandData = useCallback(async (): Promise<BrandData> => {
    if (!userId) return DEFAULT_BRAND_DATA;
   
    try {
      const response = await fetch(API_ENDPOINTS.BRANDS(userId));
      if (response.ok) {
        return await response.json();
      } else {
        console.error("Failed to fetch brand data");
        return DEFAULT_BRAND_DATA;
      }
    } catch (error) {
      console.error("Error fetching brand data:", error);
      return DEFAULT_BRAND_DATA;
    }
  }, [userId]);

  const startSessionV2 = useMemoizedFn(async (mode: StartMode) => {
    try {
      const brandData = await fetchBrandData();
      const dynamicConfig: StartAvatarRequest = {
        quality: AvatarQuality.Low,
        avatarName: AVATARS[0].avatar_id,
        knowledgeBase: PROMPT.CONTEXT(brandData.user_name, brandData.brand_name),
        voice: {
          rate: 1.5,
          emotion: VoiceEmotion.EXCITED,
          model: ElevenLabsModel.eleven_flash_v2_5,
        },
        language: "es",
        voiceChatTransport: VoiceChatTransport.WEBSOCKET,
        sttSettings: {
          provider: STTProvider.DEEPGRAM,
        },
      };

      const generatedId = uuidv4();
      setSessionId(generatedId);
      const newToken = await fetchAccessToken();
      const avatar = initAvatar(newToken);

      avatar.on(StreamingEvents.STREAM_DISCONNECTED, async () => {
        const payload = {
          conversation_id: generatedId,
          phone_number: userId,
        };

        try {
          const res = await fetch(API_ENDPOINTS.CALL_ENDED, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } catch (err) {
          console.error("Error sending to API:", err);
        }
      });

      await startAvatar(dynamicConfig);

      if (mode === "video") {
        try {
          await startVoiceChat();
        } catch (err) {
          console.warn("Voice chat start failed:", err);
        }
      }
    } catch (error) {
      console.error("Error starting avatar session:", error);
    }
  });

  useUnmount(() => {
    stopAvatar();
  });

  useEffect(() => {
    if (stream && mediaStream.current) {
      mediaStream.current.srcObject = stream;
      mediaStream.current.onloadedmetadata = () => {
        mediaStream.current!.play();
      };
    }
  }, [stream]);

  useEffect(() => {
    if (autoStartedRef.current) return;

    if (sessionState === StreamingAvatarSessionState.INACTIVE) {
      if (autoStart) {
        autoStartedRef.current = true;
        startSessionV2(initialMode);
      }
    }
  }, [sessionState, autoStart, initialMode]);

  const isConnected = sessionState === StreamingAvatarSessionState.CONNECTED;

  const InactiveSkeleton = () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-[350px] md:w-[550px] py-8">
        <div className="animate-pulse skeleton  rounded-md h-48 mb-4" />
        <div className="animate-pulse skeleton rounded-md h-8 mb-2" />
        <div className="animate-pulse skeleton  rounded-md h-8 mb-2" />
      </div>
    </div>
  );

  return (
    <div className="w-full grid justify-items-center gap-6">
      <Image
        className="image-logo"
        src={myImage}
        alt="Description of image"
        width={250}
        height={100}
        priority
      />
      <div className="flex flex-col overflow-hidden rounded-lg border box-video w-[70%] md:w-[70%] max-w-2xl md:max-w-4xl">
        <div className="relative w-full aspect-video overflow-hidden flex flex-col items-center justify-center">
          {sessionState !== StreamingAvatarSessionState.INACTIVE ? (
            <AvatarVideo ref={mediaStream} />
          ) : (
            <InactiveSkeleton />
          )}
        </div>

        <div className="flex flex-col gap-4 items-center justify-center p-6 box-video-down border-t w-full">
          {sessionState === StreamingAvatarSessionState.CONNECTED ? (
            <AvatarControls />
          ) : sessionState === StreamingAvatarSessionState.INACTIVE ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="text-neutral-800 text-lg">
                Session is inactive. Start with default configuration.
              </div>
              <div className="flex flex-row gap-4">
                <button
                  className="btn-primary"
                  onClick={() => startSessionV2("video")}
                >
                  Start Video Session
                </button>
                <button
                  className="btn-primary"
                  onClick={() => startSessionV2("text")}
                >
                  Start Text Session
                </button>
              </div>
              <div className="text-neutral-500 text-sm mt-2">
                Tip: add <code>?autoStart=true&mode=video</code> (or mode=text) to the URL to auto-start.
              </div>
            </div>
          ) : (
            <LoadingIcon className="text-primary-100" />
          )}
        </div>
      </div>
      {isConnected && (
        <Fragment>
          <MessageHistory />
          <MessagePusher userId={userId} sessionId={sessionId} />
        </Fragment>
      )}
    </div>
  );
});

InteractiveAvatarInner.displayName = "InteractiveAvatar";

export default function InteractiveAvatarWrapper() {
  return (
    <StreamingAvatarProvider basePath={process.env.NEXT_PUBLIC_BASE_API_URL}>
      <InteractiveAvatarInner />
    </StreamingAvatarProvider>
  );
}
