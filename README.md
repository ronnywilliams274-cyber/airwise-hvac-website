# Airwise HVAC Solutions: 3D Interactive Website

A mobile-first, 3D interactive marketing site for **Airwise HVAC Solutions LLC**
(installations · retrofits · new construction · paint jobs · maintenance).

- **Phone:** (916) 475-3948
- **Email:** airwisehvacsolutionsllc@gmail.com

---

## 1. Open it (no build step)

| Option | How |
|---|---|
| **Quickest** | Double-click `index.html`. Chrome, Edge, Firefox and Safari all work. |
| **Local server** (recommended) | Double-click `START-LOCAL-SERVER.bat`, which opens http://localhost:8080 (needs Python or Node). Mac/Linux: `python3 -m http.server 8080` |
| **Go live** | Upload the whole folder to any static host: Netlify (drag & drop), Vercel, Cloudflare Pages, GitHub Pages, cPanel, etc. |

An internet connection is needed the first time, because the libraries load from CDNs (jsDelivr / esm.sh / Babylon / A-Frame) and fonts load from Google Fonts.

---

## 2. Photos & videos (Pexels)

The site is wired to your Pexels API key in `assets/js/config.js`:

1. **Right now:** media loads **live from Pexels** when the page opens and is cached in the browser for 72 hours.
2. **Before launch:** double-click **`DOWNLOAD-MEDIA.bat`**. It saves every video and photo into `assets/media/` and writes `assets/media/media-local.js`. The site then serves media from your own files: faster, offline-ready and with no API calls.
   - Mac/Linux alternative: `node tools/download-media.mjs` (Node 18+)
3. **Then** set `pexelsApiKey: ''` in `config.js` so your key isn't published in public source code.

**Choosing different media:** open `assets/js/media-slots.js`. Each slot has a search `query`, and optionally a Pexels `id` (the number at the end of a pexels.com photo or video URL). Change it, re-run `DOWNLOAD-MEDIA.bat`, and you're done. Credits are generated automatically under **Footer → Photo & video credits**.

---

## 3. Edit content

Everything business-related lives in **`assets/js/config.js`**:

- Phone, email, service area and **business hours** (these power the live "Open now" badge)
- Seasonal **offer** (price, anchor price, included items, **deadline**)
- **Reviews**, which are SAMPLES. Replace them with real Google reviews and set `reviewsAreSamples: false`. (Fake reviews are illegal under FTC rules.)
- **Stats** counters
- `formEndpoint`: leave empty to send quote requests via the visitor's email app, or paste a Formspree/Getform/Basin URL to receive submissions directly.

Copy and section text is plain HTML in `index.html`. Colors and spacing are CSS variables at the top of `assets/css/style.css`.

---

## 4. Color themes (3)

A floating glass button (bottom-right on PC; next to the Call/Text bar on mobile) opens the theme picker. The visitor's choice is remembered, and switching plays a circular "paint splash" reveal.

| Theme | Key | Look |
|---|---|---|
| **Arctic Night** (default) | `night` | Deep navy, ice blue, ember orange. Cool and techy. |
| **Summer Breeze** | `breeze` | Bright and airy: white and sky blue with vivid azure-to-violet buttons, coral and sunshine accents |
| **Obsidian Gold** | `gold` | Premium: near-black, champagne-gold gradients, elegant Playfair Display serif headings with italic accents |

- **Demo link for clients:** add `?theme=breeze` or `?theme=gold` to the URL, e.g. `index.html?theme=gold`
- **Change the default theme:** edit `data-theme="night"` on the `<html>` tag in `index.html`
- **Edit colors:** the `[data-theme="..."]` blocks at the top of `assets/css/style.css` handle the page, and `assets/js/theme.js` handles the 3D scenes
- The 3D scenes, the Babylon 3D studio and the VR showroom all follow the active theme.

## 5. Tech stack: what's used where

