---
name: frontend-slides
description: Create stunning, animation-rich HTML presentations from scratch or by converting PowerPoint files. Use when the user wants to build a presentation, convert a PPT/PPTX to web, or create slides for a talk/pitch. Helps non-designers discover their aesthetic through visual exploration rather than abstract choices.
origin: ECC
---

# Frontend Slides

Create zero-dependency, animation-rich HTML presentations that run entirely in the browser.

Inspired by the visual exploration approach showcased in work by zarazhangrui (credit: @zarazhangrui).

## When to Activate

- Creating a talk deck, pitch deck, workshop deck, or internal presentation
- Converting `.ppt` or `.pptx` slides into an HTML presentation
- Improving an existing HTML presentation's layout, motion, or typography
- Exploring presentation styles with a user who does not know their design preference yet

## Non-Negotiables

1. **Zero dependencies**: default to one self-contained HTML file with inline CSS and JS.
2. **Viewport fit is mandatory**: every slide must fit inside one viewport with no internal scrolling.
3. **Show, don't tell**: use visual previews instead of abstract style questionnaires.
4. **Distinctive design**: avoid generic purple-gradient, Inter-on-white, template-looking decks.
5. **Production quality**: keep code commented, accessible, responsive, and performant.

Before generating, read `STYLE_PRESETS.md` for the viewport-safe CSS base, density limits, preset catalog, and CSS gotchas.

## Workflow

### 1. Detect Mode

Choose one path:
- **New presentation**: user has a topic, notes, or full draft
- **PPT conversion**: user has `.ppt` or `.pptx`
- **Enhancement**: user already has HTML slides and wants improvements

### 2. Discover Content

Ask only the minimum needed:
- purpose: pitch, teaching, conference talk, internal update
- length: short (5-10), medium (10-20), long (20+)
- content state: finished copy, rough notes, topic only

If the user has content, ask them to paste it before styling.

### 3. Discover Style

Default to visual exploration.

If the user already knows the desired preset, skip previews and use it directly.

Otherwise:
1. Ask what feeling the deck should create: impressed, energized, focused, inspired.
2. Generate **3 single-slide preview files** in `.ecc-design/slide-previews/`.
3. Each preview must be self-contained, show typography/color/motion clearly, and stay under roughly 100 lines of slide content.
4. Ask the user which preview to keep or what elements to mix.

Use the preset guide in `STYLE_PRESETS.md` when mapping mood to style.

### 4. Build the Presentation

Output either:
- `presentation.html`
- `[presentation-name].html`

Use an `assets/` folder only when the deck contains extracted or user-supplied images.

Required structure:
- semantic slide sections
- a viewport-safe CSS base from `STYLE_PRESETS.md`
- CSS custom properties for theme values
- a presentation controller class for keyboard, wheel, and touch navigation
- Intersection Observer for reveal animations
- reduced-motion support

### 5. Enforce Viewport Fit

Treat this as a hard gate.

Rules:
- every `.slide` must use `height: 100vh; height: 100dvh; overflow: hidden;`
- all type and spacing must scale with `clamp()`
- when content does not fit, split into multiple slides
- never solve overflow by shrinking text below readable sizes
- never allow scrollbars inside a slide

Use the density limits and mandatory CSS block in `STYLE_PRESETS.md`.

### 6. Validate

Check the finished deck at these sizes:
- 1920x1080
- 1280x720
- 768x1024
- 375x667
- 667x375

If browser automation is available, use it to verify no slide overflows and that keyboard navigation works.

### 7. Deliver

At handoff:
- delete temporary preview files unless the user wants to keep them
- open the deck with the platform-appropriate opener when useful
- summarize file path, preset used, slide count, and easy theme customization points

Use the correct opener for the current OS:
- macOS: `open file.html`
- Linux: `xdg-open file.html`
- Windows: `start "" file.html`

## PPT / PPTX Conversion

For PowerPoint conversion:
1. Prefer `python3` with `python-pptx` to extract text, images, and notes.
2. If `python-pptx` is unavailable, ask whether to install it or fall back to a manual/export-based workflow.
3. Preserve slide order, speaker notes, and extracted assets.
4. After extraction, run the same style-selection workflow as a new presentation.

