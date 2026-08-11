import { useState } from "react";

import { Modal } from "@/components/common/Modal";
import { Textarea } from "@/components/common/Form";

interface BookingModalProps {
  open: boolean;
  providerName: string;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (message: string) => void;
}

export function BookingModal({ open, providerName, submitting, error, onClose, onSubmit }: BookingModalProps) {
  const [message, setMessage] = useState("");

  const submit = () => {
    if (message.trim().length < 5 || submitting) return;
    onSubmit(message.trim());
    setMessage("");
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Request service"
      footer={
        <button
          onClick={submit}
          disabled={message.trim().length < 5 || submitting}
          className="w-full inline-flex items-center justify-center gap-2 bg-primary text-on-primary py-3 rounded-full text-label-md font-label-md hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-sm active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
        >
          <span aria-hidden className="material-symbols-outlined text-[20px]">
            handshake
          </span>
          {submitting ? "Sending…" : "Send request"}
        </button>
      }
    >
      <div className="space-y-4">
        <p className="text-body-md font-body-md text-on-surface-variant">
          Tell <strong className="text-on-background">{providerName}</strong> what you need. They'll see
          this in their bookings and can accept or decline — accepting opens a private chat so you can
          coordinate.
        </p>
        <Textarea
          autoFocus
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={1000}
          placeholder="e.g. Hi! I need a plumber this Saturday morning to fix a leaking tap — 2 flats, Hill Road."
        />
        {error && <p className="text-label-sm font-label-sm text-error">{error}</p>}
      </div>
    </Modal>
  );
}
