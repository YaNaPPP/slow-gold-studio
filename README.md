# Slow Gold Studio

Landing page for a jewellery studio that makes handcrafted pieces from recycled gold.

## The story, chapter by chapter

| Chapter | What the visitor does and feels | Job on the page |
|---|---|---|
| Hero | Melts an old wedding band, pours it, hammers it; it cools onto a stone ledge | Wow moment, sets the idea: same gold, new shape |
| I The gold | Words heat up as they are read; facts count up | Why recycled gold (World Gold Council figures) |
| II Your gold | Scroll melts a ring, a broken chain and an earring into one hammered band (WebGL) | The remake service, emotional core, first call to action |
| III The making | Sideways walk through four weeks: sketch, melt, forge, Gold Passport | Proof of craft, removes doubt about the process |
| IV Pieces | The page steps into daylight; four starting points with craft prices | Products and clear pricing logic |
| V Begin | Four-step builder with a live "Your piece" summary, then FAQ | Conversion, risk reversal |

## Tech

- Plain HTML, CSS and JavaScript, no build step
- Self-hosted libraries in `vendor/`: three.js r147, GSAP 3.13 (ScrollTrigger, SplitText), Lenis 1.1
- `js/hero.js` the interactive hero (pauses when off screen)
- `js/melt.js` the chapter II shader (signed distance fields, redraws only when needed)
- `js/site.js` smooth scroll, chapter bar, chapter animations, order builder
- Respects `prefers-reduced-motion`

## Order form

Requests open the visitor's email app with the request written out. To receive them directly, set `FORM_ENDPOINT` in `js/site.js` to a form service URL (for example Formspree).

## Images

Photos come from the Figma moodboard. Replace them with licensed or own photography before a real launch.

## Run locally

```
npx serve .
```

Every push to `main` deploys to Vercel.
