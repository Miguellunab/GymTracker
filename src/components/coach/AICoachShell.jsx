"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, SendHorizonal, X } from "lucide-react";
import { cn } from "@/lib/utils";

const WELCOME_MESSAGE = {
  role: "assistant",
  content: "Hola, soy tu AI Coach. Pregúntame sobre tu progreso o pide un plan para hoy."
};

export function AICoachShell() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleOpen = () => setOpen(true);
    window.addEventListener("ai-coach-open", handleOpen);
    return () => window.removeEventListener("ai-coach-open", handleOpen);
  }, []);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, open]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const nextMessages = [...messages, { role: "user", content: trimmed }];
    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages })
      });

      if (!res.ok || !res.body) {
        const errorText = await res.text();
        throw new Error(errorText || "Error del servidor");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        assistantText += chunk;
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: assistantText };
          return updated;
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error inesperado";
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: message };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl rounded-3xl border border-zinc-800 bg-zinc-950 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between border-b border-zinc-800 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">AI Coach</p>
              <p className="text-xs text-emerald-300">Hola, soy tu AI Coach</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="rounded-full border border-zinc-800 p-2 text-zinc-400 transition-colors hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div ref={listRef} className="max-h-[55vh] space-y-4 overflow-y-auto px-4 py-3">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={cn(
                "flex",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2 text-sm leading-relaxed",
                  message.role === "user"
                    ? "bg-emerald-500/20 text-emerald-100"
                    : "bg-zinc-900 text-zinc-200"
                )}
              >
                {message.content || (message.role === "assistant" && loading ? "..." : "")}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-zinc-800 p-4">
          <div className="flex items-center gap-3">
            <textarea
              ref={inputRef}
              rows={2}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu mensaje..."
              className="flex-1 resize-none rounded-2xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500"
            />
            <button
              onClick={sendMessage}
              disabled={loading}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-300 transition-colors hover:bg-emerald-500/30 disabled:opacity-60"
            >
              <SendHorizonal className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
