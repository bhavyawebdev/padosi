---
name: LocalPulse
colors:
  surface: '#fcf9f4'
  surface-dim: '#dcdad5'
  surface-bright: '#fcf9f4'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3ee'
  surface-container: '#f0ede9'
  surface-container-high: '#ebe8e3'
  surface-container-highest: '#e5e2dd'
  on-surface: '#1c1c19'
  on-surface-variant: '#424842'
  inverse-surface: '#31302d'
  inverse-on-surface: '#f3f0eb'
  outline: '#727971'
  outline-variant: '#c2c8bf'
  surface-tint: '#44664b'
  primary: '#416448'
  on-primary: '#ffffff'
  primary-container: '#597d60'
  on-primary-container: '#f6fff3'
  inverse-primary: '#aad0ae'
  secondary: '#8b4e35'
  on-secondary: '#ffffff'
  secondary-container: '#fdae8f'
  on-secondary-container: '#783f28'
  tertiary: '#5f5b56'
  on-tertiary: '#ffffff'
  tertiary-container: '#78746f'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c5ecc9'
  primary-fixed-dim: '#aad0ae'
  on-primary-fixed: '#00210c'
  on-primary-fixed-variant: '#2c4e34'
  secondary-fixed: '#ffdbce'
  secondary-fixed-dim: '#ffb599'
  on-secondary-fixed: '#370e00'
  on-secondary-fixed-variant: '#6e3820'
  tertiary-fixed: '#e8e1db'
  tertiary-fixed-dim: '#ccc5bf'
  on-tertiary-fixed: '#1e1b17'
  on-tertiary-fixed-variant: '#4a4642'
  background: '#fcf9f4'
  on-background: '#1c1c19'
  surface-variant: '#e5e2dd'
typography:
  headline-xl:
    fontFamily: Be Vietnam Pro
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Be Vietnam Pro
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 34px
  headline-md:
    fontFamily: Be Vietnam Pro
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 12px
  md: 20px
  lg: 32px
  xl: 48px
  gutter: 20px
  margin-mobile: 16px
  margin-desktop: 64px
---

## Brand & Style

This design system is built on the philosophy of "Digital Tactility." It rejects the sterile, high-contrast nature of traditional tech interfaces in favor of a warm, humanistic aesthetic that feels more like a physical community bulletin board or a high-quality lifestyle magazine. 

The design style is a blend of **Soft Minimalism** and **Tactile/Skeuomorphic** influences. It emphasizes neighborly trust, local groundedness, and a calm, unhurried user experience. There are no pure blacks or whites; every surface is infused with warmth to reduce eye strain and evoke a sense of organic connection. The emotional response should be one of comfort, reliability, and approachability.

## Colors

The palette is strictly anchored in earthy, desaturated tones. 
- **Primary (Sage Green):** Used for "Verified" badges, trust signals, and primary actions. It represents growth and community stability.
- **Secondary (Terracotta):** Reserved for high-urgency items, "Needed Now" requests, or time-sensitive events. Its warmth draws attention without the aggression of a standard red.
- **Backgrounds:** The primary app background is a warm cream (#F8F5F0). UI surfaces like cards and containers use a slightly darker paper tone (#F1EDE6) to create depth without relying on heavy shadows.
- **Typography:** Deep warm charcoal (#2E2B27) provides sufficient legibility while maintaining a soft, printed-matter feel.

## Typography

The typography strategy pairs **Be Vietnam Pro** for headings with **Manrope** for body and interface elements. 

- **Headlines:** Use Be Vietnam Pro to convey a friendly, contemporary, and open personality. Keep tracking tight on larger sizes to maintain a sturdy, "block-print" feel.
- **Body & Labels:** Manrope is chosen for its exceptional readability and modern, refined proportions. It feels professional yet approachable. 
- **Hierarchy:** Use the medium warm gray (#5C5852) for secondary body text to ensure the UI feels soft and layered.

## Layout & Spacing

The layout follows a fluid-to-fixed model. On mobile, we use a 4-column grid with 16px margins. On desktop, we transition to a 12-column grid capped at 1200px to maintain the "editorial" feel.

Spacing is generous. We use a 4px baseline, but lean heavily on `md` (20px) and `lg` (32px) increments to create a sense of breathing room and calm. Avoid cramped layouts; the goal is to make the user feel unhurried. Elements should feel like they are "resting" on the paper-tone background.

## Elevation & Depth

This design system avoids high-offset, synthetic shadows. Depth is communicated through:
- **Tonal Layering:** Objects are distinguished primarily by the shift from the background cream to the card surface paper tone.
- **Paper Shadows:** When elevation is required (e.g., for a floating action button or an active card), use extremely diffused shadows. The shadow color should be a darkened version of the background tone (e.g., #DED9D1) rather than a gray or black.
- **Inner Borders:** Use the light warm gray (#E5E0D8) as a subtle 1px border on all cards to define edges without adding visual weight.

## Shapes

The shape language is consistently soft and approachable. 
- **Standard UI Elements:** Buttons, input fields, and small cards use a 14px radius.
- **Large Containers:** Section containers and large modals use a 24px radius to feel like rounded-corner stationary.
- **Strict Rule:** No sharp corners are permitted in the interface. Even icons should utilize rounded caps and joins to match the soft aesthetic.

## Components

- **Buttons:** Primary buttons use the Sage Green background with white text. Secondary buttons should be the Paper Tone surface with a Sage Green border. Interactive states should involve a subtle darkening of the background tone rather than a dramatic color shift.
- **Cards:** Cards should be the primary vehicle for information. They use the #F1EDE6 background and a 1px #E5E0D8 border. In "Urgent" states, the border may transition to a subtle Terracotta.
- **Chips/Tags:** Used for categories or status. They should have a very light tint of their functional color (e.g., a very pale sage for "Open") and use the `label-sm` typography.
- **Input Fields:** These should look "recessed" into the paper. Use a slightly darker background than the card surface and a soft inner shadow or subtle border.
- **Lists:** Use the Divider color (#E5E0D8) for thin, horizontal lines. List items should have generous vertical padding (at least 16px) to maintain the airy, calm atmosphere.
- **Verified Badge:** A key component for this system. It should be a small, soft-round badge using the Sage Green color with a white checkmark icon, signifying community-vetted trust.