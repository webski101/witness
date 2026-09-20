# Design

<!-- impeccable:design-schema 1 -->

## World

**Live probe console.** Witness is a signal desk that instruments another agent's endpoint, not a paper courthouse. Deep cool ink, phosphor mint for live/held, vermillion for fail, amber for caution. Sharp geometry, telemetry typography, full-bleed evidence stream.

Anti-reference: warm cream ground, Arial Narrow legal brief, terracotta ink stamps, tilted paper cards, hairline broadsheet rules.

## Color

Strategy: Committed — mint carries live/positive signal on deep ink.

| Token | Role | Value |
| --- | --- | --- |
| `--background` | Desk surface | `oklch(0.17 0.028 250)` |
| `--foreground` | Primary text | `oklch(0.94 0.012 240)` |
| `--card` | Raised panel | `oklch(0.21 0.03 250)` |
| `--muted` | Recessed | `oklch(0.24 0.028 250)` |
| `--muted-foreground` | Secondary | `oklch(0.68 0.03 245)` |
| `--accent` | Live / held | `oklch(0.82 0.15 165)` |
| `--accent-foreground` | On accent | `oklch(0.16 0.03 250)` |
| `--destructive` | Failed | `oklch(0.68 0.19 25)` |
| `--caution` | Caution grade | `oklch(0.84 0.14 85)` |
| `--border` | Hairline console | `oklch(0.45 0.04 250 / 45%)` |
| `--primary` | CTA | mint accent |
| `--ring` | Focus | mint |

Light desk is not used; the operating scene is a dim instrument panel.

## Typography

- Display / UI: **Sora** — geometric, technical, not editorial serif
- Evidence / mono: **JetBrains Mono**
- Tracking tight on large titles; mono for IDs, verdicts, digests

## Layout

- Max content width ~1400px; hero may go full-bleed
- First viewport: brand-scale WITNESS, one claim line, one support line, CTA group, dominant evidence stream (not an inset card)
- Operate surfaces (trial, dockets): console panels with 1px borders, no soft shadows, no rotate

## Components

- Buttons: sharp (`radius: 0`), solid mint primary, outline secondary
- Stamps: rectangular grade chips (mint / vermillion / amber / mute), no faux rubber tilt required
- Cards: flat console panels; cards only for interactive trial containers
- Motion: evidence stream scroll, live process pulse, subtle scanline on hero — respect `prefers-reduced-motion`

## Do / Don't

- Do show the mechanism (execution → verdict → signature)
- Don't use cream paper, purple glow, glassmorphism stacks, or generic three-up icon marketing
- Don't put detached badges over hero media
- Don't invent prices, Arena results, or capabilities
