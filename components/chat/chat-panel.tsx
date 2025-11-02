"use client";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { useState } from "react";
import { extractExcelToMarkdown, extractCsvToMarkdown } from "@/lib/utils";
import { useChat } from "@ai-sdk/react";
import { Response } from "@/components/ai-elements/response";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/source";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { Loader } from "@/components/ai-elements/loader";
import { useSharedChatContext } from "../chat-provider";
import DocumentCard from "./document-card";

export const ChatPanel = () => {
  const [input, setInput] = useState("");
  const { chat, openedDocumentId } = useSharedChatContext();
  const { messages, sendMessage, status } = useChat({
    chat,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage({
        text: input,
        metadata: { documentId: openedDocumentId || undefined },
      });
      setInput("");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 relative size-full h-screen min-h-0">
      <div className="flex flex-col h-full min-h-0">
        <Conversation className="flex-1 min-h-0 flex flex-col">
          <ConversationContent className="flex-1 min-h-0 overflow-y-auto h-full">
            {messages.length === 0 && status !== "submitted" && (
              <div className="min-h-full grid place-items-center py-12">
                <div className="text-center max-w-md mx-auto">
                  {/* Icon */}
                  <div className="mx-auto mb-4 h-12 w-12 rounded-xl border border-[#e5e5e5]/15 bg-transparent flex items-center justify-center">
                    <svg
                      className="h-6 w-6 text-[#e5e5e5]/60"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <path
                        d="M4 5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H8l-4 4V5z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>

                  {/* Text */}
                  <h2 className="text-[#e5e5e5] text-lg font-medium">
                    Start a conversation
                  </h2>
                  <p className="text-[#e5e5e5]/70 text-sm mt-1">
                    Ask a question or try one of the suggestions below to begin.
                  </p>

                  {/* Suggestions */}
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                    {[
                      "Draft a project brief",
                      "Turn notes into a doc",
                      "Write a blog outline",
                    ].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() =>
                          sendMessage({
                            text: s,
                            metadata: {
                              documentId: openedDocumentId || undefined,
                            },
                          })
                        }
                        className="rounded-full border border-[#e5e5e5]/15 px-3 py-1 text-xs text-[#e5e5e5]/80 hover:border-[#e5e5e5]/30 hover:text-[#e5e5e5] transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {messages.map((message) => (
              <div key={message.id}>
                {message.role === "assistant" && (
                  <Sources>
                    {message.parts.map((part, i) => {
                      switch (part.type) {
                        case "source-url":
                          return (
                            <>
                              <SourcesTrigger
                                count={
                                  message.parts.filter(
                                    (part) => part.type === "source-url"
                                  ).length
                                }
                              />
                              <SourcesContent key={`${message.id}-${i}`}>
                                <Source
                                  key={`${message.id}-${i}`}
                                  href={part.url}
                                  title={part.url}
                                />
                              </SourcesContent>
                            </>
                          );
                        case "data-createDocument":
                          return (
                            <DocumentCard
                              key={part.id || ""}
                              title={part.data.title}
                              status={part.data.status as "processing" | "streaming" | "success" | "error"}
                              id={part.id || ""}
                            />
                          );
                      }
                    })}
                  </Sources>
                )}
                <Message from={message.role} key={message.id}>
                  <MessageContent>
                    {message.parts.map((part, i) => {
                      switch (part.type) {
                        case "text":
                          return (
                            <Response key={`${message.id}-${i}`}>
                              {part.text}
                            </Response>
                          );
                        case "reasoning":
                          return (
                            <Reasoning
                              key={`${message.id}-${i}`}
                              className="w-full"
                              isStreaming={status === "streaming"}
                            >
                              <ReasoningTrigger />
                              <ReasoningContent>{part.text}</ReasoningContent>
                            </Reasoning>
                          );

                        default:
                          return null;
                      }
                    })}
                  </MessageContent>
                </Message>
              </div>
            ))}
            {status === "submitted" && <Loader />}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <PromptInput onSubmit={handleSubmit} className="mt-4">
          <PromptInputTextarea
            onChange={(e) => setInput(e.target.value)}
            value={input}
          />
          <PromptInputToolbar
            onFileSelect={async (file) => {
              let content = '';
              const fileName = file.name.toLowerCase();
              let extractedTable = undefined;
              try {
                if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
                  // Excel: read as ArrayBuffer
                  const buffer = await file.arrayBuffer();
                  content = extractExcelToMarkdown(buffer);
                  extractedTable = content;
                } else if (fileName.endsWith('.csv')) {
                  // CSV: read as text
                  const text = await file.text();
                  content = extractCsvToMarkdown(text);
                  extractedTable = content;
                } else {
                  // Fallback: plain text
                  content = await file.text();
                }
              } catch (err) {
                content = `Error extracting file content: ${String(err)}`;
              }
              // For Excel/CSV, suppress markdown in chat, send only a generic message and attach extractedTable in metadata
              if (extractedTable) {
                sendMessage({
                  text: `File "${file.name}" uploaded and data extracted for analysis.`,
                  metadata: {
                    documentId: openedDocumentId || undefined,
                    extractedTable,
                  },
                });
              } else {
                sendMessage({
                  text: `Uploaded file: ${file.name}\n\n${content}`,
                  metadata: {
                    documentId: openedDocumentId || undefined,
                  },
                });
              }
            }}
          >
            <PromptInputTools />
            <PromptInputSubmit disabled={!input} status={status} />
          </PromptInputToolbar>
        </PromptInput>
      </div>
    </div>
  );
};
