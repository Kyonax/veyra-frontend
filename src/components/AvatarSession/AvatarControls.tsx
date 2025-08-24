import { ToggleGroup, ToggleGroupItem } from "@radix-ui/react-toggle-group";
import React from "react";

import { useVoiceChat } from "@/components/logic/useVoiceChat";
import { useInterrupt } from "@/components/logic/useInterrupt";

import { AudioInput } from "@/components/AvatarSession/AudioInput";
import { TextInput } from "@/components/AvatarSession/TextInput";

export const AvatarControls: React.FC = () => {
  const {
    isVoiceChatLoading,
    isVoiceChatActive,
    startVoiceChat,
    stopVoiceChat,
  } = useVoiceChat();
  const { interrupt } = useInterrupt();

  return (
    <div className="avatar-controls">
      <ToggleGroup
        className={`toggle-group ${isVoiceChatLoading ? "disabled" : ""}`}
        disabled={isVoiceChatLoading}
        type="single"
        value={isVoiceChatActive || isVoiceChatLoading ? "voice" : "text"}
        onValueChange={(value) => {
          if (value === "voice" && !isVoiceChatActive && !isVoiceChatLoading) {
            startVoiceChat();
          } else if (
            value === "text" &&
            isVoiceChatActive &&
            !isVoiceChatLoading
          ) {
            stopVoiceChat();
          }
        }}
      >
        <ToggleGroupItem className="toggle-group-item" value="voice">
          Voice Chat
        </ToggleGroupItem>
        <ToggleGroupItem className="toggle-group-item" value="text">
          Text Chat
        </ToggleGroupItem>
      </ToggleGroup>
      {isVoiceChatActive || isVoiceChatLoading ? <AudioInput /> : <TextInput />}
      <div className="interrupt-button">
        <button onClick={interrupt}>
          Interrupt
        </button>
      </div>
    </div>
  );
};
