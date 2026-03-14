import { NextRequest } from "next/server";
import { getAIClient } from "@/lib/ai/client";
import type { ChatRequest } from "@/types";

const MAX_HISTORY = 10;
const MAX_NODES_IN_CONTEXT = 100;
const MAX_RETRIES = 4;
const RETRY_BASE_DELAY = 3000;

// In-memory rate limiter for chat requests
const chatRateLimit = new Map<string, { count: number; firstRequest: number }>();
const CHAT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_CHAT_PER_WINDOW = 20;

function checkChatRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = chatRateLimit.get(ip);
  if (!entry || now - entry.firstRequest > CHAT_WINDOW_MS) {
    chatRateLimit.set(ip, { count: 1, firstRequest: now });
    return true;
  }
  entry.count++;
  return entry.count <= MAX_CHAT_PER_WINDOW;
}

function buildChatSystemPrompt(context: ChatRequest["context"]): string {
  const nodesSummary = context.nodes
    .slice(0, MAX_NODES_IN_CONTEXT)
    .map(
      (n) =>
        `- ${n.id} (${n.type}, ${n.lines} lines, complexity: ${n.complexity})${n.description ? `: ${n.description}` : ""}${n.risk ? ` [RISK: ${n.risk}]` : ""}`
    )
    .join("\n");

  const risksSummary = context.riskHotspots
    .map((h) => `- ${h.file} (${h.severity}): ${h.reason}`)
    .join("\n");

  return `You are CodeAtlas AI, an expert assistant for understanding and navigating codebases. You are helping a user explore and understand the repository "${context.repo.owner}/${context.repo.name}".

## Repository Context
- Language: ${context.repo.language}
- Total files: ${context.repo.totalFiles}, analyzed: ${context.repo.analyzedFiles}

## AI Summary
${context.aiSummary}

## Files in the dependency graph:
${nodesSummary}

## Risk Hotspots:
${risksSummary || "None identified."}

## Instructions
- Answer questions about the repository's architecture, files, dependencies, and risks.
- Be specific — reference actual file paths and relationships from the graph data above.
- If asked about a file not in the graph, say so honestly.
- Keep answers concise but informative. Use bullet points for lists.
- If the user asks about code patterns, architecture decisions, or potential issues, use the graph structure and risk data to inform your answer.
- Do not make up information that isn't supported by the data above.`;
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!checkChatRateLimit(clientIp)) {
      return Response.json(
        { error: "Too many requests. Please slow down." },
        { status: 429 }
      );
    }

    const body: ChatRequest = await request.json();
    const { message, context, history } = body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return Response.json({ error: "Message is required" }, { status: 400 });
    }

    if (message.length > 2000) {
      return Response.json(
        { error: "Message too long (max 2000 characters)" },
        { status: 400 }
      );
    }

    if (!context?.repo) {
      return Response.json(
        { error: "Repository context is required" },
        { status: 400 }
      );
    }

    const client = getAIClient();
    const systemPrompt = buildChatSystemPrompt(context);

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
    ];

    // Add conversation history (capped)
    const recentHistory = (history ?? []).slice(-MAX_HISTORY);
    for (const msg of recentHistory) {
      messages.push({ role: msg.role, content: msg.content });
    }

    messages.push({ role: "user", content: message });

    let stream;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        stream = await client.chat.completions.create({
          model: "gpt-4o-mini",
          max_tokens: 1024,
          stream: true,
          messages,
        });
        break;
      } catch (err: unknown) {
        const code = (err as { code?: string }).code;
        const status = (err as { status?: number }).status;
        if (
          (code === "concurrency_limit_exceeded" || status === 429) &&
          attempt < MAX_RETRIES - 1
        ) {
          await new Promise((r) => setTimeout(r, RETRY_BASE_DELAY * (attempt + 1)));
          continue;
        }
        throw err;
      }
    }

    if (!stream) {
      return Response.json(
        { error: "AI service is busy. Please try again in a moment." },
        { status: 429 }
      );
    }

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller): Promise<void> {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
              );
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          console.error("Stream error:", err);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: "Stream interrupted" })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("Chat API error:", err);
    const code = (err as { code?: string }).code;

    if (code === "concurrency_limit_exceeded") {
      return Response.json(
        { error: "AI service is busy. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    return Response.json(
      { error: "Failed to process chat message. Please try again." },
      { status: 500 }
    );
  }
}
