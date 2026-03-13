"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, SendHorizonal, X, Zap, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const WELCOME_MESSAGE = {
  role: "assistant",
  content: "Hola, soy tu AI Coach. Preguntame sobre tu progreso, pide corregir un registro, o planifica tu semana."
};

const MODELS = {
  coach_llama: { label: "Llama", desc: "Groq", icon: Zap, color: "#00C853" },
  coach_deepseek: { label: "DeepSeek", desc: "R1", icon: Sparkles, color: "#2196F3" },
};

export function AICoachShell() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState("coach_llama");
  const listRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleOpen = () => setOpen(true);
    window.addEventListener("ai-coach-open", handleOpen);
    return () => window.removeEventListener("ai-coach-open", handleOpen);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
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
        body: JSON.stringify({ messages: nextMessages, model })
      });

      if (!res.ok || !res.body) {
        const errorText = await res.text();
        throw new Error(errorText || "Error del servidor");
      }

      const coachAction = res.headers.get("X-Coach-Action");

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

      // Notify home page to refresh if coach modified DB
      if (coachAction && coachAction !== "CHAT") {
        window.dispatchEvent(new Event("workout-data-changed"));
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

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const currentModel = MODELS[model];
  const ModelIcon = currentModel.icon;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-3xl glass-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-green-dim">
              <Bot className="h-4 w-4 text-[#00C853]" />
            </div>
            <div>
              <p className="text-sm font-semibold">AI Coach</p>
              {/* Model toggle */}
              <button
                onClick={() => setModel(model === "coach_llama" ? "coach_deepseek" : "coach_llama")}
                className="flex items-center gap-1 text-xs transition-colors hover:opacity-80"
                style={{ color: currentModel.color }}
                disabled={loading}
              >
                <ModelIcon className="h-3 w-3" />
                <span>{currentModel.label}</span>
                <span className="text-zinc-600 ml-0.5">({currentModel.desc})</span>
              </button>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="rounded-full p-2 text-zinc-500 transition-colors hover:text-white hover:bg-white/5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div ref={listRef} className="max-h-[55vh] space-y-3 overflow-y-auto px-4 py-3 no-scrollbar">
          {messages.map((msg, i) => (
            <div
              key={`${msg.role}-${i}`}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-[#00C853]/15 text-green-100"
                    : "bg-white/5 text-zinc-300"
                }`}
              >
                {msg.content || (msg.role === "assistant" && loading ? "..." : "")}
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="border-t border-white/5 p-4">
          <div className="flex items-center gap-3">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu mensaje..."
              className="input-dark flex-1 resize-none !rounded-2xl !py-2.5 text-sm"
            />
            <button
              onClick={sendMessage}
              disabled={loading}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#00C853]/15 text-[#00C853] transition-colors hover:bg-[#00C853]/25 disabled:opacity-40"
            >
              <SendHorizonal className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
