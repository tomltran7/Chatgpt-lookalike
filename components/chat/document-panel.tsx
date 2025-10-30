"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SelectionMenu } from "@/components/chat/selection-menu";
import { useSharedChatContext } from "../chat-provider";

import { useChat } from "@ai-sdk/react";
import { AnimatePresence, motion } from "motion/react";
import { Response } from "../ai-elements/response";

export function DocumentPanel() {
  const { openedDocumentId, chat, setOpenedDocumentId } =
    useSharedChatContext();
  const { messages, sendMessage } = useChat({
    chat,
  });

  const openedDocPart = useMemo(() => {
    if (!openedDocumentId) return null;

    const parts = messages
      .flatMap((m) => m.parts ?? [])
      .filter(
        (p) =>
          p && p.type === "data-createDocument" && p.id === openedDocumentId
      );

    const part = parts[parts.length - 1];

    if (!part) return null;

    if (part.type !== "data-createDocument") return null;

    return part;
  }, [messages, openedDocumentId]);

  const [selectionMenu, setSelectionMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    selectedText: "",
    inputValue: "",
  });
  const documentRef = useRef<HTMLDivElement>(null);

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim() && documentRef.current) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      setSelectionMenu({
        visible: true,
        x: rect.left + rect.width / 2,
        y: rect.top - 60,
        selectedText: selection.toString(),
        inputValue: "",
      });
    } else {
      setSelectionMenu((prev) => ({ ...prev, visible: false }));
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        selectionMenu.visible &&
        !(event.target as Element).closest(".selection-menu")
      ) {
        setSelectionMenu((prev) => ({ ...prev, visible: false }));
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectionMenu.visible]);

  const handleApply = () => {
    sendMessage({
      text: `
      User requested changes to the document.
      Here is the selected text: ${selectionMenu.selectedText}. 
      Here is the user's input: ${selectionMenu.inputValue}`,
      metadata: {
        documentId: openedDocumentId || undefined,
      },
    });
    setSelectionMenu((prev) => ({ ...prev, visible: false }));
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {openedDocPart && (
        <motion.div
          key={openedDocPart.id}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 16 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="flex-1 flex overflow-x-hidden border-l border-[#3a3a3a] flex-col overflow-y-auto"
        >
          {/* Header */}
          <div className="p-4 border-b border-[#3a3a3a] flex items-center justify-between gap-4">
            <h2 className="text-lg font-medium text-[#e5e5e5] flex items-center gap-2">
              {openedDocPart?.data.title || "Untitled"}
              <span className="inline-flex items-center gap-1 rounded-full bg-[#e5e5e5]/5 px-2 py-0.5 text-[11px] text-[#e5e5e5]/70">
                <span className="relative inline-flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-[#e5e5e5]/40 opacity-75 animate-ping" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#e5e5e5]" />
                </span>
                {openedDocPart?.data.status
                  ? openedDocPart.data.status.charAt(0).toUpperCase() +
                    openedDocPart.data.status.slice(1)
                  : null}
              </span>
            </h2>
            <button
              type="button"
              onClick={() => setOpenedDocumentId(null)}
              className="inline-flex items-center justify-center rounded-md border border-[#e5e5e5]/15 text-[#e5e5e5]/70 hover:text-white hover:border-[#e5e5e5]/30 transition-colors h-8 w-8"
              aria-label="Close document"
              title="Close"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 6l12 12M18 6L6 18"
                />
              </svg>
            </button>
          </div>

          {/* Canvas/Editor */}
          <div className="flex-1 p-8 overflow-auto">
            <div className="max-w-2xl mx-auto">
              <div
                ref={documentRef}
                onMouseUp={handleTextSelection}
                className="text-[#e5e5e5] leading-relaxed space-y-4  text-base select-text"
              >
                {openedDocPart?.data.content ? (
                  <Response className="">{openedDocPart.data.content}</Response>
                ) : (
                  <p className="text-[#e5e5e5]/70">Waiting for content…</p>
                )}
              </div>
            </div>
          </div>

          <SelectionMenu
            visible={selectionMenu.visible}
            x={selectionMenu.x}
            y={selectionMenu.y}
            selectedText={selectionMenu.selectedText}
            inputValue={selectionMenu.inputValue}
            onChange={(val) =>
              setSelectionMenu((prev) => ({ ...prev, inputValue: val }))
            }
            onApply={() => {
              handleApply();
            }}
            onCancel={() =>
              setSelectionMenu((prev) => ({ ...prev, visible: false }))
            }
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
