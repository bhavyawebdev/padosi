import { useState } from "react";

import { Button } from "@/components/common/Button";
import { Field, Input, Select } from "@/components/common/Form";
import { Modal } from "@/components/common/Modal";
import { useCreateProvider } from "@/features/directory/directoryHooks";
import { PROVIDER_CATEGORIES } from "@/features/directory/directoryConfig";
import { ApiError } from "@/lib/api";
import type { GeoPoint } from "@/hooks/useGeolocation";
import type { ProviderCategory } from "@/types";

interface ProviderFormModalProps {
  open: boolean;
  onClose: () => void;
  location: GeoPoint | null;
}

export function ProviderFormModal({ open, onClose, location }: ProviderFormModalProps) {
  const [category, setCategory] = useState<ProviderCategory>("cook");
  const [tagline, setTagline] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [availability, setAvailability] = useState("");
  const [serviceArea, setServiceArea] = useState("3");
  const [error, setError] = useState<string | null>(null);
  const create = useCreateProvider();

  const submit = async () => {
    if (!location) {
      setError("We need your location — allow location access or try again.");
      return;
    }
    if (tagline.trim().length < 3) {
      setError("Tell neighbors what you do in a short tagline.");
      return;
    }
    setError(null);
    try {
      await create.mutateAsync({
        category,
        tagline: tagline.trim(),
        price_range: priceRange.trim() || null,
        availability: availability.trim() || null,
        service_area_km: Number(serviceArea),
        lat: location.lat,
        lng: location.lng,
      });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create your profile.");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="List your service"
      footer={
        <Button className="w-full" size="lg" onClick={submit} loading={create.isPending} icon="storefront">
          Create profile
        </Button>
      }
    >
      <div className="space-y-5">
        <Field label="Category">
          <Select value={category} onChange={(e) => setCategory(e.target.value as ProviderCategory)}>
            {PROVIDER_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Tagline" hint="e.g. Expert cook • North & South Indian">
          <Input value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={160} placeholder="What do you offer?" />
        </Field>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Price range (optional)">
            <Input value={priceRange} onChange={(e) => setPriceRange(e.target.value)} placeholder="₹150–₹250 / meal" />
          </Field>
          <Field label="Availability (optional)">
            <Input value={availability} onChange={(e) => setAvailability(e.target.value)} placeholder="Weekdays 1–4 PM" />
          </Field>
        </div>
        <Field label="Service area radius (km)">
          <Select value={serviceArea} onChange={(e) => setServiceArea(e.target.value)}>
            {["1", "2", "3", "5", "8", "10"].map((km) => (
              <option key={km} value={km}>
                {km} km
              </option>
            ))}
          </Select>
        </Field>
        <p className="text-label-sm font-label-sm text-on-surface-variant">
          Verification is community-driven: once {3} neighbors leave text reviews, you get the Verified badge.
        </p>
        {error && <p role="alert" className="text-label-md font-label-md text-error">{error}</p>}
      </div>
    </Modal>
  );
}
