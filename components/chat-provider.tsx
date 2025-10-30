"use client";

import React, { createContext, useContext, ReactNode, useState } from "react";
import { Chat, useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { MyUiMessage } from "@/app/api/chat/route";

interface ChatContextValue {
  chat: Chat<MyUiMessage>;
  clearChat: () => void;
  setOpenedDocumentId: (id: string | null) => void;
  openedDocumentId: string | null;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export const chatTransport = () => {
  return new DefaultChatTransport({
    api: "/api/chat",
  });
};

function createChat() {
  return new Chat<MyUiMessage>({
    transport: chatTransport(),
  });
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [chat, setChat] = useState(() => createChat());

  const [openedDocumentId, setOpenedDocumentId] = useState<string | null>(null);

  const clearChat = () => {
    setChat(createChat());
  };

  return (
    <ChatContext.Provider
      value={{
        chat,
        clearChat,
        setOpenedDocumentId,
        openedDocumentId,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useSharedChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useSharedChatContext must be used within a ChatProvider");
  }
  return context;
}
