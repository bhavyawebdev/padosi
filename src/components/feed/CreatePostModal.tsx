import { useMemo, useState } from "react";

import { Button } from "@/components/common/Button";
import { Modal } from "@/components/common/Modal";
import { FEED_CATEGORIES } from "@/features/feed/feedConfig";
import { ApiError } from "@/lib/errors";
import { cn } from "@/lib/cn";
import type { FeedCategory, RequestType } from "@/types";

export type ComposeMode = "alert" | "help" | "borrow";

export type ComposePayload =
  | { kind: "feed"; category: FeedCategory; text: string; urgent: boolean }
  | { kind: "request"; requestType: RequestType; text: string; neededBy: string };

interface CreatePostModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: ComposePayload) => Promise<void>;
  /** Composer tiles to show — feed page: ["alert"]; needs page: ["help", "borrow"]. */
  modes: ComposeMode[];
  /** Placeholder for the area name, e.g. "Bandra West". */
  areaName: string;
}

const MODE_META: Record<ComposeMode, { icon: string; label: string; iconClass: string }> = {
  alert: { icon: "campaign", label: "Alert", iconClass: "text-secondary" },
  help: { icon: "volunteer_activism", label: "Ask for Help", iconClass: "text-primary" },
  borrow: { icon: "handshake", label: "Offer/Borrow", iconClass: "text-tertiary-container" },
};

export function CreatePostModal({ open, onClose, onSubmit, modes, areaName }: CreatePostModalProps) {
  const [mode, setMode] = useState<ComposeMode>(modes[0] ?? "alert");
  const [category, setCategory] = useState<FeedCategory>("other");
  const [text, setText] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [neededBy, setNeededBy] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestType: RequestType = useMemo(() => (mode === "borrow" ? "borrow_lend" : "other"), [mode]);

  const reset = () => {
    setMode(modes[0] ?? "alert");
    setCategory("other");
    setText("");
    setUrgent(false);
    setNeededBy("");
    setError(null);
  };

  const close = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const submit = async () => {
    if (text.trim().length < 3) {
      setError("Please share a little more detail.");
      return;
    }
    if (mode !== "alert" && !neededBy) {
      setError("Tell neighbors when you need it by.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (mode === "alert") {
        await onSubmit({ kind: "feed", category, text: text.trim(), urgent });
      } else {
        await onSubmit({
          kind: "request",
          requestType,
          text: text.trim(),
          neededBy: new Date(neededBy).toISOString(),
        });
      }
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not post. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={`What's happening in ${areaName}?`} footer={ <Button className="w-full"size="lg"icon="send"onClick={submit} loading={submitting}> {mode ==="alert"?"Post to Neighborhood":"Post Request"} </Button> } > <div className="space-y-12"> {/* Type selection (screen 03) */} <section className="space-y-3"> <h3 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Type of Post</h3> <div className="grid grid-cols-3 gap-3"> {modes.map((m) => ( <button key={m} type="button"onClick={() => setMode(m)} aria-pressed={mode === m} className={cn("flex flex-col items-center justify-center p-5 rounded-xl border transition-all group", mode === m ?"bg-surface-container border-primary shadow-sm":"bg-surface border-outline-variant hover:bg-surface-variant", )} > <span aria-hidden className={cn("material-symbols-outlined text-[32px] mb-2 group-hover:-translate-y-1 transition-transform", MODE_META[m].iconClass)} style={{ fontVariationSettings:"'FILL' 1"}} > {MODE_META[m].icon} </span> <span className="font-label-sm text-label-sm text-on-surface">{MODE_META[m].label}</span> </button> ))} </div> </section> {/* Category chips — only for alerts */} {mode ==="alert"&& ( <section className="space-y-3"> <h3 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Category</h3> <div className="flex gap-2 flex-wrap"> {FEED_CATEGORIES.map((c) => ( <button key={c.value} type="button"onClick={() => setCategory(c.value)} className={cn("whitespace-nowrap px-3 py-1.5 rounded-full text-label-md font-label-md inline-flex items-center gap-1 transition-all active:scale-95", category === c.value ? c.chipActive :"bg-surface-container-low border border-outline-variant text-on-surface-variant", )} > <span aria-hidden className="material-symbols-outlined text-[16px]"> {c.icon} </span> {c.label} </button> ))} </div> </section> )} {/* Request-specific fields */} {mode !=="alert"&& ( <section className="space-y-2"> <label className="block text-label-md font-label-md text-on-surface-variant"htmlFor="needed-by"> Needed by </label> <input id="needed-by"type="datetime-local"className="w-full bg-surface rounded-xl border border-outline-variant px-5 py-3 font-body-md text-body-md text-on-background focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"value={neededBy} onChange={(e) => setNeededBy(e.target.value)} /> <p className="text-label-sm font-label-sm text-outline">The request auto-hides after this time.</p> </section> )} {/* Text area (screen 03) */} <section className="space-y-2"> <label className="sr-only"htmlFor="post-details"> Post details </label> <div className="relative bg-surface rounded-xl border border-outline-variant focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-shadow"> <textarea id="post-details"className="w-full bg-transparent border-none rounded-xl p-5 font-body-md text-body-md text-on-background placeholder:text-outline focus:ring-0 resize-none"placeholder={mode ==="alert"?"Share details…":"What do you need?"} rows={5} value={text} maxLength={1000} onChange={(e) => setText(e.target.value)} /> <div className="absolute bottom-3 left-3 flex gap-2"> <button type="button"aria-label="Add location"className="p-2 rounded-full text-primary hover:bg-primary/10 transition-colors"> <span aria-hidden className="material-symbols-outlined text-[20px]"> location_on </span> </button> <span className="text-label-sm font-label-sm text-outline self-center"> {text.length}/1000 </span> </div> </div> </section> {/* Urgent toggle (screen 03) */} {mode ==="alert"&& ( <section className="flex items-center justify-between p-5 bg-surface rounded-xl border border-outline-variant"> <div className="flex items-center gap-3"> <span aria-hidden className="material-symbols-outlined text-error"style={{ fontVariationSettings:"'FILL' 1"}}> error </span> <div> <h3 className="font-label-md text-label-md text-on-surface">Urgent?</h3> <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">Notify neighbors immediately</p> </div> </div> <button type="button"role="switch"aria-checked={urgent} onClick={() => setUrgent((v) => !v)} className={cn("relative inline-flex h-6 w-12 items-center rounded-full transition-colors", urgent ?"bg-error":"bg-surface-variant", )} > <span className={cn("inline-block h-6 w-6 transform rounded-full bg-white border-4 transition-transform", urgent ?"translate-x-6 border-error":"translate-x-0 border-surface-variant", )} /> </button> </section> )} {error && <p role="alert"className="text-label-md font-label-md text-error">{error}</p>}
      </div>
    </Modal>
  );
}
