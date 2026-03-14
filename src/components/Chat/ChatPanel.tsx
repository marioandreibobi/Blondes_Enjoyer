"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { useGraphStore } from "@/store/graph-store";
import type { ChatMessage, ChatRequest } from "@/types";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function ChatPanel(): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const analysisResult = useGraphStore((s) => s.analysisResult);

  const scrollToBottom = useCallback((): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  async function handleSend(): Promise<void> {
    const trimmed = input.trim();
    if (!trimmed || streaming || !analysisResult) return;

    const userMessage: ChatMessage = {
      id: generateId(),
      role: "user",
      content: trimmed,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setStreaming(true);

    const assistantId = generateId();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "", timestamp: Date.now() },
    ]);

    const context: ChatRequest["context"] = {
      repo: analysisResult.repo,
      nodes: analysisResult.graph.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        lines: n.lines,
        complexity: n.complexity,
        description: n.description,
        risk: n.risk,
      })),
      links: analysisResult.graph.links.slice(0, 200),
      aiSummary: analysisResult.ai.summary,
      riskHotspots: analysisResult.ai.riskHotspots,
    };

    const history = messages
      .filter((m) => m.content.length > 0)
      .map((m) => ({ role: m.role, content: m.content }));

    const body: ChatRequest = { message: trimmed, context, history };

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json();
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: data.error || "Something went wrong." }
              : m
          )
        );
        setStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") break;

          try {
            const parsed = JSON.parse(payload) as { content?: string; error?: string };
            if (parsed.error) {
              accumulated += `\n\n_Error: ${parsed.error}_`;
            } else if (parsed.content) {
              accumulated += parsed.content;
            }
          } catch {
            // Skip malformed chunks
          }
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: accumulated } : m
          )
        );
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: "Failed to get a response. Please try again." }
              : m
          )
        );
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>): void {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleClear(): void {
    if (streaming && abortRef.current) {
      abortRef.current.abort();
    }
    setMessages([]);
    setStreaming(false);
  }

  return (
    <>
      {/* Toggle Button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg glow-primary hover:bg-primary/90 transition-brand"
            aria-label="Open AI chat"
          >
            <MessageCircle className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed bottom-5 right-5 z-50 flex flex-col w-96 h-[32rem] rounded-xl bg-glass border-glass shadow-blueprint backdrop-blur-xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-glass">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">
                  CodeAtlas AI
                </span>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    onClick={handleClear}
                    className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded transition-brand"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="text-muted-foreground hover:text-foreground transition-brand p-1"
                  aria-label="Close chat"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
                  <MessageCircle className="h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    Ask anything about this repository
                  </p>
                  <div className="space-y-1.5">
                    {[
                      "What's the architecture of this repo?",
                      "Which files are highest risk?",
                      "How do the dependencies flow?",
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => {
                          setInput(suggestion);
                          inputRef.current?.focus();
                        }}
                        className="block w-full text-left text-xs text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary rounded-lg px-3 py-2 transition-brand"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary/70 text-foreground"
                    }`}
                  >
                    {msg.role === "assistant" && msg.content === "" && streaming ? (
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Thinking...
                      </span>
                    ) : (
                      <span className="whitespace-pre-wrap break-words">
                        {msg.content}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-glass px-3 py-3">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about this repo..."
                  rows={1}
                  maxLength={2000}
                  disabled={streaming}
                  className="flex-1 resize-none rounded-lg bg-secondary/50 border border-glass px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || streaming || !analysisResult}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-brand"
                  aria-label="Send message"
                >
                  {streaming ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
