"use client";

import React, { use } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Star, Mail, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function HelpDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/help" className="inline-flex items-center gap-1.5 label-md font-bold text-secondary hover:underline">
        <ArrowLeft size={18} /> Back to Verified Help
      </Link>

      <Card className="p-6 md:p-8 space-y-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-secondary-container text-on-secondary-container font-extrabold flex items-center justify-center text-2xl border-2 border-secondary-container">
              V
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="headline-md font-bold text-on-surface">Verified Helper</h1>
                <ShieldCheck size={20} className="text-secondary" />
              </div>
              <p className="label-sm text-on-surface-variant flex items-center gap-1 mt-0.5">
                <MapPin size={12} className="text-secondary" /> Sector 15 · 300m away
              </p>
            </div>
          </div>
          <Badge variant="help">Plumbing & Tool Repair</Badge>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 space-y-2">
          <div className="flex items-center gap-2 text-tertiary font-bold label-md">
            <Star size={16} className="fill-tertiary" /> 4.9 Rating (18 neighbour reviews)
          </div>
          <p className="body-md text-on-surface-variant">
            Verified identity and address by Aas-Paas neighbourhood moderators.
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="headline-md font-bold text-on-surface">About this helper</h3>
          <p className="body-md text-on-surface-variant leading-relaxed">
            Experienced local technician offering assistance with household plumbing, garden irrigation setup, and basic electrical fixes. Available on weekday evenings and weekends.
          </p>
        </div>

        <div className="pt-4 border-t border-outline-variant/20">
          <Button variant="secondary" size="lg" className="w-full hover-lift" leftIcon={<Mail size={20} />}>
            Request Service
          </Button>
        </div>
      </Card>
    </div>
  );
}
