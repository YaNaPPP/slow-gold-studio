# Slow Gold Studio

Landing page for a jewellery studio that makes handcrafted pieces from recycled gold.

## The story, chapter by chapter

| Chapter | What the visitor does and feels | Job on the page |
|---|---|---|
| Hero | Melts an old wedding band, pours it, hammers it; it cools onto a stone ledge | Wow moment, sets the idea: same gold, new shape |
| I Why recycled | An open drawer of forgotten family gold, lit by a torch the visitor moves; three plain facts | Why recycled gold (World Gold Council figures) |
| II Your gold | The same three pieces are weighed in a ledger, heat up, melt into one pool (WebGL) and resolve into the finished band | The remake service, emotional core, first call to action |
| III The making | Four weeks at one bench as printed plates: sketch, scale, crucible, mandrel, Gold Passport | Proof of craft, removes doubt about the process |
| IV Pieces and prices | Morning comes in: four pieces in window light on travertine, with museum labels and craft prices | Products and clear pricing logic |
| V Begin | Four-step builder that fills in a draft Gold Passport, stamped on sending; four open questions | Conversion, risk reversal |

## Design system

- Text: Host Grotesk (light weights, tight tracking for headlines)
- Serif: ITC Bodoni Seventytwo (Monotype), licensed for web through an Adobe Fonts web project (kit `oxj7wkk`). Used for the hero headline and, in capitals only, on brand objects: wordmark, piece names, Gold Passport. Bodoni Moda is the self-hosted fallback
- Script: Ballet, hero only, as in the Figma file
- Host Grotesk and Ballet are self-hosted in `assets/fonts/` and preloaded; a short loader holds the page until fonts and the hero scene are ready

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

Every image after the hero is a 3D render made for this site with three.js (one night light for the drawer and the bench, one morning window light for the pieces), so there is nothing to license. Hands and pieces worn on skin would need licensed photography. Prices are placeholders.

## Run locally

```
npx serve .
```

Every push to `main` deploys to Vercel.
