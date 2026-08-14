"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin, ArrowLeft, Send } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db/local-db";
import { useAuth } from "@/lib/auth/AuthContext";

export default function CreateNearbyPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("General");
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!content.trim()) {
      setError("Please enter some content for your post.");
      return;
    }

    setIsPending(true);
    setError("");

    try {
      await db.createNearbyPost({
        user_id: user.id,
        content,
        category,
        images: [],
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
      router.push("/home");
    } catch (err) {
      setError("Failed to create post. Please try again.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/create" className="inline-flex items-center gap-1.5 label-md font-bold text-primary hover:underline">
        <ArrowLeft size={18} /> Back to Post Options
      </Link>

      <div className="rounded-3xl border border-outline-variant/30 bg-surface-container-lowest soft-card-shadow p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary-fixed text-on-primary-fixed flex items-center justify-center">
            <MapPin size={24} />
          </div>
          <div>
            <h1 className="headline-md font-bold text-on-surface">Share Nearby Update</h1>
            <p className="body-md text-on-surface-variant">Post local news, events, or observations for your area.</p>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-error-container text-on-error-container label-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Textarea
            label="What's happening nearby?"
            rows={5}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share something interesting, an upcoming block meeting, or a local garden update..."
            required
          />

          <div className="flex flex-col gap-1.5">
            <label className="label-md font-semibold text-on-surface">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-12 w-full rounded-2xl border border-outline-variant bg-surface-container-lowest px-4 body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
            >
              <option value="General">General Announcement</option>
              <option value="Event">Community Event</option>
              <option value="Recommendation">Local Recommendation</option>
              <option value="Lost & Found">Lost & Found</option>
            </select>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full hover-lift"
            isLoading={isPending}
            rightIcon={<Send size={18} />}
          >
            Publish Update
          </Button>
        </form>
      </div>
    </div>
  );
}