| Tech | Where | Why |
|---|---|---|
| **Three.js** (r169) | Hero airflow particles, glass thermostat orb, procedural AC condenser | Core WebGL engine. All models are built in code, so there are no heavy 3D files to download. |
| **React Three Fiber** (v8) | Renders both Three.js scenes declaratively | Loaded through the import map. If it can't load, the *same* scenes run on plain Three.js automatically. |
| **GSAP + ScrollTrigger** (3.13) | Pinned 3D "Inside" story, horizontal services track, split-text reveals, parallax, timeline drawing | Industry-standard scroll choreography |
| **Lenis** (1.1) | Buttery smooth scrolling, synced to GSAP's ticker | Native touch scrolling is kept on phones for comfort |
| **Babylon.js** | "Design your unit" 3D studio pop-up (size, paint finish, mounting) | Loaded **only when the pop-up opens**, so it adds 0 KB to the main page |
| **A-Frame** (1.6) | `vr-showroom.html`: WebXR walk-around with hotspots | Works on phones, desktops and VR headsets |

Running two or three 3D engines on one page would double the download and drain phone batteries, so each engine lives where it's strongest.

**Fallbacks:** if WebGL, a CDN or Pexels is unavailable, the page still works with CSS dial art, static illustrations, native scrolling and every form and pop-up intact.

---

## 6. Sections & pop-ups

1. **Hero:** background video (separate landscape and portrait cuts), airflow particles, draggable 3D thermostat that turns the whole hero from hot to cool
2. **Hidden-cost calculator:** loss-aversion sliders with an animated gauge
3. **Inside an Airwise install:** pinned, scroll-scrubbed exploded condenser (fan, then coil, then compressor, then sealed)
4. **Services:** horizontal pinned track (desktop) or swipe carousel (mobile), with 3D tilt cards and detail pop-ups
5. **Process:** 4-step timeline that draws on scroll, plus a video panel
6. **Before / after:** drag-to-compare comfort slider
7. **Reviews + stats:** auto-playing carousel and count-up stats
8. **Seasonal offer:** price anchoring and a live countdown
9. **Quote wizard:** 4 tap-steps with a goal-gradient progress bar (prefilled from pop-ups and the 3D studio)
10. **FAQ + contact + footer**

Pop-ups: theme picker · service details · Babylon 3D studio · exit-intent offer (once per session, never while filling the form) · success · media credits.
Mobile extras: sticky **Call / Text / Free estimate** bar and a full-screen menu.

On desktop, **every section is sized to fit one screen**. We tested 1280×720, 1366×768, 1440×900, 1536×864 and 1920×1080.

See `docs/3D-SITE-ANALYSIS.md` (the 15 reference sites) and `docs/PSYCHOLOGY-PLAYBOOK.md` (the engagement tactics, all ethical).

---

## 7. Pre-launch checklist

- [ ] Run `DOWNLOAD-MEDIA.bat`, check the picks and swap any media slot you don't love
- [ ] Set `pexelsApiKey: ''`
- [ ] Replace sample reviews and stats, then set `reviewsAreSamples: false`
- [ ] Set real offer price, anchor and `deadline`
- [ ] Confirm business hours and service area
- [ ] Add your license number and warranty terms if you want them displayed
- [ ] Connect a `formEndpoint` (optional) so leads arrive without relying on the visitor's email app
- [ ] Add your domain to the `og:` tags and submit to Google Search Console

## 8. Folder map

```
index.html              main site
vr-showroom.html        A-Frame VR page
assets/css/style.css    all styles
assets/js/config.js     ← edit business info here
assets/js/theme.js      3 color themes + floating switcher
assets/js/media-slots.js← choose Pexels photos/videos here
assets/js/app.js        GSAP, Lenis, sliders, pop-ups, form
assets/js/scene3d.js    Three.js + React Three Fiber scenes
assets/js/configurator.js Babylon.js 3D studio
assets/js/media.js      Pexels loader (local → API → fallback)
assets/media/           downloaded media lands here
tools/                  media downloaders (PowerShell + Node)
docs/                   strategy docs
```
