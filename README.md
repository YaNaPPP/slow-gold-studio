# Slow Gold Studio

Landing page for a jewellery studio that makes handcrafted pieces from recycled gold.

## The story, chapter by chapter

| Chapter | What the visitor does and feels | Job on the page |
|---|---|---|
| Hero | Melts an old wedding band, pours it, hammers it; it cools onto a stone ledge | Wow moment, sets the idea: same gold, new shape |
| I The gold | A slow surface of liquid gold (WebGL) that ripples under the cursor; the world's gold stock counts up and splits by use | Why recycled gold (World Gold Council figures) |
| II Your gold | Scroll melts a ring, a broken chain and an earring into one pool of gold, which resolves into the finished band (WebGL, then a studio render) | The remake service, emotional core, first call to action |
| III The making | Sideways walk through four weeks: sketch, melt, forge, Gold Passport | Proof of craft, removes doubt about the process |
| IV Pieces | The page steps into daylight; four pieces shot the same way, with craft prices | Products and clear pricing logic |
| V Begin | Four-step builder with a live "Your piece" summary, then FAQ | Conversion, risk reversal |

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

Product images of The Keeper, The Gathering, The Heirloom and the final ring are 3D renders made for this site. The other photos come from the Figma moodboard. Replace those with licensed or own photography before a real launch. Prices are placeholders.

## Run locally

```
npx serve .
```

Every push to `main` deploys to Vercel.
