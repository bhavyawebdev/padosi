"use client";

import React, { use } from "react";
import Link from "next/link";
import { ArrowLeft, AlertCircle, Clock, Heart, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function NeedDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/need" className="inline-flex items-center gap-1.5 label-md font-bold text-tertiary hover:underline">
        <ArrowLeft size={18} /> Back to Urgent Requests
      </Link>

      <Card className="p-6 md:p-8 space-y-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-bold flex items-center justify-center text-lg">
              N
            </div>
            <div>
              <h3 className="label-md font-bold text-on-surface">Neighbour in Need</h3>
              <p className="label-sm text-on-surface-variant flex items-center gap-1">
                <MapPin size={12} className="text-tertiary" /> Sector 15 · Posted 45m ago
              </p>
            </div>
          </div>
          <Badge variant="need">Urgent Request</Badge>
        </div>

        <div className="space-y-2">
          <h1 className="headline-lg text-on-surface font-extrabold tracking-tight">
            Urgent Community Request #{id}
          </h1>
          <p className="body-md text-on-surface-variant leading-relaxed">
            Need to borrow a step ladder or tool set for household repair. Willing to return within 2 hours.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-tertiary-fixed/30 border border-tertiary-fixed/60 flex items-center gap-3">
          <Clock size={20} className="text-tertiary shrink-0" />
          <p className="label-md font-semibold text-on-tertiary-fixed-variant">
            Valid for the next 3 hours. Please respond quickly if you are nearby!
          </p>
        </div>

        <div className="pt-4 border-t border-outline-variant/20">
          <Button variant="need" size="lg" className="w-full hover-lift" leftIcon={<Heart size={20} />}>
            Offer Help Now
          </Button>
        </div>
      </Card>
    </div>
  );
}
