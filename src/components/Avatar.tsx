import {
  AvatarQuality,
  StreamingEvents,
  VoiceChatTransport,
  VoiceEmotion,
  StartAvatarRequest,
  STTProvider,
  ElevenLabsModel,
} from "@heygen/streaming-avatar";
import { useEffect, useRef, useState, Fragment, memo, useCallback } from "react";
import { useMemoizedFn, useUnmount } from "ahooks";

import { Button } from "@/components/Button";
import { AvatarVideo } from "@/components/AvatarSession/AvatarVideo";
import { AvatarConfig } from "@/components/AvatarConfig";
import { useStreamingAvatarSession } from "@/components/logic/useStreamingAvatarSession";
import { AvatarControls } from "@/components/AvatarSession/AvatarControls";
import { useVoiceChat } from "@/components/logic/useVoiceChat";
import { StreamingAvatarProvider, StreamingAvatarSessionState } from "@/components/logic";
import { LoadingIcon } from "@/components/Icons";
import { MessageHistory } from "@/components/AvatarSession/MessageHistory";
import { MessagePusher } from "@/components/MessagePusher";

import { AVATARS } from "@/constants/Data";

const DEFAULT_CONFIG: StartAvatarRequest = {
  quality: AvatarQuality.Low,
  avatarName: AVATARS[0].avatar_id,
  knowledgeId: undefined,
  voice: {
    rate: 1.5,
    emotion: VoiceEmotion.EXCITED,
    model: ElevenLabsModel.eleven_flash_v2_5,
  },
  language: "en",
  voiceChatTransport: VoiceChatTransport.WEBSOCKET,
  sttSettings: {
    provider: STTProvider.DEEPGRAM,
  },
};

// Create a memoized version of the InteractiveAvatar component
const InteractiveAvatarInner = memo(function InteractiveAvatar() {
  const { initAvatar, startAvatar, stopAvatar, sessionState, stream } =
    useStreamingAvatarSession();
  const { startVoiceChat } = useVoiceChat();

  const [config, setConfig] = useState<StartAvatarRequest>(DEFAULT_CONFIG);

  const mediaStream = useRef<HTMLVideoElement>(null);

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

  const startSessionV2 = useMemoizedFn(async (isVoiceChat: boolean) => {
    try {
      const newToken = await fetchAccessToken();
      const avatar = initAvatar(newToken);

      // avatar.on(StreamingEvents.AVATAR_START_TALKING, (e) => {
      //   console.log("Avatar started talking", e);
      // });
      // avatar.on(StreamingEvents.AVATAR_STOP_TALKING, (e) => {
      //   console.log("Avatar stopped talking", e);
      // });
      // avatar.on(StreamingEvents.STREAM_DISCONNECTED, () => {
      //   console.log("Stream disconnected");
      // });
      // avatar.on(StreamingEvents.STREAM_READY, (event) => {
      //   console.log(">>>>> Stream ready:", event.detail);
      // });
      // avatar.on(StreamingEvents.USER_START, (event) => {
      //   console.log(">>>>> User started talking:", event);
      // });
      // avatar.on(StreamingEvents.USER_STOP, (event) => {
      //   console.log(">>>>> User stopped talking:", event);
      // });
      // avatar.on(StreamingEvents.USER_END_MESSAGE, (event) => {
      //   console.log(">>>>> User end message:", event);
      // });
      // avatar.on(StreamingEvents.USER_TALKING_MESSAGE, (event) => {
      //   console.log(">>>>> User talking message:", event);
      // });
      // avatar.on(StreamingEvents.AVATAR_TALKING_MESSAGE, (event) => {
      //   console.log(">>>>> Avatar talking message:", event);
      // });
      // avatar.on(StreamingEvents.AVATAR_END_MESSAGE, (event) => {
      //   console.log(">>>>> Avatar end message:", event);
      // });

      await startAvatar(config);

      if (isVoiceChat) {
        await startVoiceChat();
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

  // Memoize the session state check to prevent unnecessary re-renders
  const isConnected = sessionState === StreamingAvatarSessionState.CONNECTED;

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex flex-col rounded-xl bg-zinc-900 overflow-hidden">
        <div className="relative w-full aspect-video overflow-hidden flex flex-col items-center justify-center">
          {sessionState !== StreamingAvatarSessionState.INACTIVE ? (
            <AvatarVideo ref={mediaStream} />
          ) : (
            <AvatarConfig config={config} onConfigChange={setConfig} />
          )}
        </div>
        <div className="flex flex-col gap-3 items-center justify-center p-4 border-t border-zinc-700 w-full">
          {sessionState === StreamingAvatarSessionState.CONNECTED ? (
            <AvatarControls />
          ) : sessionState === StreamingAvatarSessionState.INACTIVE ? (
            <div className="flex flex-row gap-4">
              <Button onClick={() => startSessionV2(true)}>
                Start Voice Chat
              </Button>
              <Button onClick={() => startSessionV2(false)}>
                Start Text Chat
              </Button>
            </div>
          ) : (
            <LoadingIcon />
          )}
        </div>
      </div>
      {isConnected && (
        <Fragment>
          <MessageHistory />
          <MessagePusher />
        </Fragment>
      )}
    </div>
  );
});

// Add display name for better debugging
InteractiveAvatarInner.displayName = "InteractiveAvatar";

export default function InteractiveAvatarWrapper() {
  return (
    <StreamingAvatarProvider basePath={process.env.NEXT_PUBLIC_BASE_API_URL}>
      <InteractiveAvatarInner />
    </StreamingAvatarProvider>
  );
}
