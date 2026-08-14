"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db/local-db";
import { useAuth } from "@/lib/auth/AuthContext";

export default function CreateNeedPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Tools & Equipment");
  const [expiryHours, setExpiryHours] = useState("4");
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!title.trim() || !description.trim()) {
      setError("Please fill out both the title and details for your urgent request.");
      return;
    }

    setIsPending(true);
    setError("");

    try {
      const expiresAt = new Date(Date.now() + parseInt(expiryHours, 10) * 60 * 60 * 1000).toISOString();
      await db.createHelpRequest({
        user_id: user.id,
        title,
        description,
        category,
        expires_at: expiresAt,
      });
      router.push("/need");
    } catch (err) {
      setError("Failed to create urgent request.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/create" className="inline-flex items-center gap-1.5 label-md font-bold text-tertiary hover:underline">
        <ArrowLeft size={18} /> Back to Post Options
      </Link>

      <div className="rounded-3xl border border-outline-variant/30 bg-surface-container-lowest soft-card-shadow p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center">
            <AlertCircle size={24} />
          </div>
          <div>
            <h1 className="headline-md font-bold text-on-surface">Post Urgent Request</h1>
            <p className="body-md text-on-surface-variant">Ask neighbours for immediate assistance, borrowing, or emergency help.</p>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-error-container text-on-error-container label-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="What do you need?"
            placeholder="e.g. Need to borrow a step ladder for 1 hour"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <Textarea
            label="Request Details"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Explain why you need it and how long you'll need it..."
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="label-md font-semibold text-on-surface">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-12 w-full rounded-2xl border border-outline-variant bg-surface-container-lowest px-4 body-md text-on-surface focus:border-tertiary focus:ring-2 focus:ring-tertiary/20 outline-none"
              >
                <option value="Tools & Equipment">Tools & Equipment</option>
                <option value="Medical">Medical Supplies</option>
                <option value="Ingredients">Food & Cooking Ingredients</option>
                <option value="Errands">Quick Errands</option>
                <option value="Other">Other Emergency</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="label-md font-semibold text-on-surface">Request Valid For</label>
              <select
                value={expiryHours}
                onChange={(e) => setExpiryHours(e.target.value)}
                className="h-12 w-full rounded-2xl border border-outline-variant bg-surface-container-lowest px-4 body-md text-on-surface focus:border-tertiary focus:ring-2 focus:ring-tertiary/20 outline-none"
              >
                <option value="1">1 Hour</option>
                <option value="4">4 Hours</option>
                <option value="12">12 Hours</option>
                <option value="24">24 Hours</option>
              </select>
            </div>
          </div>

          <Button
            type="submit"
            variant="need"
            size="lg"
            className="w-full hover-lift"
            isLoading={isPending}
            rightIcon={<Send size={18} />}
          >
            Submit Urgent Request
          </Button>
        </form>
      </div>
    </div>
  );
}
