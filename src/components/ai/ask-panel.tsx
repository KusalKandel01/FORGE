"use client";

import { useCallback, useRef, useState } from "react";
import { CornerDownLeft, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  followUps?: string[];
}

export interface AskPanelProps {
  title: string;
  /** One line explaining what this advisor is. */
  blurb: string;
  /** Suggested first questions shown before anything is asked. */
  starters: string[];
  /** API endpoint, e.g. /api/learn/ask */
  endpoint: string;
  /** Extra fields sent with every request (level, lesson context, ...). */
  buildContext?: () => Record<string, unknown>;
  inputPlaceholder: string;
}

const LABEL = "font-head text-xs font-extrabold uppercase tracking-[0.2em]";

/** Render answer text: blank-line paragraphs and "- " bullets. */
function AnswerBody({ text }: { text: string }) {
  const blocks = text.split("\n\n").filter((b) => b.trim().length > 0);
  return (
    <div className="space-y-3">
      {blocks.map((block, i) => {
        const lines = block.split("\n").filter((l) => l.trim().length > 0);
        const isList = lines.every((l) => l.trimStart().startsWith("- "));
        if (isList) {
          return (
            <ul key={i} className="space-y-2">
              {lines.map((line, j) => (
                <li key={j} className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
                  <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 bg-volt" />
                  <span>{line.trimStart().replace(/^- /, "")}</span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="text-sm leading-relaxed text-muted-foreground">
            {block}
          </p>
        );
      })}
    </div>
  );
}

export default function AskPanel({
  title,
  blurb,
  starters,
  endpoint,
  buildContext,
  inputPlaceholder,
}: AskPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  const ask = useCallback(
    async (rawQuestion: string) => {
      const question = rawQuestion.trim();
      if (question.length < 2 || loading) return;

      setError(null);
      setInput("");
      const history = messages.slice(-8).map((m) => ({
        role: m.role,
        content: m.text,
      }));
      setMessages((prev) => [...prev, { role: "user", text: question }]);
      setLoading(true);
      scrollToBottom();

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question,
            history,
            ...(buildContext ? buildContext() : {}),
          }),
        });
        const data = (await res.json().catch(() => null)) as
          | { answer?: string; followUps?: string[]; error?: string }
          | null;
        if (!res.ok || !data?.answer) {
          throw new Error(data?.error ?? "Try again in a moment.");
        }
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: data.answer as string, followUps: data.followUps },
        ]);
      } catch (err) {
        setError(
          err instanceof Error && err.message !== "Try again in a moment."
            ? err.message
            : "The advisor is unreachable right now. Check your connection and try again."
        );
      } finally {
        setLoading(false);
        scrollToBottom();
      }
    },
    [buildContext, endpoint, loading, messages, scrollToBottom]
  );

  const isEmpty = messages.length === 0;

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-2xl uppercase tracking-wide">
          <Sparkles className="h-5 w-5 text-volt" aria-hidden />
          {title}
        </CardTitle>
        <p className="text-sm leading-relaxed text-muted-foreground">{blurb}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEmpty && (
          <div className="flex flex-wrap gap-2">
            {starters.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void ask(s)}
                className="h-11 border border-border bg-background px-4 font-head text-[11px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:border-volt hover:text-volt"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {!isEmpty && (
          <div
            ref={scrollRef}
            className="nice-scrollbar max-h-96 space-y-4 overflow-y-auto pr-1"
            aria-live="polite"
          >
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "border p-4",
                  m.role === "user"
                    ? "border-border bg-secondary/40"
                    : "border-volt/40 bg-background"
                )}
              >
                <p
                  className={cn(
                    LABEL,
                    "mb-2",
                    m.role === "user" ? "text-muted-foreground" : "text-volt"
                  )}
                >
                  {m.role === "user" ? "You" : title}
                </p>
                {m.role === "user" ? (
                  <p className="text-sm leading-relaxed">{m.text}</p>
                ) : (
                  <AnswerBody text={m.text} />
                )}
                {m.followUps && m.followUps.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {m.followUps.map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => void ask(f)}
                        className="h-10 border border-border bg-background px-3 text-left text-xs text-muted-foreground transition-colors hover:border-volt hover:text-volt"
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 border border-volt/40 bg-background p-4">
                <Loader2 className="h-4 w-4 animate-spin text-volt" aria-hidden />
                <span className={LABEL}>Thinking...</span>
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="text-sm font-bold text-destructive" role="alert">
            {error}
          </p>
        )}

        <form
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            void ask(input);
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={inputPlaceholder}
            aria-label={`Question for ${title}`}
            className="h-12 flex-1 border-border bg-background text-base"
            autoComplete="off"
            maxLength={600}
          />
          <Button
            type="submit"
            disabled={loading || input.trim().length < 2}
            className="h-12 bg-volt px-6 font-head text-xs font-extrabold uppercase tracking-[0.2em] text-black hover:bg-volt/90"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <CornerDownLeft className="h-4 w-4" aria-hidden />
            )}
            Ask
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
