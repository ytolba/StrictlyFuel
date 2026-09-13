# StrictlyFuel App Store Release Kit

## Current promotional screenshot set

Use the PNG files in `screenshots-6.9-inch-v2` or the ready-to-upload archive
`StrictlyFuel-App-Store-Screenshots-6.9-inch-v2.zip`. Each image is a flattened,
non-alpha **1284 × 2778 px** portrait screenshot accepted by App Store Connect.

Upload order:

1. `01-personal-fuel-target.png`
2. `02-scan-and-score.png`
3. `03-real-meals-scaled-to-you.png`
4. `04-plan-in-under-a-minute.png`
5. `05-recovery-built-from-training.png`
6. `06-race-day-fueling.png`

The first three intentionally tell the core acquisition story because they are
the images Apple uses on installation sheets: receive a workout-specific target,
scan the meal in front of you, and get realistic meals scaled to the target.

The supplied app captures remain unaltered inside the layouts apart from scaling
and cropping. The reusable forest topography backdrop was generated with OpenAI
built-in image generation and is stored at
`source-material/forest-topography.png`; all typography and screenshot framing
are deterministic and reproducible with `generate_promotional_screenshots.py`.

## Screenshot upload order

Upload the JPEG files in `screens/final` in filename order:

1. `01-plan-your-workout.jpg`
2. `02-personal-carb-target.jpg`
3. `03-real-meal-ideas.jpg`
4. `04-scan-and-improve.jpg`
5. `05-race-mode.jpg`
6. `06-apple-health-recovery.jpg`

All are flattened, high-quality portrait **1320 × 2868 px** screenshots for Apple’s **6.9-inch iPhone** slot. StrictlyFuel is currently iPhone-only, so no iPad set is included. The original simulator PNG captures are kept in `screens/source-png`; upload only the JPEGs from `screens/final` because Apple rejects images with alpha channels.

## Submission answers

Use `App-Store-Connect-Submission-Answers.md` as the field-by-field answer sheet. Replace only the entries marked **OWNER INPUT** and verify the support URL before submission.

## Generated food image source

The banana honey oatmeal photograph used in the meal screenshots is stored at `../assets/app-store/banana-honey-oatmeal.png`.

Generation mode: OpenAI built-in image generation.

Prompt:

> Use case: photorealistic-natural. Asset type: food photograph shown inside a mobile App Store screenshot. Primary request: an appetizing but realistic pre-workout banana honey oatmeal bowl. Scene/backdrop: minimal dark forest-green stone tabletop, subtle cream linen napkin at one edge. Subject: overhead bowl of creamy oatmeal topped with neat banana slices, a light honey drizzle, and a small dusting of cinnamon; believable portion for an athlete. Style/medium: premium natural food photography, editorial but not overly styled. Composition/framing: vertical 4:3 crop, centered bowl with clean negative space around it, true-to-life ingredient scale. Lighting/mood: soft morning window light, warm and grounded. Color palette: forest green, oatmeal cream, banana yellow, honey amber. Constraints: no packaging, no brand names, no text, no logos, no people, no utensils covering the food, no watermark; make the meal genuinely look edible and easy to prepare.
