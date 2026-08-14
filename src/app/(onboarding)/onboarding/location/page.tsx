"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, ArrowRight, Shield } from "lucide-react";

export default function LocationOnboardingPage() {
  const router = useRouter();
  const [location, setLocation] = useState("");
  const [isDetecting, setIsDetecting] = useState(false);

  const handleDetect = () => {
    setIsDetecting(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation("Detected: Sunrise Greens, Sector 15");
          setIsDetecting(false);
        },
        () => {
          setLocation("Sector 15, Vasundhara");
          setIsDetecting(false);
        }
      );
    } else {
      setLocation("Sector 15, Vasundhara");
      setIsDetecting(false);
    }
  };

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    router.push("/onboarding/profile");
  };

  return (
    <div className="w-full max-w-lg mx-auto py-8 px-4">
      <div className="rounded-3xl border border-outline-variant/30 bg-surface-container-lowest soft-card-shadow p-8 space-y-6 animate-in fade-in duration-300">
        {/* Progress header */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            <div className="w-8 h-2 rounded-full bg-primary" />
            <div className="w-2 h-2 rounded-full bg-outline-variant" />
          </div>
          <span className="label-sm font-semibold text-on-surface-variant">Step 1 of 2</span>
        </div>

        <div className="space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-primary-fixed text-on-primary-fixed flex items-center justify-center mb-3">
            <MapPin size={24} />
          </div>
          <h2 className="headline-lg text-on-surface font-extrabold tracking-tight">
            Find your neighbourhood
          </h2>
          <p className="body-md text-on-surface-variant">
            Aas-Paas uses your location to show posts and verified help within your local area.
          </p>
        </div>

        <form onSubmit={handleContinue} className="space-y-4">
          <Input
            label="Search Locality or Pincode"
            type="text"
            placeholder="e.g. Indirapuram, Sector 4"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            leftIcon={<MapPin size={18} />}
            required
          />

          <Button
            type="button"
            variant="outline"
            size="md"
            className="w-full hover-lift"
            onClick={handleDetect}
            isLoading={isDetecting}
            leftIcon={<Navigation size={18} />}
          >
            Use Current Geolocation
          </Button>

          <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex items-start gap-3">
            <Shield size={20} className="text-secondary shrink-0 mt-0.5" />
            <p className="label-sm text-on-surface-variant leading-relaxed">
              Your privacy is protected. We only show coarse distance ranges (e.g. 500m) to nearby members.
            </p>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full hover-lift mt-4"
            rightIcon={<ArrowRight size={18} />}
          >
            Continue to Profile Setup
          </Button>
        </form>
      </div>
    </div>
  );
}
