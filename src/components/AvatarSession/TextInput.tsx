import { TaskType, TaskMode } from "@heygen/streaming-avatar";
import React, { useCallback, useEffect, useState } from "react";
import { usePrevious } from "ahooks";

import { Select } from "@/components/Select";
import { Button } from "@/components/Button";
import { SendIcon } from "@/components/Icons";
import { useTextChat } from "@/components/logic/useTextChat";
import { Input } from "@/components/Input";
import { useConversationState } from "../logic/useConversationState";

export const TextInput: React.FC = () => {
  const { sendMessage, sendMessageSync, repeatMessage, repeatMessageSync } =
    useTextChat();
  const { startListening, stopListening } = useConversationState();
  const [taskType, setTaskType] = useState<TaskType>(TaskType.TALK);
  const [taskMode, setTaskMode] = useState<TaskMode>(TaskMode.ASYNC);
  const [message, setMessage] = useState("");

  const handleSend = useCallback(() => {
    if (message.trim() === "") {
      return;
    }
    if (taskType === TaskType.TALK) {
      taskMode === TaskMode.SYNC
        ? sendMessageSync(message)
        : sendMessage(message);
    } else {
      taskMode === TaskMode.SYNC
        ? repeatMessageSync(message)
        : repeatMessage(message);
    }
    setMessage("");
  }, [
    taskType,
    taskMode,
    message,
    sendMessage,
    sendMessageSync,
    repeatMessage,
    repeatMessageSync,
  ]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        handleSend();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSend]);

  const previousText = usePrevious(message);

  useEffect(() => {
    if (!previousText && message) {
      startListening();
    } else if (previousText && !message) {
      stopListening();
    }
  }, [message, previousText, startListening, stopListening]);

  return (
    <div className="flex flex-row gap-5 items-end w-full">
      <Select
        isSelected={(option) => option === taskType}
        options={Object.values(TaskType)}
        renderOption={(option) => option.toUpperCase()}
        value={taskType.toUpperCase()}
        onSelect={setTaskType}
      />
      <Select
        isSelected={(option) => option === taskMode}
        options={Object.values(TaskMode)}
        renderOption={(option) => option.toUpperCase()}
        value={taskMode.toUpperCase()}
        onSelect={setTaskMode}
      />
      <Input
        className="min-w-[100px] md:min-w-[300px] h-[3rem]"
        placeholder={`Type something for the avatar to ${taskType === TaskType.REPEAT ? "repeat" : "respond"}...`}
        value={message}
        onChange={setMessage}
      />
      <Button className="!p-3 button-send" onClick={handleSend}>
        <SendIcon size={20} />
      </Button>
    </div>
  );
};
