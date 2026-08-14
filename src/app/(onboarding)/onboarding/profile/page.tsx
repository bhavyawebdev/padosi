"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { User, Sparkles, ArrowRight, Check } from "lucide-react";

const INTEREST_OPTIONS = [
  "Gardening & Plants",
  "Pet Care & Walking",
  "Plumbing & Tools",
  "Elderly Support",
  "Carpooling & Rides",
  "Books & Borrowing",
  "Local Events & Sports",
  "Emergency Assistance",
];

export default function ProfileOnboardingPage() {
  const router = useRouter();
  const [bio, setBio] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>(["Gardening & Plants"]);

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  };

  const handleFinish = (e: React.FormEvent) => {
    e.preventDefault();
    router.push("/home");
  };

  return (
    <div className="w-full max-w-lg mx-auto py-8 px-4">
      <div className="rounded-3xl border border-outline-variant/30 bg-surface-container-lowest soft-card-shadow p-8 space-y-6 animate-in fade-in duration-300">
        {/* Progress header */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            <div className="w-2 h-2 rounded-full bg-outline-variant" />
            <div className="w-8 h-2 rounded-full bg-primary" />
          </div>
          <span className="label-sm font-semibold text-on-surface-variant">Step 2 of 2</span>
        </div>

        <div className="space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center mb-3">
            <Sparkles size={24} />
          </div>
          <h2 className="headline-lg text-on-surface font-extrabold tracking-tight">
            Personalize your presence
          </h2>
          <p className="body-md text-on-surface-variant">
            Introduce yourself to neighbours and select topics you are interested in.
          </p>
        </div>

        <form onSubmit={handleFinish} className="space-y-6">
          <Textarea
            label="Short Bio"
            placeholder="Tell your neighbours a little about yourself..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />

          <div className="space-y-2">
            <label className="label-md text-on-surface font-semibold">
              Community Interests & Skills
            </label>
            <div className="flex flex-wrap gap-2 pt-1">
              {INTEREST_OPTIONS.map((interest) => {
                const isSelected = selectedInterests.includes(interest);
                return (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full label-sm font-semibold transition-all ${
                      isSelected
                        ? "bg-secondary-container text-on-secondary-container border border-secondary-container shadow-xs"
                        : "bg-surface-container text-on-surface-variant border border-outline-variant/40 hover:bg-surface-container-high"
                    }`}
                  >
                    {isSelected && <Check size={14} />}
                    {interest}
                  </button>
                );
              })}
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full hover-lift mt-4"
            rightIcon={<ArrowRight size={18} />}
          >
            Go to Neighbourhood Hub
          </Button>
        </form>
      </div>
    </div>
  );
}
