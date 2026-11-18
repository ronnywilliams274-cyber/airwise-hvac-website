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
- `company.cities`: the communities shown on the About page map and chips (the first one is the center pin)
- `social`: paste your Google / Facebook / Instagram / Yelp / Nextdoor / LinkedIn URLs, and footer icons appear only for the ones you fill in
- `credentials`: e.g. `['CA License #1234567', 'Fully insured']`. These are shown in the footer and on the About page, and stay hidden while the list is empty.

Copy and section text is plain HTML in `index.html`, `services.html` and `about.html`. Colors and spacing are CSS variables at the top of `assets/css/style.css`.

**Navigation and footer are shared by all three pages.** If you change a nav link or footer column, make the same edit in `index.html`, `services.html` and `about.html`.

### Pages
| Page | What's on it |
|---|---|
| `index.html` (Home) | 3D hero thermostat, cost calculator, exploded-unit story, services track, process, before/after, reviews, offer, quote wizard, FAQ |
| `services.html` | Page hero with airflow particles, a full section per service (what's included, ideal for, timeline, quote button), "Six promises" grid and the Babylon.js 3D studio |
| `about.html` | Story with the full-color logo, values plus stats, "old way vs. the Airwise way" comparison, service-area radar map with city chips, VR showroom link |
| `vr-showroom.html` | A-Frame VR walk-around |

Quote buttons on Services/About link to `index.html?service=...#quote`, which opens the home page with the quote form already on step 2.

### Logo files (made from your `assets/logo.png`)
| File | Use |
|---|---|
| `assets/img/logo-mark.png` | Emblem for dark backgrounds (navy parts turned ice-white): nav, preloader, contact card |
| `assets/img/logo-full-light.png` | Full logo for dark backgrounds: footer |
| `assets/img/logo-full-color.png`, `logo-mark-color.png` | Original colors on transparent, for light backgrounds (About page badge) |
| `assets/img/favicon-32.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png` | Browser tab and home-screen icons |

Your original `assets/logo.png` is untouched. The old `favicon.svg` and `logo.svg` are no longer used.

---

## 4. Tech stack: what's used where

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

## 5. Sections & pop-ups

1. **Hero:** background video (separate landscape and portrait cuts), airflow particles, draggable 3D thermostat that turns the whole hero from hot to cool
2. **Hidden-cost calculator:** loss-aversion sliders with an animated gauge
3. **Inside an Airwise install:** pinned, scroll-scrubbed exploded condenser (fan, then coil, then compressor, then sealed)
4. **Services:** horizontal pinned track (desktop) or swipe carousel (mobile), with 3D tilt cards and detail pop-ups
5. **Process:** 4-step timeline that draws on scroll, plus a video panel
6. **Before / after:** drag-to-compare comfort slider
7. **Reviews + stats:** auto-playing carousel and count-up stats
8. **Seasonal offer:** price anchoring and a live countdown
9. **Quote wizard:** 4 tap-steps with a goal-gradient progress bar (prefilled from pop-ups and the 3D studio)
10. **FAQ + contact**
11. **Site footer (all pages):** call-to-action band, logo, Services / Company / Contact columns, social icons, credits

Pop-ups: service details · Babylon 3D studio · exit-intent offer (once per session, never while filling the form) · success · media credits.
Mobile extras: sticky **Call / Text / Free estimate** bar and a full-screen menu.

On desktop, **every section is sized to fit one screen**. We tested 1280×720, 1366×768, 1440×900, 1536×864 and 1920×1080.

See `docs/3D-SITE-ANALYSIS.md` (the 15 reference sites) and `docs/PSYCHOLOGY-PLAYBOOK.md` (the engagement tactics, all ethical).

---

## 6. Pre-launch checklist

- [ ] Run `DOWNLOAD-MEDIA.bat`, check the picks and swap any media slot you don't love
- [ ] Set `pexelsApiKey: ''`
- [ ] Replace sample reviews and stats, then set `reviewsAreSamples: false`
- [ ] Set real offer price, anchor and `deadline`
- [ ] Confirm business hours and service area
- [ ] Add your license number and insurance to `credentials` in `config.js` (only what is true)
- [ ] Confirm the city list (`company.cities`) and add your social profile URLs
- [ ] Swap stock photos on the About page for real photos of your crew when you have them
- [ ] Connect a `formEndpoint` (optional) so leads arrive without relying on the visitor's email app
- [ ] Add your domain to the `og:` tags and submit to Google Search Console

## 7. Folder map

```
index.html              home page
services.html           services page
about.html              about us page
vr-showroom.html        A-Frame VR page
assets/logo.png         your original logo
assets/img/             logo variants + favicons
assets/css/style.css    all styles
assets/js/config.js     ← edit business info here
assets/js/media-slots.js← choose Pexels photos/videos here
assets/js/app.js        GSAP, Lenis, sliders, pop-ups, form
assets/js/scene3d.js    Three.js + React Three Fiber scenes
assets/js/configurator.js Babylon.js 3D studio
assets/js/media.js      Pexels loader (local → API → fallback)
assets/media/           downloaded media lands here
tools/                  media downloaders (PowerShell + Node)
docs/                   strategy docs
```
