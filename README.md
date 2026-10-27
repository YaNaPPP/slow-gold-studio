# Slow Gold Studio

Hero screen for a jewellery brand that makes handcrafted pieces from recycled gold.

The visitor makes the ring: hold to melt an old wedding band, hold again to pour it into a new band, click to hammer it (every click leaves a real dent), and it cools onto a stone ledge as the hero. The headline is then cast in molten gold, and the cursor relights the dents the visitor made.

- Plain HTML, CSS and JavaScript, no build step
- Real-time 3D with three.js (r147), animation with GSAP 3.12
- Sound is synthesised in the browser (Web Audio); mute with the button or the M key
- Typography from the Figma frame: Bodoni 72 Smallcaps, Ballet, Helvetica

## Run locally

Open `index.html` through any static server, for example:

```
npx serve .
```

## Deploy

Every push to `main` deploys to Vercel automatically.
