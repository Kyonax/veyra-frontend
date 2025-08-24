"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useMessageHistory } from "@/components/logic";

type PushStatus = "idle" | "sending" | "success" | "error";

type Message = {
  id: string | number;
  content: string;
  sender: "AVATAR" | "USER" | string;
};

const WEBHOOK_URL = "https://promoted-evidently-catfish.ngrok-free.app/messages";

const MessagePusherComponent: React.FC = () => {
  const { messages } = useMessageHistory();
  const [status, setStatus] = useState<PushStatus>("idle");
  const lastSentIdRef = useRef<number>(0);
  const isSendingRef = useRef<boolean>(false);
  const processedMessagesRef = useRef<Set<string>>(new Set());
  const debounceRef = useRef<NodeJS.Timeout>();
  const lastMessagesRef = useRef<Message[]>([]);

  const conversationIdRef = useRef<string>(
    sessionStorage.getItem("conversationId") || Date.now().toString()
  );

  useEffect(() => {
    sessionStorage.setItem("conversationId", conversationIdRef.current);
  }, []);

  // obtener userId de query params
  const userId = React.useMemo(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    return params.get("userId");
  }, []);

  const getNewMessages = useCallback((): Message[] => {
    if (!messages.length) return [];
    const sortedMessages = [...messages].sort((a, b) => {
      const aId = typeof a.id === "string" ? parseInt(a.id, 10) : a.id;
      const bId = typeof b.id === "string" ? parseInt(b.id, 10) : b.id;
      return aId - bId;
    });

    return sortedMessages.filter((msg) => {
      const msgId = typeof msg.id === "string" ? parseInt(msg.id, 10) : msg.id;
      return (
        msgId > lastSentIdRef.current &&
        !processedMessagesRef.current.has(msg.id.toString())
      );
    });
  }, [messages]);

  // Send messages to webhook
  const sendMessages = useCallback(
    async (messagesToSend: Message[]) => {
      if (isSendingRef.current || !messagesToSend.length) return;

      isSendingRef.current = true;
      setStatus("sending");

      try {
        const maxId = Math.max(
          ...messagesToSend.map((m) =>
            typeof m.id === "string" ? parseInt(m.id, 10) : m.id
          )
        );
        lastSentIdRef.current = maxId;

        for (const msg of messagesToSend) {
          processedMessagesRef.current.add(msg.id.toString());

          const res = await fetch(WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message_id: msg.id,
              phone_number: userId,
              thread_id: conversationIdRef.current,
              content: msg.content,
              role: msg.sender === "AVATAR" ? "agent" : "user",
            }),
          });

          if (!res.ok) throw new Error(`HTTP ${res.status}`);
        }

        setStatus("success");
        setTimeout(() => setStatus("idle"), 10000);
      } catch (e) {
        console.error("Error sending to webhook:", e);
        setStatus("error");
        setTimeout(() => setStatus("idle"), 5000);
      } finally {
        isSendingRef.current = false;
      }
    },
    [userId]
  );

  // Effect to send new messages with debounce
  useEffect(() => {
    if (!userId || messages.length === 0) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const hasNewMessages =
      JSON.stringify(messages) !== JSON.stringify(lastMessagesRef.current);

    if (hasNewMessages) {
      debounceRef.current = setTimeout(() => {
        const newMessages = getNewMessages();
        if (newMessages.length > 0 && !isSendingRef.current) {
          lastMessagesRef.current = [...messages];
          sendMessages(newMessages);
        }
      }, 1000);
    }
  }, [messages, userId, getNewMessages, sendMessages]);

  const getEmoji = () => {
    switch (status) {
      case "sending":
        return "⏳";
      case "success":
        return "✅";
      case "error":
        return "⚠️";
      default:
        return "";
    }
  };

  return (
    <div className="text-xs text-gray-400 flex items-center gap-1">
      <span>Sync mensajes {getEmoji()}</span>
    </div>
  );
};

export const MessagePusher = React.memo(MessagePusherComponent);
