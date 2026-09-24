# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A Shopify theme (Liquid) for **idiom™ fragrances** — a premium, layering-focused fragrance brand. The theme is a heavily customised fork of a commercial Shopify theme ("Prestige"-style). Active work is a homepage/collection/product-page redesign tracked in `phaseplans/`.

## Development commands

```bash
# Start local dev server (preview at http://127.0.0.1:9292)
shopify theme dev --store <store>.myshopify.com

# Push theme to store without starting dev server
shopify theme push

# Take Playwright screenshots for visual QA (Playwright lives at /Users/dhruvparekh/Desktop/BSC)
cd /Users/dhruvparekh/Desktop/BSC
npx playwright screenshot --browser chromium "http://127.0.0.1:9292" screenshots/homepage-desktop.png
npx playwright screenshot --browser chromium --viewport-size "390,844" "http://127.0.0.1:9292" screenshots/homepage-mobile.png
```

There is no build step, linter, or test suite. All changes are applied directly to Liquid/CSS/JS files.

## Repository structure

| Directory | Purpose |
|-----------|---------|
| `layout/` | `theme.liquid` — the root HTML shell; global `<head>`, font preloads, JS/CSS includes |
| `sections/` | One `.liquid` file per page section; each bundles its own `{% schema %}` JSON at the bottom |
| `snippets/` | Reusable Liquid partials (icons, product cards, nav items, etc.) rendered via `{% render %}` |
| `assets/` | Static CSS (`section-*.css`), JS (`theme.js`, `custom.js`), fonts, SVGs |
| `templates/` | Page-type JSON templates (`index.json`, `product.json`, `collection.json`, etc.) that wire sections together |
| `config/` | `settings_schema.json` (theme settings definition) + `settings_data.json` (saved values) |
| `locales/` | Translation strings |
| `phaseplans/` | Implementation plans for the redesign — `prompt.md` (spec) + `status.md` (pending/done/blocked) per folder |

## Architecture patterns

**Section schema settings** are defined in `{% schema %}` at the bottom of each section file and edited via the Shopify Theme Editor. Never hard-code values that should be editable by merchants — always add a schema setting and read it with `section.settings.*`.

**Per-section CSS** lives in `assets/section-<name>.css`, which each section file links via `{{ 'section-<name>.css' | asset_url | stylesheet_tag }}`. The redesign adds a **shared token file** `assets/idiom-theme.css` (global brand CSS variables and reusable component classes) imported in `layout/theme.liquid`.

**Brand CSS tokens** (defined in `assets/idiom-theme.css`):
- `--idiom-cream: #faf6f0`
- `--idiom-olive: #5a5a1e`
- `--idiom-olive-dark: #3d3d1a`
- `--idiom-black: #1a1a1a`

**Shared component classes** (from `idiom-theme.css`):
- `.idiom-marquee-track` — infinite left-scrolling ticker
- `.idiom-product-card` — product card with overflowing bottle image
- `.idiom-tag` — rotated badge pill (top-left of card)
- `.idiom-btn` / `.idiom-btn--outline` — CTA buttons
- `.idiom-section-heading` — heading + subtext pair

**Homepage template** (`templates/index.json`) uses a section-order array. Disabled sections remain in the JSON but are skipped. The current live homepage stacks: hero banner → marquee → tab-collections → banner → newsletter.

## Redesign phase plan

All redesign work is orchestrated by `phaseplans/ORCHESTRATOR.md`. Phases:

| Phase | Sections | Dependency |
|-------|----------|-----------|
| A | `00-shared-css` (creates `idiom-theme.css`) | None — must complete first |
| B | `01` hero, `02` brand-story, `03` product-cards, `04` dual-promo, `05` footer | Phase A |
| C | `06` collection-page | Phase B agent 3 (product card snippet) |
| D | `07` product-hero, `08` layering-row, `09` video-grid | Phase B |

Each plan modifies existing section files rather than creating new ones where possible, and appends to existing `{% schema %}` blocks without removing existing settings.

## Mobile breakpoints (all sections)

- Desktop: `> 768px` — section padding `60px 48px`
- Tablet: `481–768px`
- Mobile: `≤ 480px` — section padding `40px 16px`, all grids collapse to 1 column, buttons full-width min-height 44px

## Key files to know

- `layout/theme.liquid` — add global CSS/JS imports here
- `sections/section-banner-image.liquid` — the primary hero section (used multiple times on homepage via `templates/index.json`)
- `snippets/product-card-inline.liquid` — shared product card partial used across collection and featured-collection sections
- `assets/idiom-theme.css` — brand token file (created by phase 00; does not yet exist if status is pending)
- `config/settings_data.json` — live theme settings; edit carefully, changes affect the live preview immediately
