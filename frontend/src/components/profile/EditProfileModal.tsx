import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/common/Button";
import { Field, Input, SearchInput, Textarea } from "@/components/common/Form";
import { Modal } from "@/components/common/Modal";
import { useLocalities } from "@/features/auth/authHooks";
import { updateMe } from "@/features/auth/authApi";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useAuth } from "@/hooks/useAuth";
import type { Locality } from "@/types";

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
}

export function EditProfileModal({ open, onClose }: EditProfileModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [about, setAbout] = useState(user?.about ?? "");
  const [localityQuery, setLocalityQuery] = useState(user?.locality?.name ?? "");
  const [localityId, setLocalityId] = useState<string | null>(user?.locality?.id ?? null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: localities } = useLocalities(undefined, localityQuery && localityQuery !== user?.locality?.name ? localityQuery : undefined);
  const list: Locality[] = localityQuery && localityQuery !== user?.locality?.name ? (localities ?? []) : (localities ?? []);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const updated = await updateMe({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        about: about.trim() || null,
        locality_id: localityId ?? undefined,
      });
      queryClient.setQueryData(["me"], updated);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save changes.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => !submitting && onClose()}
      title="Edit profile"
      footer={
        <Button className="w-full" size="lg" onClick={submit} loading={submitting} icon="save">
          Save changes
        </Button>
      }
    >
      <div className="space-y-5">
        <Field label="Full name">
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
        </Field>
        <Field label="Phone" hint="Verified numbers build trust">
          <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
        </Field>
        <Field label="About">
          <Textarea rows={3} maxLength={500} value={about} onChange={(e) => setAbout(e.target.value)} placeholder="A little about you…" />
        </Field>
        <Field label="Locality">
          <SearchInput placeholder="Search your area…" value={localityQuery} onChange={(e) => setLocalityQuery(e.target.value)} />
          <div className="mt-3 max-h-40 overflow-y-auto rounded-xl border border-outline-variant divide-y divide-outline-variant/40">
            {list.map((loc) => (
              <button
                key={loc.id}
                type="button"
                onClick={() => {
                  setLocalityId(loc.id);
                  setLocalityQuery(loc.name);
                }}
                className={cn(
                  "w-full flex items-center justify-between gap-3 px-5 py-3 text-left hover:bg-surface-variant transition-colors",
                  localityId === loc.id && "bg-primary/10",
                )}
              >
                <span className="min-w-0">
                  <span className="block text-body-md font-body-md text-on-surface truncate">{loc.name}</span>
                  <span className="block text-label-sm font-label-sm text-on-surface-variant">
                    {loc.city} · {loc.state}
                  </span>
                </span>
                {localityId === loc.id && (
                  <span aria-hidden className="material-symbols-outlined text-primary text-[18px] shrink-0" style={{ fontVariationSettings: "'FILL'1" }}>
                    check_circle
                  </span>
                )}
              </button>
            ))}
          </div>
        </Field>
        {error && <p role="alert" className="text-label-md font-label-md text-error">{error}</p>}
      </div>
    </Modal>
  );
}
