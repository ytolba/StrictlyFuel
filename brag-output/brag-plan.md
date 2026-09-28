# Brag Plan: StrictlyFuel

## What is this app?
An iOS app that turns an athlete's body weight, session, and time-to-start into an exact carbohydrate target, then shows real meals portioned to hit it — and cites the sports-nutrition research behind every number.

## The angle
Most fitness nutrition apps hand you a vague macro ring and leave you to guess what to actually eat. StrictlyFuel answers a narrower, harder question: *how many grams of carbs, for this session, starting in ninety minutes, and what meal gets me there?* The video's job is to make that precision feel like the whole point — one number, one meal, one recovery window — and to land the differentiator nobody else has: **the number cites its sources.**

## Hook (first 2-3 seconds)
The number, alone. `75 g carbs` in lime on near-black, the working range under it, and the split bar filling — before any explanation. A carb target is an abstract idea until you see it stated to the gram.

## Key moments (the middle)
- **The split.** Fast / Medium / Slow carbs — 32g, 32g, 11g — because *when* you eat matters as much as how much.
- **A real meal, portioned.** Banana Yogurt Oat Bowl at 76g carbs, scored 96, with "2 hr 15 min before" attached. Not a food database — a decision.
- **The recovery window.** 90g carbs / 25g protein, "Start recovery within about 30–60 minutes."
- **The citations.** Burke, World Athletics, ISSN ×2 — the guidance is traceable.

## Outro / punchline
> **Your carbs, to the gram.**
> StrictlyFuel — sources included.

## User flow worth showing
1. **Entry:** describe the session → get a carb target (`Today's fuel`, 75 g carbs)
2. **Key action:** pick a real meal scaled to that target (`What to eat`, Banana Yogurt Oat Bowl, 76g)
3. **Result:** train, then refuel inside the window (`Post workout`, 90g / 25g)

## Tone
- Preset: `app-store`
- Creative direction: "a lab result you can eat" — clinical precision, warm delivery.
- Interpretation: smooth slides, one claim per scene, generous holds. The numbers are the visual; motion stays out of their way.

## Format: landscape — 1920x1080
## Duration: 19s

## Visual identity (from the project)
From `src/theme/strictlyTheme.ts` (dark palette — what the screenshots show):
- Background: `#08090A`, surface `#101214`, inset `#0C0E10`
- Text: `#F4F5F4`, soft `#A2AAA6`, muted `#838B87`
- Accent: `#CDF564` (`accentText`), dim `#B9E148`, on-lime `#08090A`
- Border: `#1F2326`, strong `#2E3337`
- Display font: Space Grotesk Bold (700); body Regular/SemiBold
- Strongest visual element: a large lime number on near-black, with the fast/medium/slow split bar under it

**Source material:** the App Store screenshots at `~/Desktop/salooma/` — `01_fuel_target.png`, `02_what_to_eat.png`, `05_recovery.png` (1242×2688), cropped to the device.

## Known staleness (accepted)
These shots date from 2026-09-01 and predate two fixes made 2026-09-18. Using them anyway, per direction:
- `01_fuel_target` shows the old rationale text (`Built from 83.91468824559335 kg body weight…`); the decimal-heavy wording has since been replaced with plain language.
- `02_what_to_eat` shows score circles reading `96` with a `FUEL` label; the label has since been removed. At video scale it is ~4px tall.

## Share copy (draft)
StrictlyFuel turns your body weight, your session, and how long until you start into one number: grams of carbs. Then it shows you real meals that hit it — and cites the research behind every figure.

## Audio direction
- Role: **no music.** Sparse, motion-matched interface sounds only — nothing instrumental, nothing melodic.
- Music: none (disabled by request).
- Music cue guidance: not applicable. With no bed there is no beat grid, so every timing decision is driven by reading time alone.
- Audio-reactive treatment: none — no audio track to react to.
- SFX posture: very sparse, ~6 cues across 19 seconds. Warm, low high-frequency-risk files only. Silence is the default state and should feel deliberate, not empty.
- Audio-coupled moments: the target number landing, each split row arriving, the meal card, the recovery tiles, one soft resolve on the wordmark.
- Restraint rule: no sound on a cut, no sound without motion under it. With no music bed every cue is exposed, so fewer and warmer beats louder.

## Storyboard

### Scene 1 — The number — 3.5s
Near-black. The `Today's fuel` screen rises into the left frame. Right column: eyebrow `Workout Ready`, headline **"Your carbs, worked out to the gram."** Held ~1.7s settled.
Sequential/interaction: phone slides up, headline lands after it.
Audio intent: one warm arrival. Then silence.
Transition mood: clean slide → Scene 2

### Scene 2 — The split — 4.5s
Same screen, now the split is the subject. Three rows arrive one by one as callout pills beside the phone: **Fast 32g**, **Medium 32g**, **Slow 11g**. Right column: **"Not just how much. When."**
Sequential/interaction: yes — three pills, ~0.85s apart, all three held together ~1.3s afterward.
Audio intent: three light ticks, one per row. Nothing else.
Transition mood: smooth wipe → Scene 3

### Scene 3 — A real meal — 4.5s
`What to eat` slides in. Callouts: **Banana Yogurt Oat Bowl**, **76g carbs**, **2 hr 15 min before**. Right column: **"Real meals, scaled to today's session."**
Sequential/interaction: yes — screen first, then two callouts ~0.9s apart.
Audio intent: one soft confirm as the meal lands.
Transition mood: smooth wipe → Scene 4

### Scene 4 — Recovery — 3.5s
`Post workout` screen. Two tiles: **90g carbs**, **25g protein**. Right column: **"Refuel before the window closes."** with `Start recovery within about 30–60 minutes` beneath.
Sequential/interaction: two tiles ~0.85s apart.
Audio intent: two ticks, quieter than scene 2.
Transition mood: soft crossfade → Scene 5

### Scene 5 — Sources included — 3.0s
Near-black, centered. Headline **"Every number cites its source."** Four source pills fade up together, small and calm: Burke et al. · World Athletics · ISSN nutrient timing · ISSN female athlete. Then the wordmark **StrictlyFuel** and **Your carbs, to the gram.**
Sequential/interaction: headline, pills as a set, then wordmark.
Audio intent: one restrained resolve on the wordmark. Ends in silence.
Transition mood: hold to black.

**Scene total:** 3.5 + 4.5 + 4.5 + 3.5 + 3.0 = **19.0s**

**Music mood for this video:** none — intentionally silent apart from sparse interface cues.
**Audio summary:** Six warm, motion-matched interface sounds across 19 seconds of silence; no music, no melody, no instrument.
