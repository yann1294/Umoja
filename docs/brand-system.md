# Umoja Brand System

Working direction: **The Connected U**  
Brand line: **African expertise. One trusted force.**  
French line: **L’expertise africaine. Une force unie.**

## 1. Brand idea

Umoja means unity. The identity should express people and organizations joining into a reusable, modular force. It should feel African through confidence, warmth, rhythm, and collective purpose—not through a collage of flags, continent outlines, or generic tribal patterns.

The proposed mark is a geometric **U** assembled from three connected modules. The upward opening signals welcome, growth, and opportunity. The square module hints at the “Lego-like” component model; the rounded paths make the institution human rather than mechanical.

## 2. Logo family

- `umoja-logo.svg`: full-colour horizontal lockup for light backgrounds.
- `umoja-mark.svg`: compact app icon/avatar/social mark.
- `umoja-logo-mono.svg`: one-colour lockup for stamps, legal documents, and constrained production.

### Clear space

Keep clear space equal to the width of one small square module around every side of the mark. Do not place the mark inside another shape unless it is the approved app-icon treatment.

### Minimum size

- Full lockup: 132 px digital / 35 mm print.
- Symbol only: 24 px digital / 8 mm print.

### Do not

- Stretch, rotate, outline, or add shadows to the logo.
- Recolour individual modules outside the approved palette.
- Add a map of Africa behind the symbol.
- Use the accent colours for long body text.
- Present “Corporation,” “Core,” “Extended,” or “AfricIT” as competing master brands.

## 3. Colour palette

### Core colours

| Token | Hex | Role |
|---|---|---|
| Umoja Ink | `#0B1F1A` | Primary text, dark surfaces, monochrome logo |
| Canopy | `#123C2C` | Primary institutional colour, navigation, deep sections |
| Kijani | `#1F8A5B` | Growth, verified states, primary graphic accent |
| Sun Gold | `#F4B942` | Energy, highlights, focus accents |
| Terracotta | `#C85A3D` | Human warmth, editorial accent, selected calls to action |
| Indigo | `#39447A` | Technology, research, data/AI, secondary accent |

### Neutral colours

| Token | Hex | Role |
|---|---|---|
| Warm Canvas | `#FFFCF5` | Default page background |
| Sand | `#F4EDDE` | Section background and quiet cards |
| Mist | `#DDE5DF` | Borders and dividers |
| Slate | `#52635D` | Secondary text |
| White | `#FFFFFF` | Cards and inverse text |

### Semantic colours

| Token | Hex | Meaning |
|---|---|---|
| Success | `#18794E` | Accepted, delivered, verified |
| Warning | `#A15C00` | Risk, needs attention, expiring |
| Danger | `#B42318` | Error, declined, destructive action |
| Info | `#285EA8` | Neutral system guidance |

Never communicate status by colour alone. Pair colour with text and an icon.

### Recommended combinations

- Primary editorial: Umoja Ink on Warm Canvas.
- Hero/institutional: White or Warm Canvas on Canopy.
- Main button: White on Canopy.
- Highlight button on dark surfaces: Umoja Ink on Sun Gold.
- Cards: Umoja Ink on White with Mist borders.
- Terracotta and Indigo are accents; keep them to roughly 10% of a page.

Verified contrast ratios for the primary combinations are 16.73:1 (Ink/Canvas), 12.29:1 (White/Canopy), 9.68:1 (Ink/Gold), and 6.36:1 (Slate/White). White on Kijani (4.33:1) and white on Terracotta (4.21:1) must not be used for normal-sized text; use Ink text or reserve those combinations for non-text graphics and sufficiently large type after testing.

## 4. Typography

### Recommended open-source pair

- **Headings:** Manrope, weights 600–800. Geometric and contemporary without feeling like a generic startup display face.
- **Body/UI:** Noto Sans, weights 400–700. Strong language coverage and highly readable across English and French.
- **Numbers/data:** Noto Sans tabular numerals.

Use system fallbacks and self-host font subsets to reduce layout shift and bandwidth.

### Type scale

