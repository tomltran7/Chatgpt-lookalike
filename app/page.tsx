"use client";

import { ChatPanel } from "@/components/chat/chat-panel";
import { DocumentPanel } from "@/components/chat/document-panel";
import { ChatProvider } from "@/components/chat-provider";

export default function ChatApp() {
  return (
    <div className="flex h-screen overflow-x-hidden bg-[#1e1e1e] text-[#e5e5e5]">
      <ChatProvider>
        <ChatPanel />
        <DocumentPanel />
      </ChatProvider>
    </div>
  );
}
