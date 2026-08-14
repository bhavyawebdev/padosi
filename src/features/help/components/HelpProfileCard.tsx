import React, { useState } from "react";
import Link from "next/link";
import { Star, ShieldCheck, Mail, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Drawer } from "@/components/ui/drawer";
import type { HelpProfileWithUser } from "@/lib/db/types";

interface HelpProfileCardProps {
  profile: HelpProfileWithUser;
}

export function HelpProfileCard({ profile }: HelpProfileCardProps) {
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [contactSent, setContactSent] = useState(false);

  const helperName = profile.user?.full_name || "Verified Helper";

  const handleSendContact = (e: React.FormEvent) => {
    e.preventDefault();
    setContactSent(true);
    setTimeout(() => {
      setContactSent(false);
      setIsContactOpen(false);
    }, 2000);
  };

  return (
    <>
      <Card hoverable className="p-6 overflow-hidden flex flex-col justify-between h-full">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
          <Link
            href={`/profile/${profile.user.id}`}
            className="flex items-center gap-3 group min-w-0"
          >
            <div className="w-12 h-12 rounded-full bg-secondary-container text-on-secondary-container font-bold flex items-center justify-center text-lg shrink-0 overflow-hidden border border-secondary-container">
              {profile.user?.avatar_url ? (
                <img
                  src={profile.user.avatar_url}
                  alt={helperName}
                  className="w-full h-full object-cover"
                />
              ) : (
                helperName.charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="label-md font-bold text-on-surface group-hover:text-secondary transition-colors">{helperName}</h3>
                {(profile.is_verified ?? true) && (
                  <ShieldCheck size={16} className="text-secondary" aria-label="Verified Helper" />
                )}
              </div>
              <Badge variant="help" className="mt-1">
                {profile.category}
              </Badge>
            </div>
          </Link>

            <div className="flex items-center gap-1 bg-tertiary-fixed/40 px-2.5 py-1 rounded-full text-on-tertiary-fixed-variant label-sm font-bold border border-tertiary-fixed/60 shrink-0">
              <Star size={13} className="fill-tertiary text-tertiary" />
              <span>{profile.rating || "4.9"}</span>
            </div>
          </div>

          <p className="body-md text-on-surface-variant line-clamp-3 leading-relaxed">
            {profile.description}
          </p>
        </div>

        <div className="pt-5 mt-4 border-t border-outline-variant/20">
          <Button
            variant="secondary"
            size="md"
            className="w-full hover-lift"
            leftIcon={<Mail size={18} />}
            onClick={() => setIsContactOpen(true)}
          >
            Contact Helper
          </Button>
        </div>
      </Card>

      {/* Contact Drawer */}
      <Drawer
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
        title={`Connect with ${helperName}`}
      >
        {contactSent ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-secondary-container text-on-secondary-container mx-auto flex items-center justify-center">
              <CheckCircle size={28} />
            </div>
            <h4 className="headline-md font-bold text-on-surface">Request Sent!</h4>
            <p className="body-md text-on-surface-variant">
              {helperName} has been notified of your message.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSendContact} className="space-y-4 py-2">
            <p className="body-md text-on-surface-variant">
              Send a direct message to request support or inquire about availability.
            </p>
            <textarea
              required
              rows={4}
              placeholder={`Hi ${helperName}, I saw your verified profile on Aas-Paas and would like to ask...`}
              className="w-full rounded-2xl border border-outline-variant p-4 body-md bg-surface-container-lowest text-on-surface focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none"
            />
            <Button variant="secondary" size="lg" type="submit" className="w-full hover-lift">
              Send Message
            </Button>
          </form>
        )}
      </Drawer>
    </>
  );
}
