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
  tool,
  UIMessage,
  UIMessageStreamWriter,
} from "ai";
import { z } from "zod";

export async function POST(req: Request) {
  const { messages }: { messages: MyUiMessage[] } = await req.json();
  // Detect if the prompt is document-related or an update request
  const lastUserMessage = messages.slice().reverse().find(m => m.role === 'user');
  const docKeywords = [
    'write', 'draft', 'create', 'generate', 'outline', 'expand', 'turn', 'poem', 'article', 'blog', 'notes', 'summary', 'summarize', 'plan', 'spec', 'email', 'document', 'doc', 'prd', 'proposal', 'brief'
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

      // Call Horizon chat API for the chat response
      const data = await horizonChat(allMessages);
      const content = data.message.content;
      const messageId = generateId();

      // Stream the text part
      writer.write({
        type: "text-start",
        id: messageId,
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

        // For update, include the current document content as a user message
        let docUserMessages: MyUiMessage[] = [];
        if (isUpdateRequest && currentDocumentContent) {
          docUserMessages.push({
            id: generateId(),
            role: "user",
            parts: [{ type: "text", text: `Current document:\n\n${currentDocumentContent}` }],
            metadata: {},
          });
        }
        // Always include the user's latest request
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
};
// Define CreateDocumentPart type for document creation data
type CreateDocumentPart = {
  status: string;
  content: string;
  title: string;
};

export type MyDataTypes = {
  createDocument: CreateDocumentPart;
};

export type MyUiMessage = UIMessage<{ documentId?: string }, MyDataTypes, any>;