Keep conversion cross-platform. Do not rely on macOS-only tools when Python can do the job.

## Implementation Requirements

### HTML / CSS

- Use inline CSS and JS unless the user explicitly wants a multi-file project.
- Fonts may come from Google Fonts or Fontshare.
- Prefer atmospheric backgrounds, strong type hierarchy, and a clear visual direction.
- Use abstract shapes, gradients, grids, noise, and geometry rather than illustrations.

### JavaScript

Include:
- keyboard navigation
- touch / swipe navigation
- mouse wheel navigation
- progress indicator or slide index
- reveal-on-enter animation triggers

### Accessibility

- use semantic structure (`main`, `section`, `nav`)
- keep contrast readable
- support keyboard-only navigation
- respect `prefers-reduced-motion`

## Content Density Limits

Use these maxima unless the user explicitly asks for denser slides and readability still holds:

| Slide type | Limit |
|------------|-------|
| Title | 1 heading + 1 subtitle + optional tagline |
| Content | 1 heading + 4-6 bullets or 2 short paragraphs |
| Feature grid | 6 cards max |
| Code | 8-10 lines max |
| Quote | 1 quote + attribution |
| Image | 1 image constrained by viewport |

## Anti-Patterns

- generic startup gradients with no visual identity
- system-font decks unless intentionally editorial
- long bullet walls
- code blocks that need scrolling
- fixed-height content boxes that break on short screens
- invalid negated CSS functions like `-clamp(...)`

## Related ECC Skills

- `frontend-patterns` for component and interaction patterns around the deck
- `liquid-glass-design` when a presentation intentionally borrows Apple glass aesthetics
- `e2e-testing` if you need automated browser verification for the final deck

## Deliverable Checklist

- presentation runs from a local file in a browser
- every slide fits the viewport without scrolling
- style is distinctive and intentional
- animation is meaningful, not noisy
- reduced motion is respected
- file paths and customization points are explained at handoff


---

# Style Presets Reference

Curated visual styles for `frontend-slides`.

Use this file for:
- the mandatory viewport-fitting CSS base
- preset selection and mood mapping
- CSS gotchas and validation rules

Abstract shapes only. Avoid illustrations unless the user explicitly asks for them.

## Viewport Fit Is Non-Negotiable

Every slide must fully fit in one viewport.

### Golden Rule

```text
Each slide = exactly one viewport height.
Too much content = split into more slides.
Never scroll inside a slide.
```

### Density Limits

| Slide Type | Maximum Content |
|------------|-----------------|
| Title slide | 1 heading + 1 subtitle + optional tagline |
| Content slide | 1 heading + 4-6 bullets or 2 paragraphs |
| Feature grid | 6 cards maximum |
| Code slide | 8-10 lines maximum |
| Quote slide | 1 quote + attribution |
| Image slide | 1 image, ideally under 60vh |

## Mandatory Base CSS

Copy this block into every generated presentation and then theme on top of it.

