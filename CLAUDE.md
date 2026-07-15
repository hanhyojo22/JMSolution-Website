# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static marketing website for JM Solution IT Services (Cebu City IT provider). Plain HTML/CSS/JS — no framework, no build step, no package manager, no test suite. All site files live under `static-site/`.

## Running / previewing

There is no dev server or build command. Open any `.html` file directly in a browser, or serve the `static-site/` folder with any static file server, e.g.:

```
npx --yes serve static-site
```

Playwright (`npx playwright ...`) is available in this environment and has been used previously for visual verification (screenshots) of layout changes — useful for checking responsive breakpoints since there's no other automated check.

## Architecture

### No templating — pages are literal duplicates

Each top-level page (`index.html`, `about.html`, `contact.html`, `telco.html`, `structured-cabling.html`, `cctv.html`, `server-solutions.html`, `web-development.html`) is a fully self-contained HTML file. The top bar, header/nav (including the "Services" dropdown and mobile panel), and footer markup are copy-pasted identically into every page.

**Implication:** any change to nav links, contact info, footer content, or header structure must be manually repeated across all 8 HTML files. When making such a change, grep for the snippet across `static-site/*.html` to find every occurrence rather than editing a single file.

The current page in the nav is indicated by inline `color:#2F6FED` (vs `#2A3348`) on the active link/breadcrumb — set manually per file.

### Styling: two-file split, both global

- `static-site/styles.css` — layout, components, and interaction states. Classes are prefixed `jm-` (e.g. `.jm-hero`, `.jm-card-hover`, `.jm-svc-dd`). Also defines `.hv-*` hover utility classes (`.hv-blue`, `.hv-pill`, `.hv-dark`, etc.) that replace inline hover styles, since plain inline `style=""` attributes (used heavily in the markup) can't express `:hover`.
- `static-site/typography.css` — all type styles, prefixed `type-` (e.g. `.type-body`, `.type-section-title`, `.type-nav`). Font is Poppins via `--jm-font-sans`, loaded from Google Fonts in each page's `<head>`.

Most one-off layout (spacing, colors, grid) is written as inline `style=""` attributes directly in the HTML rather than in the stylesheets; the stylesheets hold shared/reusable patterns and anything needing `:hover`, `@media`, or animation. Follow this existing convention rather than moving inline styles into CSS wholesale.

Sticky header height is synced via CSS custom properties (`--jm-topbar-h`, `--jm-header-h`) that `script.js` computes at runtime, since the header's height can change (e.g. top bar wrapping to two lines on narrow viewports).

### `static-site/script.js` — shared behaviors, progressive enhancement

Single shared script included on every page via `<script src="script.js">`. Each behavior is an independent `DOMContentLoaded` listener guarded by an existence check for its target element, so the same file works across pages that only have a subset of the features:

- Topbar/header height → CSS vars (for sticky positioning offsets)
- Header "scrolled" elevated style toggle
- Mobile nav panel toggle (`toggleNav()`, called via inline `onclick`)
- Services dropdown hover (desktop) with a close-delay timer
- Hero image carousel (`index.html` only, via `[data-carousel]`) — autoplay, dot navigation, pauses on hover/focus
- Scroll-reveal (`.jm-reveal` elements) via `IntersectionObserver` — elements are visible by default and only get hidden-then-revealed if JS/IntersectionObserver is actually available, so no-JS and crawler visits still see full content
- Count-up stat animation (`.jm-count[data-target]`) — same no-JS-safe pattern, real final number is in the markup
- `prefers-reduced-motion` is respected throughout (disables carousel autoplay, reveal animation, count-up, SVG SMIL animation)
- `handleContactSubmit()` (`contact.html` only) — purely cosmetic: prevents default submit, swaps the form for a success message. **There is no real backend wired up**; hooking up actual submission (fetch/AJAX or a form backend) is an explicit TODO left in the code.

### Assets

- `static-site/assets/` — hero/about imagery (PNG/WebP), favicon
- `static-site/uploads/` — logo

### SEO — every page carries the same `<head>` block

Each of the 8 pages has a full, unique SEO block in `<head>` (not just a shared template): `<title>`, `<meta name="description">`, `<link rel="canonical">`, Open Graph (`og:type`/`og:site_name`/`og:title`/`og:description`/`og:url`/`og:image`), `<meta name="twitter:card">`, and a `LocalBusiness` JSON-LD `<script type="application/ld+json">` block (name, address, phone, email, areaServed, sameAs). Canonical/OG URLs assume the site will be served from `https://jmsolutionitservices.com/` — update every page if the real domain differs. `static-site/robots.txt` and `static-site/sitemap.xml` list all 8 pages using that same domain.

Decorative images (the inline `data:image/svg+xml` gradient/icon placeholders used throughout — e.g. the Services grid and Recent Projects cards) use `alt=""` on purpose: they're pure decoration next to a heading/label that already states the real content, so screen readers should skip them rather than announce a fake photo description. Only give an image a real descriptive `alt` when it's actual photography/content the alt text would meaningfully describe (see the hero slides and About page photos for examples).

## Custom subagents

This repo (and the user account) registers four custom subagents in `.claude/agents/`: `software-architect`, `code-writer`, `code-reviewer`, `test-writer`. Prefer delegating to them over doing all the work inline when a task is non-trivial:

- **`software-architect`** (read-only) — invoke first for any non-trivial feature/fix to get a concrete plan (files touched, ordered steps, tradeoffs, risks) before writing code. Skip it for genuinely small, obvious changes (e.g. fixing a typo, updating one contact detail).
- **`code-writer`** — invoke to implement a plan (from `software-architect` or a clear direct request). Has full read/write/edit/bash access.
- **`code-reviewer`** (read-only) — invoke after a non-trivial change to get an independent pass for correctness/security/quality issues before considering the work done.
- **`test-writer`** — this project currently has **no test suite and no build step** (see "Running / previewing" above), so this agent has little to do here today. Only invoke it if the project later gains an automated test setup (e.g. Playwright checks committed to the repo); until then, verification means visually checking the page in a browser, not writing test files.

Given this is a small, template-free static site, most single-page tweaks (copy edits, one inline style, an `alt` text fix) don't need the full architect → writer → reviewer pipeline — use judgment and reserve it for changes that touch multiple pages (per the "no templating" architecture note above), restructure markup, or add new behavior to `script.js`.

## Conventions to follow when editing

- Keep new pages consistent with the existing structure: copy the top bar/header/footer block verbatim from an existing page rather than inventing new markup for it.
- Reuse existing `jm-*` and `type-*` classes before adding new ones; check `styles.css`/`typography.css` for a close match first.
- New interactive behavior should follow the same pattern as `script.js`: a guarded `DOMContentLoaded` listener, no-JS-safe default state, and respect for `prefers-reduced-motion`.
- **Keep every change SEO-friendly, by default, without being asked.** When adding or editing a page: give it (or update) a unique, descriptive `<title>` and meta description; add/update its canonical + Open Graph tags and JSON-LD if it's a new page; add real, descriptive `alt` text for real photos and `alt=""` for decorative placeholders (never generic placeholder text like `"Server photo"`); keep heading order sane (one `<h1>` per page, no skipped levels); and add new pages to `static-site/sitemap.xml`. Don't let markup changes silently regress any of this.
