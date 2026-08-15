import { useEffect, useRef, useState } from "react";

import { askAssistant } from "@/features/chat/chatApi";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/cn";

interface ChatTurn {
  role: "user" | "assistant";
  text: string;
}

const HISTORY_KEY = "lp_chat_history";
const WELCOME: ChatTurn = {
  role: "assistant",
  text: "Namaste! 👋 I'm the Padosi helper. Ask me to find a provider, see what's happening nearby, or explain how anything works.",
};

function loadHistory(): ChatTurn[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatTurn[];
    if (Array.isArray(parsed)) return parsed.slice(-40);
    return [];
  } catch {
    return [];
  }
}

/** Escape user-generated content before any HTML rendering (XSS guard). */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Tiny renderer for the assistant's markdown-ish replies (**bold**, bullets).
 * The reply can contain user-generated content (post text, provider names), so
 * everything is HTML-escaped first — the `**bold**` conversion happens after
 * escaping, on text that is now inert.
 */
function RichText({ text }: { text: string }) {
  return (
    <div className="space-y-1.5">
      {text.split("\n").map((line, i) => {
        if (line.trim() === "") return <div key={i} />;
        const trimmed = line.trim();
        const isBullet = trimmed.startsWith("•");
        const content = escapeHtml(trimmed).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
        return (
          <p
            key={i}
            className={cn("text-body-md font-body-md whitespace-pre-wrap break-words", isBullet && "pl-1")}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        );
      })}
    </div>
  );
}

export function ChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([
    "Find a plumber near me",
    "What's happening nearby?",
    "How do I get verified?",
  ]);
  const [thinking, setThinking] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Restore history on first open.
  useEffect(() => {
    if (open && turns.length === 0) {
      const history = loadHistory();
      setTurns(history.length > 0 ? history : [WELCOME]);
    }
  }, [open, turns.length]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, thinking]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || thinking) return;
    const next = [...turns, { role: "user" as const, text }];
    setTurns(next);
    setDraft("");
    setThinking(true);
    try {
      const reply = await askAssistant(
        text,
        user?.locality?.lat ?? undefined,
        user?.locality?.lng ?? undefined,
      );
      const updated = [...next, { role: "assistant" as const, text: reply.reply }];
      setTurns(updated);
      setSuggestions(reply.suggestions.slice(0, 3));
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated.slice(-40)));
      } catch {
        /* storage full / private mode — chat still works in memory */
      }
    } catch {
      setTurns([
        ...next,
        {
          role: "assistant",
          text: "Sorry — I couldn't reach the neighbourhood right now. Please try again in a moment.",
        },
      ]);
    } finally {
      setThinking(false);
    }
  };

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close assistant" : "Open assistant"}
        className="fixed z-40 bottom-24 right-4 md:bottom-6 md:right-6 w-14 h-14 rounded-full bg-primary text-on-primary shadow-lg hover:bg-primary-container hover:text-on-primary-container transition-all active:scale-95 flex items-center justify-center"
        style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.25)" }}
      >
        <span aria-hidden className="material-symbols-outlined text-[26px]">
          {open ? "close" : "support_agent"}
        </span>
      </button>

      {/* Panel */}
      {open && (
        <div
          role="dialog"
          aria-label="Padosi assistant"
          className="fixed z-40 bottom-[116px] right-3 left-3 sm:left-auto sm:right-6 sm:w-[380px] max-h-[62vh] md:max-h-[560px] bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-2xl flex flex-col overflow-hidden animate-slide-up"
          style={{ maxWidth: "calc(100vw - 24px)" }}
        >
          <header className="flex items-center gap-3 px-4 py-3 bg-primary text-on-primary">
            <span className="w-9 h-9 rounded-full bg-on-primary/15 flex items-center justify-center">
              <span aria-hidden className="material-symbols-outlined text-[20px]">
                support_agent
              </span>
            </span>
            <div className="min-w-0">
              <h2 className="text-label-md font-label-md font-bold">Padosi helper</h2>
              <p className="text-label-sm font-label-sm text-on-primary/80 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 inline-block" />
                Online — knows your area
              </p>
            </div>
          </header>

          <div ref={bodyRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-surface-container-low/40">
            {turns.map((turn, i) => (
              <div key={i} className={cn("flex", turn.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] px-4 py-2.5 rounded-2xl shadow-sm border",
                    turn.role === "user"
                      ? "bg-primary text-on-primary rounded-br-md border-primary"
                      : "bg-surface-container rounded-bl-md border-surface-variant",
                  )}
                >
                  <RichText text={turn.text} />
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex justify-start">
                <div className="bg-surface-container rounded-2xl rounded-bl-md px-4 py-3 border border-surface-variant shadow-sm">
                  <span className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-outline animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-outline animate-bounce [animation-delay:120ms]" />
                    <span className="w-2 h-2 rounded-full bg-outline animate-bounce [animation-delay:240ms]" />
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Quick suggestions */}
          {suggestions.length > 0 && !thinking && (
            <div className="px-4 pb-2 flex gap-2 flex-wrap">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => void send(s)}
                  className="text-label-sm font-label-sm text-primary bg-primary-container/30 border border-primary/30 rounded-full px-3 py-1.5 hover:bg-primary-container/60 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <footer className="p-3 border-t border-outline-variant/40 bg-surface-container-low flex items-end gap-2">
            <textarea
              ref={inputRef}
              aria-label="Ask the assistant"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(draft);
                }
              }}
              rows={1}
              maxLength={500}
              placeholder="Ask me anything about your area…"
              className="flex-1 resize-none bg-surface rounded-xl border border-outline-variant px-4 py-2.5 font-body-md text-body-md text-on-background placeholder:text-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow"
            />
            <button
              onClick={() => void send(draft)}
              disabled={draft.trim().length === 0 || thinking}
              aria-label="Send"
              className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container transition-colors active:scale-95 disabled:opacity-50 disabled:pointer-events-none shrink-0"
            >
              <span aria-hidden className="material-symbols-outlined text-[20px]">
                send
              </span>
            </button>
          </footer>
        </div>
      )}
    </>
  );
}
