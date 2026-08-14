"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HeartHandshake, ArrowLeft, Send } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db/local-db";
import { useAuth } from "@/lib/auth/AuthContext";

export default function CreateHelpPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [category, setCategory] = useState("Gardening & Plants");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!description.trim()) {
      setError("Please describe the assistance or service you can offer.");
      return;
    }

    setIsPending(true);
    setError("");

    try {
      await db.createHelpProfile({
        user_id: user.id,
        category,
        description,
      });
      router.push("/help");
    } catch (err) {
      setError("Failed to create help profile.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/create" className="inline-flex items-center gap-1.5 label-md font-bold text-secondary hover:underline">
        <ArrowLeft size={18} /> Back to Post Options
      </Link>

      <div className="rounded-3xl border border-outline-variant/30 bg-surface-container-lowest soft-card-shadow p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center">
            <HeartHandshake size={24} />
          </div>
          <div>
            <h1 className="headline-md font-bold text-on-surface">Offer Verified Help</h1>
            <p className="body-md text-on-surface-variant">List your skills or services to support neighbours.</p>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-error-container text-on-error-container label-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex flex-col gap-1.5">
            <label className="label-md font-semibold text-on-surface">Service / Skill Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-12 w-full rounded-2xl border border-outline-variant bg-surface-container-lowest px-4 body-md text-on-surface focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none"
            >
              <option value="Gardening & Plants">Gardening & Plant Care</option>
              <option value="Pet Care">Pet Care & Dog Walking</option>
              <option value="Plumbing & Repairs">Plumbing & Home Repairs</option>
              <option value="Elderly Support">Elderly Assistance</option>
              <option value="Tutoring">Academic Tutoring</option>
              <option value="General Assistance">General Assistance</option>
            </select>
          </div>

          <Textarea
            label="Service Description & Availability"
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what kind of help you can provide, your experience, and preferred hours..."
            required
          />

          <Button
            type="submit"
            variant="secondary"
            size="lg"
            className="w-full hover-lift"
            isLoading={isPending}
            rightIcon={<Send size={18} />}
          >
            Publish Verified Listing
          </Button>
        </form>
      </div>
    </div>
  );
}
