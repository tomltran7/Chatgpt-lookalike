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

    const part = parts.at(-1);
    if (!part) return null;
    if (part.type !== "data-createDocument") return null;
    return part;
  }, [messages, openedDocumentId]);

  // In-place editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState<string>("");

  // Document versioning state
  type DocVersion = {
    content: string;
    timestamp: number;
    label: string;
  };
  const [versions, setVersions] = useState<DocVersion[]>([]);
  const [currentVersionIdx, setCurrentVersionIdx] = useState<number>(0);

  // When document changes, reset editing state and initialize version history
  useEffect(() => {
    setIsEditing(false);
    setEditContent("");
    if (openedDocPart?.data.content) {
      setVersions([
        {
          content: openedDocPart.data.content,
          timestamp: Date.now(),
          label: "v1",
        },
      ]);
      setCurrentVersionIdx(0);
    } else {
      setVersions([]);
      setCurrentVersionIdx(0);
    }
  }, [openedDocPart?.data.content, openedDocPart?.id]);

  // Selection menu state
  const [selectionMenu, setSelectionMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    selectedText: "",
    inputValue: "",
  });
  const documentRef = useRef<HTMLDivElement>(null);

  // Handler for text selection in the document content area
  const handleTextSelection = () => {
    const selection = globalThis.getSelection?.();
    if (selection?.toString().trim() && documentRef.current) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectionMenu((prev) => ({
        ...prev,
        visible: true,
        x: rect.left + rect.width / 2,
        y: rect.top - 60,
        selectedText: selection.toString(),
      }));
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
      text: `\n      User requested changes to the document.\n      Here is the selected text: ${selectionMenu.selectedText}. \n      Here is the user's input: ${selectionMenu.inputValue}`,
      metadata: {
        documentId: openedDocumentId || undefined,
      },
    });
    setSelectionMenu((prev) => ({ ...prev, visible: false }));
  };

  // Save edit as a new version
  const handleSaveEdit = () => {
    if (!editContent.trim()) return;
    // Add new version to version history
    const newVersion: DocVersion = {
      content: editContent,
      timestamp: Date.now(),
      label: `v${versions.length + 1}`,
    };
    setVersions((prev) => [...prev, newVersion]);
    setCurrentVersionIdx(versions.length); // new version is now current
    // Optionally, send message to backend for persistence
    sendMessage({
      text: `User edited the document directly. New content:\n\n${editContent}`,
      metadata: {
        documentId: openedDocumentId || undefined,
      },
    });
    setIsEditing(false);
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
          <div className="flex-1 min-h-0 p-8 overflow-auto">
            <div className="max-w-2xl mx-auto">
              {/* Version dropdown */}
              {versions.length > 1 && (
                <div className="mb-4 flex items-center gap-2">
                  <label htmlFor="version-select" className="text-[#e5e5e5]/70 text-sm">
                    Version:
                  </label>
                  <select
                    id="version-select"
                    className="bg-transparent border border-[#3a3a3a] text-[#e5e5e5] rounded px-2 py-1"
                    value={currentVersionIdx}
                    onChange={e => setCurrentVersionIdx(Number(e.target.value))}
                  >
                    {versions.map((v, idx) => (
                      <option key={v.timestamp} value={idx} className="bg-[#222] text-[#e5e5e5]">
                        {v.label} - {new Date(v.timestamp).toLocaleString()}
                      </option>
                    ))}
                  </select>
                  {/* Restore button for non-current version */}
                  {currentVersionIdx < versions.length - 1 && (
                    <button
                      className="ml-2 px-2 py-1 border border-[#e5e5e5]/20 rounded text-[#e5e5e5]/70 hover:text-white hover:border-[#e5e5e5]/40 text-xs"
                      onClick={() => {
                        // Restore selected version as the latest version
                        const restored = versions[currentVersionIdx];
                        setVersions(prev => [...prev, {
                          ...restored,
                          timestamp: Date.now(),
                          label: `v${prev.length + 1} (restored)`
                        }]);
                        setCurrentVersionIdx(versions.length); // new version is now current
                      }}
                    >
                      Restore this version
                    </button>
                  )}
                </div>
              )}
              {isEditing ? (
                <section
                  aria-label="Document editing area"
                  className="flex flex-1 flex-col min-h-0 max-h-full"
                  style={{ height: '100%' }}
                >
                  <textarea
                    className="flex-1 w-full min-h-[200px] max-h-full min-h-0 bg-transparent border border-[#3a3a3a] text-[#e5e5e5] p-2 rounded overflow-y-auto"
                    style={{ resize: 'vertical', height: '300px' }}
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      className="px-3 py-1 border border-[#e5e5e5]/20 rounded text-[#e5e5e5]/80 hover:text-white hover:border-[#e5e5e5]/40"
                      onClick={handleSaveEdit}
                    >
                      Save
                    </button>
                    <button
                      className="px-3 py-1 border border-[#e5e5e5]/20 rounded text-[#e5e5e5]/60 hover:text-white hover:border-[#e5e5e5]/40"
                      onClick={() => setIsEditing(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </section>
              ) : (
                <section
                  ref={documentRef}
                  onMouseUp={handleTextSelection}
                  className="text-[#e5e5e5] leading-relaxed space-y-4  text-base select-text"
                  aria-label="Document content area"
                >
                  {versions.length > 0 ? (
                    <>
                      <Response className="">{versions[currentVersionIdx].content}</Response>
                      <div className="mt-4 flex justify-end">
                        <button
                          className="px-3 py-1 border border-[#e5e5e5]/20 rounded text-[#e5e5e5]/80 hover:text-white hover:border-[#e5e5e5]/40"
                          onClick={() => {
                            setIsEditing(true);
                            setEditContent(versions[currentVersionIdx].content || "");
                          }}
                        >
                          Edit
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="text-[#e5e5e5]/70">Waiting for content…</p>
                  )}
                </section>
              )}
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
            onApply={handleApply}
            onCancel={() =>
              setSelectionMenu((prev) => ({ ...prev, visible: false }))
            }
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
