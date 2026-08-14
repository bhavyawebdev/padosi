import React, { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MapPin, Heart, CheckCircle2, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import type { HelpRequestWithUser } from "@/lib/db/types";

interface NeedRequestCardProps {
  request: HelpRequestWithUser;
}

export function NeedRequestCard({ request }: NeedRequestCardProps) {
  const [isOfferOpen, setIsOfferOpen] = useState(false);
  const [offerSubmitted, setOfferSubmitted] = useState(false);

  const isResolved = request.status === "resolved";
  const requesterName = request.user?.full_name || "Neighbour";

  const handleOfferHelp = (e: React.FormEvent) => {
    e.preventDefault();
    setOfferSubmitted(true);
    setTimeout(() => {
      setOfferSubmitted(false);
      setIsOfferOpen(false);
    }, 2000);
  };

  return (
    <>
      <Card hoverable className={`p-6 overflow-hidden ${isResolved ? "opacity-80 bg-surface-container" : ""}`}>
        <div className="flex items-start justify-between">
          <Link
            href={`/profile/${request.user.id}`}
            className="flex items-center gap-3 group min-w-0"
          >
            <div className="w-11 h-11 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-bold flex items-center justify-center text-base shrink-0 overflow-hidden border border-tertiary-fixed">
              {request.user?.avatar_url ? (
                <img
                  src={request.user.avatar_url}
                  alt={requesterName}
                  className="w-full h-full object-cover"
                />
              ) : (
                requesterName.charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="label-md font-bold text-on-surface group-hover:text-tertiary transition-colors">{requesterName}</span>
                <span className="label-sm text-on-surface-variant/70 shrink-0">
                  · {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-0.5 label-sm text-on-surface-variant">
                <MapPin size={12} className="text-tertiary" />
                <span>Sector 15 · 400m away</span>
              </div>
            </div>
          </Link>

          <Badge variant={isResolved ? "default" : "need"}>
            {isResolved ? "Resolved" : request.category || "Need It Now"}
          </Badge>
        </div>

        <div className="mt-4 space-y-2">
          <h3 className="headline-md text-on-surface font-bold tracking-tight">
            {request.title}
          </h3>
          <p className="body-md text-on-surface-variant whitespace-pre-wrap leading-relaxed">
            {request.description}
          </p>
        </div>

        {!isResolved && (
          <div className="mt-5 pt-4 border-t border-outline-variant/20 flex items-center justify-between">
            <span className="label-sm font-semibold text-tertiary flex items-center gap-1">
              <Clock size={14} /> Urgent Request
            </span>
            <Button
              variant="need"
              size="md"
              className="hover-lift shadow-xs"
              leftIcon={<Heart size={16} />}
              onClick={() => setIsOfferOpen(true)}
            >
              I Can Help
            </Button>
          </div>
        )}
      </Card>

      {/* Offer Help Drawer */}
      <Drawer
        isOpen={isOfferOpen}
        onClose={() => setIsOfferOpen(false)}
        title={`Offer help to ${requesterName}`}
      >
        {offerSubmitted ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-tertiary-fixed text-on-tertiary-fixed mx-auto flex items-center justify-center">
              <CheckCircle2 size={28} />
            </div>
            <h4 className="headline-md font-bold text-on-surface">Offer Sent!</h4>
            <p className="body-md text-on-surface-variant">
              Thank you for supporting your neighbour. {requesterName} will be notified immediately.
            </p>
          </div>
        ) : (
          <form onSubmit={handleOfferHelp} className="space-y-4 py-2">
            <div className="p-4 rounded-2xl bg-tertiary-fixed/30 border border-tertiary-fixed/60">
              <h5 className="label-md font-bold text-on-surface">{request.title}</h5>
              <p className="body-sm text-on-surface-variant line-clamp-2 mt-1">{request.description}</p>
            </div>
            <textarea
              required
              rows={4}
              placeholder={`Hi ${requesterName}, I have what you need and can help out right away...`}
              className="w-full rounded-2xl border border-outline-variant p-4 body-md bg-surface-container-lowest text-on-surface focus:border-tertiary focus:ring-2 focus:ring-tertiary/20 outline-none"
            />
            <Button variant="need" size="lg" type="submit" className="w-full hover-lift">
              Submit Help Offer
            </Button>
          </form>
        )}
      </Drawer>
    </>
  );
}
