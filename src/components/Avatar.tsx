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
// NOTE: AvatarConfig is intentionally not rendered here so users are not prompted for config
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

// Define the BrandData interface
interface BrandData {
  brand_id: number;
  brand_name: string;
  brand_logo: string;
  user_phone: string;
  user_name: string;
  main_color: string;
}

// Default config will be created dynamically
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

  // Auto-start guard so we only attempt once
  const autoStartedRef = useRef(false);

  // Read query params once (mode and autoStart)
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

      console.log(`:; VEYRA-RESPONSE BRAND DATA (${API_ENDPOINTS.BRANDS(userId)}) - `, response);
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

  /**
   * startSessionV2
   * - mode "video" => start avatar + start voice chat (voice enabled)
   * - mode "text"  => start avatar only (no voice chat)
   */
  const startSessionV2 = useMemoizedFn(async (mode: StartMode) => {
    try {
      // Fetch brand data first
      const brandData = await fetchBrandData();

      console.log(`:: VEYRA RESPONSE - BrandData:`, brandData);
      // Create dynamic config with brand data
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

      // generate id early so handlers can reference it reliably
      const generatedId = uuidv4();
      setSessionId(generatedId);

      const newToken = await fetchAccessToken();

      // initialize avatar connection
      const avatar = initAvatar(newToken);

      // attach a disconnect handler that uses generatedId
      avatar.on(StreamingEvents.STREAM_DISCONNECTED, async () => {
        console.log("VEYRA-DEBUG:: STREAM OFF");

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

          console.log(`:: JSON SENT WITH STATUS (${res.status}): `, payload);
        } catch (err) {
          console.error("Error sending to API:", err);
        }
      });

      // startAvatar with the dynamic config
      await startAvatar(dynamicConfig);

      // for 'video' we also start voice chat (if available)
      if (mode === "video") {
        // guard in case startVoiceChat throws or isn't available
        try {
          await startVoiceChat();
        } catch (err) {
          console.warn("Voice chat start failed:", err);
        }
      }

      // at this point the session is started (video stream will arrive in `stream`)
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

  // Auto-start effect: run once if autoStart=true in query params OR initialMode present
  useEffect(() => {
    // only try once
    if (autoStartedRef.current) return;

    // Only trigger when the app is INACTIVE (not in-progress or connected)
    if (sessionState === StreamingAvatarSessionState.INACTIVE) {
      // If autoStart flag present, use the initialMode to auto start
      if (autoStart) {
        autoStartedRef.current = true;
        startSessionV2(initialMode);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionState, autoStart, initialMode]);

  const isConnected = sessionState === StreamingAvatarSessionState.CONNECTED;

  // Simple skeleton UI while the session is inactive
  const InactiveSkeleton = () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-[550px] py-8">
        <div className="animate-pulse bg-zinc-800 rounded-md h-48 mb-4" />
        <div className="animate-pulse bg-zinc-800 rounded-md h-8 mb-2" />
        <div className="animate-pulse bg-zinc-800 rounded-md h-8 mb-2" />
      </div>
    </div>
  );

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex flex-col rounded-xl bg-zinc-900 overflow-hidden">
        <div className="relative w-full aspect-video overflow-hidden flex flex-col items-center justify-center">
          {sessionState !== StreamingAvatarSessionState.INACTIVE ? (
            <AvatarVideo ref={mediaStream} />
          ) : (
            // Per your request: do NOT request AvatarConfig info — show skeleton instead
            <InactiveSkeleton />
          )}
        </div>

        <div className="flex flex-col gap-3 items-center justify-center p-4 border-t border-zinc-700 w-full">
          {sessionState === StreamingAvatarSessionState.CONNECTED ? (
            <AvatarControls />
          ) : sessionState === StreamingAvatarSessionState.INACTIVE ? (
            <div className="flex flex-col items-center gap-3">
              <div className="text-sm text-zinc-400">
                Session is inactive. Start with default configuration.
              </div>
              <div className="flex flex-row gap-4">
                <Button onClick={() => startSessionV2("video")}>
                  Start Video Session
                </Button>
                <Button onClick={() => startSessionV2("text")}>
                  Start Text Session
                </Button>
              </div>
              <div className="text-xs text-zinc-500 mt-2">
                Tip: add <code>?autoStart=true&mode=video</code> (or mode=text) to the URL to auto-start.
              </div>
            </div>
          ) : (
            <LoadingIcon />
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
