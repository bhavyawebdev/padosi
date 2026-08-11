import { useState } from "react";

import { Button } from "@/components/common/Button";
import { Modal } from "@/components/common/Modal";
import { Textarea } from "@/components/common/Form";
import { ApiError } from "@/lib/api";
import { StarPicker } from "./Stars";

interface ReviewModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (rating: number, text: string) => Promise<unknown>;
}

export function ReviewModal({ open, onClose, onSubmit }: ReviewModalProps) {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (text.trim().length < 10) {
      setError("Please write a few sentences — text reviews build real trust.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(rating, text.trim());
      setText("");
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => !submitting && onClose()}
      title="Review this provider"
      footer={
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={submit} loading={submitting} className="flex-1">
            Submit review
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="space-y-2">
          <span className="block text-label-md font-label-md text-on-surface-variant">Your rating</span>
          <StarPicker value={rating} onChange={setRating} />
        </div>
        <div className="space-y-2">
          <span className="block text-label-md font-label-md text-on-surface-variant">
            Your experience <span className="text-outline">(required — no anonymous stars)</span>
          </span>
          <Textarea
            rows={4}
            value={text}
            maxLength={2000}
            onChange={(e) => setText(e.target.value)}
            placeholder="How was the service? Would you recommend them to a neighbor?"
          />
          <span className="text-label-sm font-label-sm text-outline">{text.length}/2000</span>
        </div>
        {error && <p role="alert" className="text-label-md font-label-md text-error">{error}</p>}
      </div>
    </Modal>
  );
}
