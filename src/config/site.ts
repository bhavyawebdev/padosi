/**
 * site.ts — Application metadata and site-wide constants
 */

export const siteConfig = {
  name: "Aas-Paas",
  tagline: "Your neighbourhood, connected.",
  description:
    "Aas-Paas is a hyperlocal community platform connecting neighbours for help, needs, and local discovery across India.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ogImage: "/brand/og-image.png",

  /** Default location search radius in km */
  defaultRadiusKm: 5,

  /** Maximum location search radius in km */
  maxRadiusKm: 25,

  /** Default post expiry in hours */
  defaultExpiryHours: 24,

  /** App version */
  version: "1.0.0",
} as const;

export type SiteConfig = typeof siteConfig;
