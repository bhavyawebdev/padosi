/**
 * src/lib/validation/index.ts — Shared Zod validation schemas
 *
 * Used by Server Actions, Route Handlers, and Client forms.
 * Full schemas will be built in Stage 1.
 */
import { z } from "zod";
import {
  POST_TITLE_MIN,
  POST_TITLE_MAX,
  POST_BODY_MAX,
  MIN_PASSWORD_LENGTH,
} from "@/lib/constants";

// ============================================================
// AUTH
// ============================================================

export const emailSchema = z
  .string()
  .email("Please enter a valid email address")
  .toLowerCase()
  .trim();

export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`);

export const signInSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters")
    .max(50, "Display name must be under 50 characters")
    .trim(),
});

// ============================================================
// POSTS
// ============================================================

export const postTitleSchema = z
  .string()
  .min(POST_TITLE_MIN, `Title must be at least ${POST_TITLE_MIN} characters`)
  .max(POST_TITLE_MAX, `Title must be under ${POST_TITLE_MAX} characters`)
  .trim();

export const postBodySchema = z
  .string()
  .max(POST_BODY_MAX, `Content must be under ${POST_BODY_MAX} characters`)
  .trim();

// ============================================================
// LOCATION
// ============================================================

export const localitySchema = z.object({
  neighbourhood: z.string().min(1, "Neighbourhood is required").trim(),
  locality:      z.string().min(1, "Locality is required").trim(),
  city:          z.string().min(1, "City is required").trim(),
  state:         z.string().min(1, "State is required").trim(),
  postalCode:    z.string().optional(),
  societyName:   z.string().optional(),
});

export type SignInInput  = z.infer<typeof signInSchema>;
export type SignUpInput  = z.infer<typeof signUpSchema>;
export type LocalityInput = z.infer<typeof localitySchema>;
