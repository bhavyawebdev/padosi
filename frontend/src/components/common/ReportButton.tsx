import { useState } from "react";

import { ApiError } from "@/lib/api";
import { Button } from "./Button";
import { Modal } from "./Modal";
import { Select, Textarea } from "./Form";

const REASONS = ["Spam or fake", "Misleading information", "Offensive content", "Dangerous / safety risk", "Other"];

interface ReportButtonProps {
  label?: string;
  icon?: string;
  className?: string;
  /** API call to perform the report. */
  submitReport: (reason: string, note: string) => Promise<unknown>;
  onReported?: () => void;
}

export function ReportButton({ submitReport, onReported, label, icon = "flag", className }: ReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await submitReport(reason, note.trim());
      setOpen(false);
      setNote("");
      onReported?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send report.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label={label ?? "Report"}
        title={label ?? "Report"}
        className={`p-2 rounded-full hover:bg-surface-variant text-on-surface-variant transition-colors ${className ?? ""}`}
      >
        <span aria-hidden className="material-symbols-outlined text-[18px]">
          {icon}
        </span>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Report this" footer={
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => setOpen(false)} className="flex-1">
            Cancel
          </Button>
          <Button variant="danger" onClick={submit} loading={submitting} className="flex-1">
            Send report
          </Button>
        </div>
      }>
        <div className="space-y-5">
          <p className="text-body-md font-body-md text-on-surface-variant">
            Reports are reviewed by your community moderators. This helps keep the neighborhood feed trustworthy.
          </p>
          <div className="space-y-2">
            <span className="block text-label-md font-label-md text-on-surface-variant">Reason</span>
            <Select value={reason} onChange={(e) => setReason(e.target.value)}>
              {REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <span className="block text-label-md font-label-md text-on-surface-variant">Details (optional)</span>
            <Textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Anything else we should know?"
            />
          </div>
          {error && <p role="alert" className="text-label-md font-label-md text-error">{error}</p>}
        </div>
      </Modal>
    </>
  );
}
