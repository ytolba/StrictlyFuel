# Hyperframes Composition Brief: StrictlyFuel

## Objective
A short launch-style brag video for StrictlyFuel — the app that turns body weight, session, and time-to-start into an exact carb target, then shows real meals that hit it and cites the research behind the number.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 19 seconds

## Source Material
- Project root: `/Users/yaseentolba/Desktop/strictlylogos/strictlyfuel`
- Primary files read: `README.md`, `src/theme/strictlyTheme.ts`, `src/components/fuel/FuelTargetCard.tsx`, `src/screens/fuel/FuelTargetScreen.tsx`, `src/data/researchSources.ts`
- Product name: StrictlyFuel
- Strongest claim: a carbohydrate target stated to the gram, with citations

Images (App Store screenshots, cropped to device, already in `assets/img/`):
- `target.png` — `Today's fuel`, 75 g carbs
- `meals.png` — `What to eat`, Banana Yogurt Oat Bowl
- `recovery.png` — `Post workout`, recovery macros

- Copy that must appear verbatim:
  - Your carbs, worked out to the gram.
  - Real meals, scaled to today's session.
  - Refuel before the window closes.
  - Fast 32g / Medium 32g / Slow 11g
  - Banana Yogurt Oat Bowl · 76g carbs · 2 hr 15 min before
  - 90g carbs / 25g protein
  - Start recovery within about 30–60 minutes
  - Every number cites its source.
  - StrictlyFuel

## Creative Direction
- Tone preset: `app-store`
- Creative direction: "a lab result you can eat" — clinical precision, warm delivery.
- Interpretation: smooth slides, one claim per scene, generous holds. Numbers are the visual; motion stays out of their way.
- Angle: every other nutrition app hands you a macro ring and leaves you guessing. StrictlyFuel answers the narrow, hard question — how many grams, for this session, starting in ninety minutes, and what meal gets me there — and cites its sources.
- Hook: the number alone, `75 g carbs`, before any explanation.
- Outro: "Your carbs, to the gram." / StrictlyFuel — sources included.
- Avoid: generic SaaS or wellness language, stock gym imagery, abstract filler, any claim the app does not make.

## Visual Identity
From `src/theme/strictlyTheme.ts`, dark palette:
- Background `#08090A` · surface `#101214` · inset `#0C0E10`
- Text `#F4F5F4` · soft `#A2AAA6` · muted `#838B87`
- Accent `#CDF564` · dim `#B9E148` · on-lime `#08090A`
- Border `#1F2326` · strong `#2E3337`
- Display font Space Grotesk 700; body 400/600 (shipped locally in `assets/fonts/`)

## Storyboard
`brag-output/brag-plan.md` is the creative contract.

1. **The number** — 3.5s — `Today's fuel`, 75 g carbs; "Your carbs, worked out to the gram."
2. **The split** — 4.5s — Fast 32g / Medium 32g / Slow 11g arriving one by one; "Not just how much. When."
3. **A real meal** — 4.5s — Banana Yogurt Oat Bowl, 76g carbs, 2 hr 15 min before; "Real meals, scaled to today's session."
4. **Recovery** — 3.5s — 90g carbs / 25g protein; "Refuel before the window closes."
5. **Sources included** — 3.0s — "Every number cites its source." + four source pills + wordmark.

## Audio
- Audio role: **intentional near-silence.** Sparse, motion-matched interface cues only.
- Music: **none** — disabled by the user, who asked for audio with no instruments. Do not add a bed, a drone, a riser, or any melodic element.
- Music treatment: not applicable.
- Music cue guidance: not applicable — with no track there is no beat grid. All timing comes from reading-time floors (short label ~0.8s settled, sentence ~0.3s/word, ~1.2s minimum).
- Audio-reactive treatment: none — there is no audio track to extract.
- Audio-coupled moments:
  - Scene 1 — the `Today's fuel` screen arriving (one warm impact)
  - Scene 2 — three split rows, one light tick each
  - Scene 3 — the meal card landing (one soft confirm)
  - Scene 4 — two recovery tiles, one quiet tick each
  - Scene 5 — the wordmark (one restrained resolve)
- SFX selection guidance: warm, low high-frequency-risk files only (`impactSoft_*`, `rollover2`, `bong_001`). With no bed under them, every cue is exposed — fewer and warmer.
- SFX analysis guidance: `~/.claude/skills/brag/assets/sfx/sfx-analysis.md`
- Restraint rule: no sound on a cut, no sound without motion under it. Silence is the default and should read as deliberate.
- Audio files: already in `assets/sfx/` (`reveal.ogg`, `tick.ogg`, `confirm.ogg`, `logo.ogg`).

## Hyperframes Instructions
Load `hyperframes-core`, `hyperframes-animation`, `hyperframes-creative`, `hyperframes-keyframes`, `hyperframes-cli`. This is the `/brag` workflow — do not enter the `hyperframes` entry-point interview.

Requirements:
- Show real UI: the three screenshots are the centerpiece.
- Keep all text readable — reading floors above; no beat grid to hide behind.
- Total duration 19s.
- Include the SFX layer. **No music.**
- Skip beat-locking and audio-reactive extraction; document both as not applicable (no track).
- Use local assets throughout.
- `hyperframes check` must pass before render.
