
import tokenManager from "@/lib/tokenManager";
import type { UIMessage } from "ai";

export interface HorizonMessage {
  role: string;
  content: string;
}

export async function horizonChat(
  messages: Array<UIMessage | HorizonMessage>,
  {
    stream = false,
    qos = "accurate",
    preview = false,
    reasoning = false,
    timeoutMs = 30000,
  }: {
    stream?: boolean;
    qos?: string;
    preview?: boolean;
    reasoning?: boolean;
    timeoutMs?: number;
  } = {}
) {
  const accessToken = await tokenManager.getToken();
  if (!accessToken) {
    console.error("[horizonChat] No access token available");
    throw new Error("No access token available");
  }

  const url = `https://api.horizon.elevancehealth.com/v2/text/chats?qos=${qos}&preview=${preview}&reasoning=${reasoning}`;
  // Transform internal messages to Horizon API format
  const horizonMessages: HorizonMessage[] = messages.map((m: any) => ({
    role: m.role,
    content: Array.isArray(m.parts)
      ? m.parts.map((p: { text: string }) => p.text).join(" ")
      : m.content || ""
  }));
  const payload = { messages: horizonMessages, stream };
  console.log("[horizonChat] Request URL:", url);
  console.log("[horizonChat] Access Token (first 8 chars):", accessToken.slice(0, 8), "...");
  console.log("[horizonChat] Payload:", JSON.stringify(payload));


  let response;
  try {
    // Add timeout to fetch
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.error(`[horizonChat] Fetch timed out after ${timeoutMs}ms`);
      throw new Error(`Horizon API did not respond within ${timeoutMs}ms`);
    }
    console.error("[horizonChat] Fetch error:", err);
    throw err;
  }


  if (!response.ok) {
    const err = await response.text();
    console.error(`[horizonChat] Horizon chat failed: ${response.status} ${response.statusText} - ${err}`);
    throw new Error(`Horizon chat failed: ${response.status} ${response.statusText} - ${err}`);
  }

  let data;
  try {
    data = await response.json();
  } catch (err) {
    console.error("[horizonChat] Error parsing JSON:", err);
    throw err;
  }
  console.log("[horizonChat] Response data:", data);
  return data;
}
