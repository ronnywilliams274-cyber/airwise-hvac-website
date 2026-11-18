# 15 Reference 3D / Interactive Websites: What We Took From Each

Our design team reviewed 15 landmark interactive sites, including Awwwards and FWA winners, flagship product pages and well-known WebGL studios. For each one we pulled out the pattern behind its success and noted how we adapted it for a mobile-first HVAC lead-generation site.

| # | Site | Signature technique | What Airwise borrows |
|---|------|--------------------|----------------------|
| 1 | **Apple product pages** (AirPods / iPhone Pro) | Pinned, scroll-scrubbed product reveals and exploded views | The **"Inside an Airwise install"** section: a pinned, scroll-scrubbed exploded condenser (fan, then coil, then compressor, then a sealed system) |
| 2 | **Igloo Inc** (igloo.inc), Awwwards Site of the Year 2024 | Icy, crystalline 3D scroll journey | Frost/cool palette and a glassy "comfort orb" in the hero |
| 3 | **Bruno Simon** (bruno-simon.com) | A playful Three.js world you control | Interaction *is* the content: a **draggable 3D thermostat** you set yourself |
| 4 | **Lusion** (lusion.co) | Cursor-reactive particles and fluid WebGL | **Airflow particles** that part around your finger or cursor |
| 5 | **Oryzo** (oryzo.ai, by Lusion) | One product as the hero, with a scroll-driven camera | A single hero object (the condenser) carries the story |
| 6 | **Messenger by Abeto** (messenger.abeto.co) | A rich 3D world that still runs well on phones | Strict mobile budget: fewer particles, capped DPR, render loop paused when off-screen |
| 7 | **Active Theory** (activetheory.net) | Seamless WebGL transitions | Preloader-to-hero hand-off and smooth section transitions |
| 8 | **Stripe** (stripe.com) | Restrained WebGL used as atmosphere | 3D supports the message without hiding the CTA |
| 9 | **GitHub homepage globe** | Performance-tuned Three.js that degrades gracefully | Every 3D/JS feature has a fallback, and the site works with WebGL off |
| 10 | **Dogstudio** (dogstudio.co) | 3D hero that changes color with state | **Color as state**: the whole hero shifts from hot orange to cool cyan as you lower the temperature |
| 11 | **Lando Norris** (landonorris.com) | Oversized type, buttery smooth scroll, 3D helmet | **Lenis** smooth scroll, split-text reveals, bold display type |
| 12 | **Henry Heffernan portfolio** | A usable 3D object embedded in the page | The Babylon.js **"Design your unit"** configurator |
| 13 | **Shopify Editions** | Horizontal, chaptered storytelling | **Horizontal pinned services track** on desktop, swipe carousel on mobile |
| 14 | **Dyson product pages** | Visualizing invisible airflow | Directly relevant: we make *air* visible (particles, color, flow speed) |
| 15 | **Automotive 3D configurators** (Porsche, Polestar, Tesla) | Real-time product configurator | Choose size, finish color (which ties into the Paint Jobs service) and pad, then send that build to the quote form |

## Patterns every winner shares (and that we implemented)

1. **One hero object with a story.** We use a procedurally built AC condenser. There are no heavy GLB downloads, so the model costs about 0 KB.
2. **Scroll as a timeline.** GSAP ScrollTrigger pins sections and scrubs the 3D explode progress.
3. **Input changes the world.** The thermostat dial and the cost sliders give immediate, visible feedback.
4. **Smooth scroll plus kinetic type.** Lenis handles scrolling, with split-word reveals and staggered entrances.
5. **A preloader that masks loading** and sets the mood ("Calibrating airflow…").
6. **Mobile simplification instead of mobile omission.** Phones get the same story with lighter rendering.
7. **Graceful fallbacks.** If WebGL, a CDN or the media is unavailable, the page still reads and converts.

## What we deliberately avoided

- **Scroll-jacking that hides contact info.** Phone, text and quote stay one tap away (sticky mobile bar).
- **Multiple 3D engines on one page.** Three.js/R3F powers the main page. Babylon.js loads **only** when the configurator opens. A-Frame lives on its own **VR showroom** page. A second engine on the main page would cost roughly 1–3 MB of extra JS and drain phone batteries.
- **Sound on load.** HVAC customers often browse on their phones in public.
- **Dark patterns.** No fake "someone just booked" pop-ups, no fake stock counters and no confirm-shaming. (See `PSYCHOLOGY-PLAYBOOK.md`.)
