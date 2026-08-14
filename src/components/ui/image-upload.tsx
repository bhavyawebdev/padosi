"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ImageUploadProps {
  onUploadSuccess: (urls: string[]) => void;
  maxFiles?: number;
}

export function ImageUpload({ onUploadSuccess, maxFiles = 3 }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const files = Array.from(e.target.files);
    
    if (uploadedUrls.length + files.length > maxFiles) {
      alert(`You can only upload up to ${maxFiles} images.`);
      return;
    }

    setIsUploading(true);
    const newUrls: string[] = [];

    for (const file of files) {
      // Mock upload by reading as Data URL
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      newUrls.push(dataUrl);
    }

    const finalUrls = [...uploadedUrls, ...newUrls];
    setUploadedUrls(finalUrls);
    setPreviews([...previews, ...newUrls]);
    onUploadSuccess(finalUrls);
    setIsUploading(false);
  };

  const removeImage = (indexToRemove: number) => {
    const updatedUrls = uploadedUrls.filter((_, idx) => idx !== indexToRemove);
    const updatedPreviews = previews.filter((_, idx) => idx !== indexToRemove);
    
    setUploadedUrls(updatedUrls);
    setPreviews(updatedPreviews);
    onUploadSuccess(updatedUrls);
  };

  return (
    <div className="space-y-3">
      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {previews.map((preview, index) => (
            <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-[var(--color-surface-container)]">
              <Image src={preview} alt="Preview" fill className="object-cover" />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                aria-label="Remove image"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {previews.length < maxFiles && (
        <div>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileSelect}
            disabled={isUploading}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className={cn(
              "flex items-center justify-center gap-2 w-full p-3 rounded-xl border border-dashed",
              "transition-colors text-sm font-medium",
              "border-[var(--color-outline-variant)] text-[var(--color-primary)] bg-[var(--color-primary-container)] bg-opacity-20",
              "hover:bg-[var(--color-primary-container)] hover:bg-opacity-30",
              isUploading && "opacity-50 cursor-not-allowed"
            )}
          >
            {isUploading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <ImagePlus size={18} />
            )}
            {isUploading ? "Processing..." : "Add Images"}
          </button>
        </div>
      )}
    </div>
  );
}