```css
/* ===========================================
   VIEWPORT FITTING: MANDATORY BASE STYLES
   =========================================== */

html, body {
    height: 100%;
    overflow-x: hidden;
}

html {
    scroll-snap-type: y mandatory;
    scroll-behavior: smooth;
}

.slide {
    width: 100vw;
    height: 100vh;
    height: 100dvh;
    overflow: hidden;
    scroll-snap-align: start;
    display: flex;
    flex-direction: column;
    position: relative;
}

.slide-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    max-height: 100%;
    overflow: hidden;
    padding: var(--slide-padding);
}

:root {
    --title-size: clamp(1.5rem, 5vw, 4rem);
    --h2-size: clamp(1.25rem, 3.5vw, 2.5rem);
    --h3-size: clamp(1rem, 2.5vw, 1.75rem);
    --body-size: clamp(0.75rem, 1.5vw, 1.125rem);
    --small-size: clamp(0.65rem, 1vw, 0.875rem);

    --slide-padding: clamp(1rem, 4vw, 4rem);
    --content-gap: clamp(0.5rem, 2vw, 2rem);
    --element-gap: clamp(0.25rem, 1vw, 1rem);
}

.card, .container, .content-box {
    max-width: min(90vw, 1000px);
    max-height: min(80vh, 700px);
}

.feature-list, .bullet-list {
    gap: clamp(0.4rem, 1vh, 1rem);
}

.feature-list li, .bullet-list li {
    font-size: var(--body-size);
    line-height: 1.4;
}

.grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 250px), 1fr));
    gap: clamp(0.5rem, 1.5vw, 1rem);
}

img, .image-container {
    max-width: 100%;
    max-height: min(50vh, 400px);
    object-fit: contain;
}

@media (max-height: 700px) {
    :root {
        --slide-padding: clamp(0.75rem, 3vw, 2rem);
        --content-gap: clamp(0.4rem, 1.5vw, 1rem);
        --title-size: clamp(1.25rem, 4.5vw, 2.5rem);
        --h2-size: clamp(1rem, 3vw, 1.75rem);
    }
}

@media (max-height: 600px) {
    :root {
        --slide-padding: clamp(0.5rem, 2.5vw, 1.5rem);
        --content-gap: clamp(0.3rem, 1vw, 0.75rem);
        --title-size: clamp(1.1rem, 4vw, 2rem);
        --body-size: clamp(0.7rem, 1.2vw, 0.95rem);
    }

    .nav-dots, .keyboard-hint, .decorative {
        display: none;
    }
}

@media (max-height: 500px) {
    :root {
        --slide-padding: clamp(0.4rem, 2vw, 1rem);
        --title-size: clamp(1rem, 3.5vw, 1.5rem);
        --h2-size: clamp(0.9rem, 2.5vw, 1.25rem);
        --body-size: clamp(0.65rem, 1vw, 0.85rem);
    }
}

@media (max-width: 600px) {
    :root {
        --title-size: clamp(1.25rem, 7vw, 2.5rem);
    }

    .grid {
        grid-template-columns: 1fr;
    }
}

@media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
        animation-duration: 0.01ms !important;
        transition-duration: 0.2s !important;
    }

    html {
        scroll-behavior: auto;
    }
}
```

## Viewport Checklist

- every `.slide` has `height: 100vh`, `height: 100dvh`, and `overflow: hidden`
- all typography uses `clamp()`
- all spacing uses `clamp()` or viewport units
- images have `max-height` constraints
- grids adapt with `auto-fit` + `minmax()`
- short-height breakpoints exist at `700px`, `600px`, and `500px`
- if anything feels cramped, split the slide

## Mood to Preset Mapping

| Mood | Good Presets |
|------|--------------|
| Impressed / Confident | Bold Signal, Electric Studio, Dark Botanical |
| Excited / Energized | Creative Voltage, Neon Cyber, Split Pastel |
| Calm / Focused | Notebook Tabs, Paper & Ink, Swiss Modern |
| Inspired / Moved | Dark Botanical, Vintage Editorial, Pastel Geometry |

## Preset Catalog

### 1. Bold Signal

- Vibe: confident, high-impact, keynote-ready
- Best for: pitch decks, launches, statements
- Fonts: Archivo Black + Space Grotesk
- Palette: charcoal base, hot orange focal card, crisp white text
- Signature: oversized section numbers, high-contrast card on dark field

### 2. Electric Studio

- Vibe: clean, bold, agency-polished
- Best for: client presentations, strategic reviews
- Fonts: Manrope only
- Palette: black, white, saturated cobalt accent
- Signature: two-panel split and sharp editorial alignment

### 3. Creative Voltage

- Vibe: energetic, retro-modern, playful confidence
- Best for: creative studios, brand work, product storytelling
- Fonts: Syne + Space Mono
- Palette: electric blue, neon yellow, deep navy
- Signature: halftone textures, badges, punchy contrast

### 4. Dark Botanical

