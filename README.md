# Slow Gold Studio

Landing page for a jewellery studio that makes handcrafted pieces from recycled gold.

## The story, chapter by chapter

| Chapter | What the visitor does and feels | Job on the page |
|---|---|---|
| Hero | Melts an old wedding band, pours it, hammers it; it cools onto a stone ledge | Wow moment, sets the idea: same gold, new shape |
| I Why recycled | An open drawer of forgotten family gold, lit by a torch the visitor moves; three plain facts | Why recycled gold (World Gold Council figures) |
| II Your gold | The same three pieces are weighed in a ledger, heat up, melt into one pool (WebGL) and resolve into the finished band | The remake service, emotional core, first call to action |
| III The making | Four weeks at one bench as printed plates: sketch, weighing, pour, forging, engraving | Proof of craft, removes doubt about the process |
| IV Pieces and prices | Morning comes in: four sculptural pieces (The Keeper, The Promise, The Heirloom, The Drop) worn or on travertine, with labels and craft prices | Products and clear pricing logic |
| V Begin | Four-step builder that fills in a draft Gold Passport, stamped on sending; four open questions | Conversion, risk reversal |

## Design system

- Text: Host Grotesk (light weights, tight tracking for headlines)
- Serif: ITC Bodoni Seventytwo (Monotype), licensed for web through an Adobe Fonts web project (kit `oxj7wkk`). Used for the hero headline and, in capitals only, on brand objects: wordmark, piece names, Gold Passport. Bodoni Moda is the self-hosted fallback
- Script: Ballet, hero only, as in the Figma file
- Host Grotesk and Ballet are self-hosted in `assets/fonts/` and preloaded; a short loader holds the page until fonts and the hero scene are ready

## Composition system

Taken from the hero, where small captions sit at the corners and the centre of a line, joined by hairline rules.

- Every chapter is framed by `.frame` rows: left caption, rule, centre caption, rule, right caption. Full-screen chapters (01, 02) carry one at the top and one at the bottom edge, like the hero; long chapters open with a folio frame (03, 04, 05); plates and pieces close with a two-part caption frame; the footer ends on one.
- Three alignment lines only: the left page margin, the centre axis and the right page margin.
- Left caption orients (chapter number and name, week, piece name); right caption measures (grams, temperature, price); the centre carries the action or the state.
- Headlines sit on the line above the bottom frame or below the top frame, never floating.
- Captions use the hero's UI type (Helvetica Neue stack, small size, tight tracking), not uppercase labels.
- On phones the centre slot drops out and the frame keeps its two corners.

## Tech

- Plain HTML, CSS and JavaScript, no build step
- Self-hosted libraries in `vendor/`: three.js r147, GSAP 3.13 (ScrollTrigger, SplitText), Lenis 1.1
- `js/hero.js` the interactive hero (pauses when off screen)
- `js/liquid.js` the chapter I liquid gold shader (half resolution, draws only while visible)
- `js/melt.js` the chapter II shader (signed distance fields, redraws only when needed)
- `js/site.js` smooth scroll, chapter bar, chapter animations, order builder
- Respects `prefers-reduced-motion`

## Order form

Requests open the visitor's email app with the request written out. To receive them directly, set `FORM_ENDPOINT` in `js/site.js` to a form service URL (for example Formspree).

## Images

- The drawer, the bench and the collection are AI-generated photographs made in ChatGPT from one prompt set (style bible + one prompt per shot): night scenes under one warm lamp from the upper right, morning scenes in window light from the left. They are graded to one look (lifted blacks, fine grain) and exported as WebP with a small version for phones.
- 3D stays where it does something photography cannot: the interactive hero and the melt in chapter 02 (three.js and a WebGL shader), plus the three heirloom cut-outs that hand over to the melt.
- New images get new file names: `/assets` is cached as immutable, so an overwritten file would keep showing the old version.
- Prices are placeholders.

## Run locally

```
npx serve .
```

Every push to `main` deploys to Vercel.
