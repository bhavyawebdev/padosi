"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users, ArrowRight, Shield, MapPin, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SplashPage() {
  const router = useRouter();

  return (
    <main className="w-full min-h-screen relative flex flex-col items-center justify-center bg-gradient-to-br from-surface via-primary-fixed/30 to-surface overflow-hidden p-6">
      {/* Background Texture */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#823815_1px,transparent_1px)] [background-size:16px_16px]" />

      <div className="relative z-10 flex flex-col items-center justify-center text-center max-w-xl mx-auto space-y-8 animate-in fade-in zoom-in duration-500">
        {/* Brand Logo & Icon */}
        <div className="flex flex-col items-center">
          <div className="w-24 h-24 rounded-full bg-surface-container-lowest soft-card-shadow flex items-center justify-center mb-6 border border-outline-variant/30 animate-bounce duration-1000">
            <Users className="w-12 h-12 text-primary" />
          </div>
          <h1 className="display-lg text-primary font-extrabold tracking-tight">
            Aas-Paas
          </h1>
          <p className="label-sm font-semibold tracking-wider text-secondary uppercase mt-1">
            Soft Signature Community
          </p>
        </div>

        {/* Tagline */}
        <p className="headline-md text-on-surface-variant font-medium leading-relaxed max-w-md">
          Your neighbourhood, all in one place. Connect, share verified help, and discover nearby updates.
        </p>

        {/* Feature Pill Tags */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container/40 text-on-secondary-container label-sm font-semibold border border-secondary-container/60">
            <MapPin size={13} /> Nearby Right Now
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container/40 text-on-secondary-container label-sm font-semibold border border-secondary-container/60">
            <Shield size={13} /> Verified Help
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-tertiary-fixed/60 text-on-tertiary-fixed-variant label-sm font-semibold border border-tertiary-fixed">
            <Heart size={13} /> Need It Now
          </span>
        </div>

        {/* Primary Call to Action */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-sm">
          <Button
            variant="primary"
            size="xl"
            className="w-full hover-lift shadow-lg"
            rightIcon={<ArrowRight size={20} />}
            onClick={() => router.push("/home")}
          >
            Enter Neighbourhood Hub
          </Button>
          <Button
            variant="outline"
            size="xl"
            className="w-full hover-lift"
            onClick={() => router.push("/login")}
          >
            Sign In
          </Button>
        </div>
      </div>
    </main>
  );
}
