import openrouter from "@/lib/openrouter";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  generateObject,
  InferUITool,
  stepCountIs,
  streamText,
  tool,
  UIMessage,
  UIMessageStreamWriter,
} from "ai";
import { z } from "zod";

export async function POST(req: Request) {
  const { messages }: { messages: MyUiMessage[] } = await req.json();

  const currentDocumentId =
    messages[messages.length - 1]?.metadata?.documentId || undefined;

  const stream = createUIMessageStream<MyUiMessage>({
    execute: ({ writer }) => {
      const result = streamText({
        model: openrouter("google/gemini-2.5-flash"),
        messages: convertToModelMessages(messages),
        system: [
          "You are a focused chat assistant inside a document workspace.",
          "When the user asks to create, draft, write, outline, summarize into a doc, generate text, or produce any long-form content (e.g., article, blog post, notes, PRD, email, plan, poem, spec), you must call the createDocument tool.",
          "Do not paste the whole document in the chat transcript yourself — delegate to createDocument so the UI can stream it into a document card.",
          "If the user is not asking to create a document and just wants a short answer, answer succinctly in chat.",
          "After calling a tool and receiving results, do not include the written document content in your chat reply. Instead, acknowledge creation (e.g., ‘I created a document’) and invite the user to open it by clicking the document card.",
          "Ask brief clarifying questions only when essential; otherwise make a reasonable assumption and proceed.",
          "If the user asks to change, revise, update, or modify an existing document, ALWAYS create a NEW document reflecting the requested changes. Do NOT attempt to edit in-place or paste the revised document into chat.",
          currentDocumentId &&
            `Current document context: The user is viewing document with id: ${currentDocumentId}. Use this only as reference; still create a NEW document with changes.`,
        ].join("\n"),
        stopWhen: stepCountIs(5),
        tools: { createDocument: createDocumentTool(writer) },
      });

      writer.merge(result.toUIMessageStream());
    },
  });

  return createUIMessageStreamResponse({ stream });
}

const createDocumentTool = (writer: UIMessageStreamWriter<MyUiMessage>) => {
  return tool({
    name: "createDocument",
    description: [
      "Create or draft a well-structured long-form document in Markdown, returning a concise title and the full content.",
      "Use this tool whenever the user asks to write, draft, create, generate, outline, expand, or turn content into a document (e.g., notes, briefs, PRDs, specs, proposals, plans, emails, blog posts, articles, summaries).",
      "The UI streams the result into a document card.",
    ].join(" "),
    inputSchema: z.object({ title: z.string() }),
    outputSchema: z.string(),
    execute: async (input, { messages }) => {
      const documentId = generateId();
      const { textStream } = streamText({
        model: openrouter("openai/gpt-5-mini"),
        system: [
          "You generate a polished, useful document from the conversation context.",
          "Output strictly content (Markdown).",
          "Content requirements:",
          "- Use clean Markdown with headings, short paragraphs, and bullet lists where helpful.",
          "- Include code blocks or tables if they add clarity.",
          "- Avoid YAML front matter and avoid repeating the title as an H1 unless explicitly requested.",
          "- Keep tone clear and professional; match any user-provided tone if specified.",
          "- If requirements are ambiguous, choose sensible defaults and proceed.",
        ].join("\n"),
        messages: [
          ...messages,
          { role: "user", content: "Here is the title: " + input.title },
        ],
      });

      writer.write({
        type: "data-createDocument",
        id: documentId,
        data: {
          status: "processing",
          content: undefined,
          title: input.title,
        },
      });

      let fullContent = "";

      for await (const chunk of textStream) {
        fullContent += chunk;

        writer.write({
          type: "data-createDocument",
          id: documentId,
          data: {
            status: "streaming",
            content: fullContent,
            title: input.title,
          },
        });
      }

      writer.write({
        type: "data-createDocument",
        id: documentId,
        data: {
          status: "success",
          content: fullContent,
          title: input.title,
        },
      });

      return `<created_document id="${documentId}">
        ${fullContent}
        </created_document>`;
    },
  });
};

export type CreateDocumentPart = {
  status: "processing" | "streaming" | "success" | "error";
  content: string | undefined;
  title: string | undefined;
};
export type MyDataTypes = {
  createDocument: CreateDocumentPart;
};

export type MyUiMessage = UIMessage<{ documentId?: string }, MyDataTypes, any>;
