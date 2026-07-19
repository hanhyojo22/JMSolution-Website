# Company Activities Homepage Section

## Problem

`team-building.html` ("Our First Team Building 2026") exists but is only
linked from the footer's Quick Links on every page. It has no visibility
on the homepage itself.

## Scope

- `static-site/index.html` — new section only. No other files touched.

## Design

New `<!-- COMPANY ACTIVITIES -->` section inserted between the
Testimonials section and the CTA Banner section (index.html, currently
around line 365).

Structure mirrors the existing centered eyebrow + heading pattern used by
Testimonials/Recent Projects, followed by a single horizontal feature
card (not a carousel — only one activity page exists today):

- Eyebrow: "Life at JMSolutions"
- Heading: "Company Activities"
- Card links to `team-building`, reuses `assets/team-building/group-banner-photo.webp`
  (same image already used as that page's OG image) with its existing
  alt text
- Card copy: "Team Building 2026" overline, "Our First Team Building —
  In the Books" title, one-line teaser, "See the Highlights →" link
- Reuses existing classes only: `jm-eyebrow`, `type-section-title`,
  `jm-card-hover` (lift + shadow), `jm-reveal` (scroll-in animation) —
  no new CSS or JS.

### Out of scope

- No carousel/multi-card infrastructure (single entry today).
- No changes to `team-building.html` or any other page.

## Testing

No test suite for this static site. Verified by rendering the page and
confirming the section appears, links correctly, and the hover/reveal
animations behave like existing sections using the same classes.