| Style | Desktop | Mobile | Weight / line height |
|---|---:|---:|---|
| Display | 72 px | 44 px | 750 / 1.02 |
| H1 | 56 px | 38 px | 750 / 1.08 |
| H2 | 40 px | 30 px | 700 / 1.15 |
| H3 | 28 px | 24 px | 700 / 1.25 |
| Body large | 20 px | 18 px | 450 / 1.6 |
| Body | 16 px | 16 px | 450 / 1.65 |
| Label | 14 px | 14 px | 650 / 1.35 |
| Caption | 13 px | 13 px | 500 / 1.4 |

Do not use all-caps for sentences. Short navigation labels and eyebrow text may use modest letter spacing.

## 5. Shape and layout language

- 8 px spacing unit with 4 px for tight internal alignment.
- Rounded corners: 12 px controls, 20 px cards, 28 px feature panels.
- Mostly flat surfaces; use borders and background contrast before shadows.
- Grid: 12 columns desktop, 6 tablet, 4 mobile; max content width around 1200–1280 px.
- Use modular blocks and connector lines to explain systems, teams, and project flow.
- Avoid decorative complexity behind form fields or dense project views.

## 6. Imagery

Prioritize documentary photography of real African technologists at work: pairing, workshops, field research, whiteboards, labs, client sessions, and community learning. Show multiple regions, languages, genders, ages, and disciplines without tokenism.

Photo treatment:

- Warm natural light and genuine environments.
- Candid collaboration over posed laptop portraits.
- Full colour by default; optional Canopy/Gold duotone for editorial transitions.
- Always obtain releases and accurate captions.
- Do not use anonymous “African tech” stock images when real Umoja work is available.

## 7. Iconography and illustration

- 1.75–2 px rounded strokes at 24 px.
- Simple geometric icons based on nodes, modules, routes, tools, and people.
- Editorial diagrams may use Kijani, Gold, Terracotta, and Indigo modules connected on Sand backgrounds.
- Country flags may identify locale or legal scope, but never serve as decorative wallpaper.

## 8. Voice

Umoja sounds ambitious, grounded, warm, and precise.

### Say

- “Tell us what you need to build. We’ll assemble the right team.”
- “Vetted through evidence, strengthened through real delivery.”
- “One accountable team across product, engineering, and growth.”
- “Built in Africa. Ready for the world.”

### Avoid

- Unverifiable claims such as “Africa’s number one platform.”
- Militaristic or extractive metaphors in client-facing copy.
- “Cheap African talent” or price-first positioning.
- Dense internal lore before explaining user value.
- Promises of continent-wide compliance before legal structures exist.

### Naming architecture

Use **Umoja** as the master brand. Use descriptors, not independent visual identities:

- Umoja Platform (or UFP in operational contexts)
- Umoja Core
- Umoja Extended
- AfricIT by Umoja
- Umoja Partner Organization

## 9. UI tokens

```css
:root {
  --color-ink: #0b1f1a;
  --color-canopy: #123c2c;
  --color-kijani: #1f8a5b;
  --color-gold: #f4b942;
  --color-terracotta: #c85a3d;
  --color-indigo: #39447a;
  --color-canvas: #fffcf5;
  --color-sand: #f4edde;
  --color-mist: #dde5df;
  --color-slate: #52635d;
  --color-white: #ffffff;

  --radius-control: 0.75rem;
  --radius-card: 1.25rem;
  --radius-panel: 1.75rem;
  --shadow-lifted: 0 18px 50px rgb(11 31 26 / 0.10);
  --content-max: 78rem;
}
```

The actual implementation must run automated colour-contrast checks and tune any state combinations that fail WCAG 2.2 AA.

## 10. Brand validation before launch

- Run trademark and domain checks in intended operating markets.
- Review the symbol for unintended cultural or commercial conflicts.
- Test the name, line, and logo with francophone and anglophone users in at least three regions.
- Test at app-icon, social-avatar, mobile-header, proposal, invoice, and one-colour stamp sizes.
- Have a native French editor approve the French brand language.
- Obtain written member and client consent for every public photograph, profile, and case study.

This is an initial design direction, ready for stakeholder review—not a substitute for trademark clearance.
