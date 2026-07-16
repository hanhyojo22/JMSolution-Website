# Contact Page — Trust Strip, Process Steps, FAQ

## Problem

`contact.html` is just a hero + a two-column info/form grid — short and static
compared to other pages, with no social proof, no sense of what happens after
a visitor submits the form, and no answers to common pre-contact questions.

## Scope

- `static-site/contact.html` only. No shared CSS/JS changes needed — every
  new section reuses existing classes (`jm-reveal`, `jm-count`, `jm-eyebrow`,
  `type-*`) already defined in `styles.css`/`typography.css`/`script.js`.

## Design

Three new sections, in this order: Hero → **Trust strip** → Contact grid
(existing) → **Process steps** → **FAQ** → Footer (existing).

### 1. Trust strip

Light band directly under the hero. Three `.jm-count` stats (same animated
count-up already used on the homepage "Why Us" section — no new JS):
"8+ Years of Experience", "100+ Projects Delivered", "24/7 Support
Availability". Centered, single row on desktop, wraps on mobile via the
existing `repeat(auto-fit,minmax(...))` pattern.

### 2. Process steps ("What happens after you submit")

Centered eyebrow + heading, then a 3-column grid (reuses the
`jm-fact-card`-style icon-in-rounded-square treatment already used on
case-study pages) — numbered rather than icon-only, since these three
things happen in a real, fixed order:

1. **Send your message** — fill out the form or call/email directly.
2. **We review within 1 business day** — matches the existing hero copy's
   promise.
3. **We schedule a free site visit or call** — sets expectation for the
   next real-world step.

### 3. FAQ

Centered eyebrow + heading, then 5 `<details>/<summary>` elements (native,
no JS, keyboard-accessible by default) styled as bordered cards with a
chevron that rotates via `details[open] svg{transform:rotate(180deg)}`:

- How fast do you respond to inquiries? → "within one business day" (matches
  existing hero copy)
- Do you serve areas outside Lapu-Lapu City and Cebu? → yes, across Cebu
  province depending on project scope (consistent with the real Turtle
  Point/Catmon case study already on the site)
- Is the initial consultation really free? → yes, no obligation
- Do you offer emergency/same-day support? → yes, references the existing
  "24/7 Support" claim already used sitewide
- What happens during a site visit? → assess space, confirm scope, provide
  accurate quote before work begins

### Out of scope

- No testimonials section (not selected).
- No new shared CSS classes or script.js changes — everything reuses
  existing patterns.
- No changes to the form itself or its Turnstile/submit handling.

## Testing

No test suite for this static site. Verified by rendering the page and
confirming: count-up animates on scroll, `jm-reveal` fade-ins work, FAQ
items expand/collapse via both click and keyboard, and the page still
reads correctly with JavaScript disabled (stats show final numbers, FAQ
still expands via native `<details>` with no JS at all).
