# Engagement and Conversion Playbook (ethical persuasion)

Each section of the site applies one or two well-documented behavioral principles. Everything here is honest by design: the urgency is real (a seasonal deadline you control), the proof should be real (swap in your own reviews and numbers) and the pop-ups appear at most once per session.

| Section | Principle | How it shows up |
|---|---|---|
| Hero | **Interactivity / IKEA effect** | Visitors drag a 3D thermostat. The page responds immediately (hot orange becomes cool cyan), so they *feel* the outcome before reading anything. |
| Hero CTAs | **First-person CTAs** | "Get **my** free estimate" instead of "Get a quote". |
| Hero | **Pain-point headline** | "Stop sweating your HVAC." names the frustration in the visitor's own words. |
| Hidden-cost calculator | **Loss aversion** | People feel losses about twice as strongly as gains, so we show *what an old system is costing them now*. The math is transparent and labeled as an estimate. |
| 3D "Inside" story | **Authority through transparency** | Showing the fan, coil, compressor and commissioning steps proves expertise without bragging. |
| Services track | **Choice architecture** | Five clear doors plus a "design your unit" door. Each opens a pop-up with a single next step. |
| Process | **Uncertainty reduction** | "Four steps. Zero surprises." People don't buy when they can't picture what happens next. |
| Process step 2 | **Good / better / best options (anchoring)** | The on-site assessment promises three price points, so the middle option feels reasonable. |
| Before/after comparison | **Contrast effect** | The same room shown hot and sticky beside cool and filtered. Visitors drag the slider themselves. |
| Reviews and stats | **Social proof** | Real neighbors and real numbers. **Replace the sample reviews before launch.** (FTC rules prohibit fake reviews.) |
| Offer | **Reciprocity, honest urgency and price anchoring** | A free 21-point check, a countdown to a deadline *you set*, and the tune-up price shown next to the typical emergency-call cost. |
| Quote wizard | **Foot-in-the-door and goal-gradient effect** | Tiny first commitments (tap a tile), a progress bar and "You're 75% done". Completion rates rise as people near the finish. |
| Exit-intent pop-up | **Last-chance reciprocity** | Shown once per session with a polite "Maybe later" (no confirm-shaming). |
| "Open now" badge | **Availability cue** | Calculated live from your business hours, so it's always true. |
| Sticky mobile bar | **Friction removal** | Call, Text and Estimate are always one thumb-tap away. |

## Before you launch, replace these placeholders (all in `assets/js/config.js`)

- `reviews` (set `reviewsAreSamples: false` once they're real)
- `stats`
- `offer.price`, `offer.anchorPrice`, `offer.deadline`
- `company.hours`, `company.serviceArea`
- Any license number or warranty terms you want to display
