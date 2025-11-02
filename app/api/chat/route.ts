// Helper to convert ModelMessage to MyUiMessage
function toMyUiMessage(msg: any): MyUiMessage {
  if (msg.id && msg.parts) return msg;
  // Fallback: treat as ModelMessage
  return {
    id: generateId(),
    role: msg.role,
    parts: Array.isArray(msg.content)
      ? msg.content.map((c: any) => ({ type: "text", text: c.text || String(c) }))
      : [{ type: "text", text: msg.content || "" }],
    metadata: msg.metadata || {},
  };
}
import { horizonChat } from "@/lib/horizonChat";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  UIMessage,
} from "ai";


export async function POST(req: Request) {
  type PendingActionMeta = { pendingAction?: { type: string; documentId?: string } };
  const { messages }: { messages: (MyUiMessage & { metadata?: PendingActionMeta })[] } = await req.json();
  // Detect if the prompt is document-related or an update request
  const lastUserMessage = messages.slice().reverse().find(m => m.role === 'user');
  const docKeywords = [
    'write', 'draft', 'create', 'generate', 'outline', 'expand', 'turn', 'poem', 'article', 'blog', 'notes', 'summary', 'summarize', 'plan', 'spec', 'email', 'document', 'doc', 'prd', 'proposal', 'brief', 'forecast'
  ];
  const currentDocumentId = messages.at(-1)?.metadata?.documentId || undefined;

  const updateKeywords = [
    'update', 'edit', 'revise', 'change', 'modify', 'replace', 'improve', 'rewrite', 'reword', 'rephrase', 'add', 'remove', 'delete'
  ];
  const isDocumentPrompt = lastUserMessage && docKeywords.some(word =>
    lastUserMessage.parts.some(part =>
      part.type === 'text' && part.text?.toLowerCase().includes(word)
    )
  );
  const isUpdateRequest = lastUserMessage && updateKeywords.some(word =>
    lastUserMessage.parts.some(part =>
      part.type === 'text' && part.text?.toLowerCase().includes(word)
    )
  );

  // Detect if the previous assistant message requested confirmation and track pending action

  // Detect if user reply is a confirmation
  // Removed prevAssistantMsg, pendingAction, confirmationWords, and userConfirmed as per linter

  // Helper to get current document content from chat history
  let currentDocumentContent: string | undefined = undefined;
  if (isUpdateRequest && currentDocumentId) {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === 'assistant' && Array.isArray(msg.parts)) {
        for (const part of msg.parts) {
          if (part.type === 'data-createDocument' && part.id === currentDocumentId && part.data?.content) {
            currentDocumentContent = part.data.content;
            break;
          }
        }
      }
      if (currentDocumentContent) break;
    }
  }

  const stream = createUIMessageStream<MyUiMessage>({
    execute: async ({ writer }) => {
      // Compose the system prompt as before
      const systemPrompt = [
        "You are a focused chat assistant inside a document workspace.",
        "When the user asks to create, draft, write, outline, summarize into a doc, generate text, or produce any long-form content (e.g., article, blog post, notes, PRD, email, plan, poem, spec), you must call the createDocument tool.",
        "Do not paste the whole document in the chat transcript yourself — delegate to createDocument so the UI can stream it into a document card.",
        "If the user is not asking to create a document and just wants a short answer, answer succinctly in chat.",
        "After calling a tool and receiving results, do not include the written document content in your chat reply. Instead, acknowledge creation (e.g., ‘I created a document’) and invite the user to open it by clicking the document card.",
        "Ask brief clarifying questions only when essential; otherwise make a reasonable assumption and proceed.",
        "If the user asks to change, revise, update, or modify an existing document, ALWAYS create a NEW document reflecting the requested changes. Do NOT attempt to edit in-place or paste the revised document into chat.",
        currentDocumentId &&
          `Current document context: The user is viewing document with id: ${currentDocumentId}. Use this only as reference; still create a NEW document with changes.`,
      ].join("\n");

      // Prepend system prompt as a MyUiMessage
      const systemMessage: MyUiMessage = {
        id: generateId(),
        role: "system",
        parts: [{ type: "text", text: systemPrompt }],
        metadata: {},
      };
      const allMessages: MyUiMessage[] = [systemMessage, ...messages];

      // Check for user confirmation and pending action
      const prevAssistantWithPending = messages.slice().reverse().find(m => m.role === 'assistant' && m.metadata?.pendingAction);
      const confirmationWordsSet = new Set(['yes', 'please do', 'go ahead', 'proceed', 'sure', 'ok', 'okay', 'yep', 'affirmative']);
      const userConfirmed = lastUserMessage?.parts.some(part =>
        part.type === 'text' && confirmationWordsSet.has(part.text?.toLowerCase().trim() || '')
      );

      if (prevAssistantWithPending?.metadata?.pendingAction && userConfirmed) {
        // Resume the pending action (e.g., forecast)
        // For forecast, use the uploaded document content as the basis for the forecast
        let docSystemPrompt = [
          "You are an expert financial analyst.",
          "You are given a table extracted from an uploaded spreadsheet or document containing infrastructure cost estimates (for example, for 2026).",
          "Your task is to forecast infrastructure costs for the period or timeframe specified by the user, using the table below as the primary data source for your analysis and calculations.",
          "If the uploaded table contains data for a different period than requested, extrapolate or adjust as needed to estimate costs for the user's requested timeframe.",
          "If a table is provided, always use it as the primary data source for your answer.",
          "Output strictly content (Markdown).",
          "Content requirements:",
          "- Use clean Markdown with headings, short paragraphs, and bullet lists where helpful.",
          "- Include tables if they add clarity.",
          "- Avoid YAML front matter and avoid repeating the title as an H1 unless explicitly requested.",
          "- Keep tone clear and professional; match any user-provided tone if specified.",
          "- If requirements are ambiguous, choose sensible defaults and proceed.",
        ];
        const docSystemMessage: MyUiMessage = {
          id: generateId(),
          role: "system",
          parts: [{ type: "text", text: docSystemPrompt.join("\n") }],
          metadata: {},
        };
        // Compose user messages: first, the uploaded document content (if available), then the user's forecast request
        let docUserMessages: MyUiMessage[] = [];
        if (currentDocumentContent) {
          docUserMessages.push({
            id: generateId(),
            role: "user",
            parts: [{ type: "text", text: `Below is the extracted table from the uploaded file. Use this data for your analysis and calculations.\n\n${currentDocumentContent}` }],
            metadata: {},
          });
        }
        docUserMessages.push(
          lastUserMessage
            ? {
                id: generateId(),
                role: "user",
                parts: lastUserMessage.parts,
                metadata: lastUserMessage.metadata,
              }
            : {
                id: generateId(),
                role: "user",
                parts: [{ type: "text", text: "Write a forecast document as requested." }],
                metadata: {},
              }
        );
        const docMessages: MyUiMessage[] = [
          docSystemMessage,
          ...docUserMessages,
        ];
        const docData = await horizonChat(docMessages);
        const fullContent = docData.message.content;
        const messageId = generateId();
        writer.write({
          type: "text-start",
          id: messageId,
        });
        writer.write({
          type: "text-delta",
          delta: `I created a document with the forecasted infrastructure costs based on your uploaded estimate and request. Please open the document card below to view the results.`,
          id: messageId,
        });
        writer.write({
          type: "text-end",
          id: messageId,
        });
        writer.write({
          type: "data-createDocument",
          id: messageId,
          data: {
            status: "success",
            content: fullContent,
            title: "Forecasted Infrastructure Costs",
          },
        });
        return;
      }

      // Call Horizon chat API for the chat response (default path)
      const data = await horizonChat(allMessages);
      const content = data.message.content;
      const messageId = generateId();

      // If the response is a confirmation request, add pendingAction metadata
      // let pendingAction: any = undefined;
      // if (content && /would you like me to proceed|should i continue|do you want me to/i.test(content)) {
      //   // Try to infer action type from previous user message
      //   let actionType = 'unknown';
      //   if (lastUserMessage && lastUserMessage.parts.some(part => part.type === 'text' && /forecast/i.test(part.text))) {
      //     actionType = 'forecast';
      //   }
      //   pendingAction = {
      //     type: actionType,
      //     documentId: currentDocumentId,
      //   };
      // }

      // Stream the text part with pendingAction metadata if present
      writer.write({
        type: "text-start",
        id: messageId,
        // metadata: pendingAction ? { pendingAction } : undefined, // Not supported by type, so skip
      });
      writer.write({
        type: "text-delta",
        delta: content,
        id: messageId,
      });
      writer.write({
        type: "text-end",
        id: messageId,
      });

      // If document, stream the document part as a part of the same message id
      if (isDocumentPrompt || isUpdateRequest) {
        // Compose a system prompt for document creation or update
        let docSystemPrompt = [
          "You generate a polished, useful document from the conversation context.",
          "If a table is provided, always use it as the primary data source for your answer.",
          "Output strictly content (Markdown).",
          "Content requirements:",
          "- Use clean Markdown with headings, short paragraphs, and bullet lists where helpful.",
          "- Include code blocks or tables if they add clarity.",
          "- Avoid YAML front matter and avoid repeating the title as an H1 unless explicitly requested.",
          "- Keep tone clear and professional; match any user-provided tone if specified.",
          "- If requirements are ambiguous, choose sensible defaults and proceed.",
        ];
        if (isUpdateRequest && currentDocumentContent) {
          docSystemPrompt.unshift(
            "The user wants to update the following document. Apply their requested changes to this document, keeping all other content unchanged unless specified."
          );
        }
        const docSystemMessage: MyUiMessage = {
          id: generateId(),
          role: "system",
          parts: [{ type: "text", text: docSystemPrompt.join("\n") }],
          metadata: {},
        };

        // For forecast or upload, always include the most recent extracted table from chat history
        let docUserMessages: MyUiMessage[] = [];
        // 1. Prefer extractedTable from metadata if present
        let tableText: string | undefined = undefined;
        for (let i = messages.length - 1; i >= 0; i--) {
          const msg = messages[i];
          if (msg.metadata && typeof msg.metadata.extractedTable === 'string' && msg.metadata.extractedTable.trim().length > 0) {
            tableText = msg.metadata.extractedTable;
            break;
          }
        }
        // 2. Fallback: search for markdown table in message parts
        if (!tableText) {
          const markdownTableRegex = /\|(.+)\|\n\|([\s\-|]+)\|([\s\S]*)/m;
          for (let i = messages.length - 1; i >= 0; i--) {
            const msg = messages[i];
            if (msg.parts && Array.isArray(msg.parts)) {
              for (const part of msg.parts) {
                if (part.type === 'text' && typeof part.text === 'string' && markdownTableRegex.test(part.text)) {
                  tableText = part.text;
                  break;
                }
              }
            }
            if (tableText) break;
          }
        }
        if (tableText) {
          docUserMessages.push({
            id: generateId(),
            role: "user",
            parts: [{ type: "text", text: `Below is the extracted table from the uploaded file. Use this data for your analysis and calculations.\n\n${tableText}` }],
            metadata: {},
          });
        } else if (isUpdateRequest && currentDocumentContent) {
          docUserMessages.push({
            id: generateId(),
            role: "user",
            parts: [{ type: "text", text: `Current document:\n\n${currentDocumentContent}` }],
            metadata: {},
          });
        }
        // Always include the user's latest request (unless it's already the table)
        if (!tableText || (lastUserMessage && lastUserMessage.parts && !lastUserMessage.parts.some(part => part.type === 'text' && typeof part.text === 'string' && tableText && lastUserMessage.parts.some(p => p.type === 'text' && p.text === tableText)))) {
          docUserMessages.push(
            lastUserMessage
              ? {
                  id: generateId(),
                  role: "user",
                  parts: lastUserMessage.parts,
                  metadata: lastUserMessage.metadata,
                }
              : {
                  id: generateId(),
                  role: "user",
                  parts: [{ type: "text", text: "Write a document as requested." }],
                  metadata: {},
                }
          );
        }

        const docMessages: MyUiMessage[] = [
          docSystemMessage,
          ...docUserMessages,
        ];

        const docData = await horizonChat(docMessages);
        const fullContent = docData.message.content;
        writer.write({
          type: "data-createDocument",
          id: messageId, // use the same message id as the text part
          data: {
            status: "success",
            content: fullContent,
            title: isUpdateRequest ? "Updated Document" : "Generated Document",
          },
        });
      }
    }
  });

  return createUIMessageStreamResponse({ stream });
}
// Define CreateDocumentPart type for document creation data
type CreateDocumentPart = {
  status: string;
  content: string;
  title: string;
};

export type MyDataTypes = {
  createDocument: CreateDocumentPart;
};

export type MyUiMessage = UIMessage<{ documentId?: string; extractedTable?: string; [key: string]: any }, MyDataTypes, any>;