- Vibe: elegant, premium, atmospheric
- Best for: luxury brands, thoughtful narratives, premium product decks
- Fonts: Cormorant + IBM Plex Sans
- Palette: near-black, warm ivory, blush, gold, terracotta
- Signature: blurred abstract circles, fine rules, restrained motion

### 5. Notebook Tabs

- Vibe: editorial, organized, tactile
- Best for: reports, reviews, structured storytelling
- Fonts: Bodoni Moda + DM Sans
- Palette: cream paper on charcoal with pastel tabs
- Signature: paper sheet, colored side tabs, binder details

### 6. Pastel Geometry

- Vibe: approachable, modern, friendly
- Best for: product overviews, onboarding, lighter brand decks
- Fonts: Plus Jakarta Sans only
- Palette: pale blue field, cream card, soft pink/mint/lavender accents
- Signature: vertical pills, rounded cards, soft shadows

### 7. Split Pastel

- Vibe: playful, modern, creative
- Best for: agency intros, workshops, portfolios
- Fonts: Outfit only
- Palette: peach + lavender split with mint badges
- Signature: split backdrop, rounded tags, light grid overlays

### 8. Vintage Editorial

- Vibe: witty, personality-driven, magazine-inspired
- Best for: personal brands, opinionated talks, storytelling
- Fonts: Fraunces + Work Sans
- Palette: cream, charcoal, dusty warm accents
- Signature: geometric accents, bordered callouts, punchy serif headlines

### 9. Neon Cyber

- Vibe: futuristic, techy, kinetic
- Best for: AI, infra, dev tools, future-of-X talks
- Fonts: Clash Display + Satoshi
- Palette: midnight navy, cyan, magenta
- Signature: glow, particles, grids, data-radar energy

### 10. Terminal Green

- Vibe: developer-focused, hacker-clean
- Best for: APIs, CLI tools, engineering demos
- Fonts: JetBrains Mono only
- Palette: GitHub dark + terminal green
- Signature: scan lines, command-line framing, precise monospace rhythm

### 11. Swiss Modern

- Vibe: minimal, precise, data-forward
- Best for: corporate, product strategy, analytics
- Fonts: Archivo + Nunito
- Palette: white, black, signal red
- Signature: visible grids, asymmetry, geometric discipline

### 12. Paper & Ink

- Vibe: literary, thoughtful, story-driven
- Best for: essays, keynote narratives, manifesto decks
- Fonts: Cormorant Garamond + Source Serif 4
- Palette: warm cream, charcoal, crimson accent
- Signature: pull quotes, drop caps, elegant rules

## Direct Selection Prompts

If the user already knows the style they want, let them pick directly from the preset names above instead of forcing preview generation.

## Animation Feel Mapping

| Feeling | Motion Direction |
|---------|------------------|
| Dramatic / Cinematic | slow fades, parallax, large scale-ins |
| Techy / Futuristic | glow, particles, grid motion, scramble text |
| Playful / Friendly | springy easing, rounded shapes, floating motion |
| Professional / Corporate | subtle 200-300ms transitions, clean slides |
| Calm / Minimal | very restrained movement, whitespace-first |
| Editorial / Magazine | strong hierarchy, staggered text and image interplay |

## CSS Gotcha: Negating Functions

Never write these:

```css
right: -clamp(28px, 3.5vw, 44px);
margin-left: -min(10vw, 100px);
```

Browsers ignore them silently.

Always write this instead:

```css
right: calc(-1 * clamp(28px, 3.5vw, 44px));
margin-left: calc(-1 * min(10vw, 100px));
```

## Validation Sizes

Test at minimum:
- Desktop: `1920x1080`, `1440x900`, `1280x720`
- Tablet: `1024x768`, `768x1024`
- Mobile: `375x667`, `414x896`
- Landscape phone: `667x375`, `896x414`

## Anti-Patterns

Do not use:
- purple-on-white startup templates
- Inter / Roboto / Arial as the visual voice unless the user explicitly wants utilitarian neutrality
- bullet walls, tiny type, or code blocks that require scrolling
- decorative illustrations when abstract geometry would do the job better
