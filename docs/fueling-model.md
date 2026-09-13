# StrictlyFuel fueling model

Model version: `2026.08`
Score version: `fuel-score-v3.0`

This document describes the deterministic model used by the app. AI may identify foods and portions, but it does not decide the carb target or calculate the Fuel Score.

## 1. Pre-workout carbohydrate target

The model starts with body weight and selects a practical grams-per-kilogram point for the planned session.

### Workout demand

```text
demand index =
  50% duration demand
  + 35% effort demand (intensity and optional HR zones)
  + 15% activity carbohydrate demand
```

Duration, timing, and availability values use linear interpolation. Moving from 60 to 61 minutes therefore never creates a large target jump.

### Timing envelope

| Time before training | Practical envelope |
| --- | --- |
| Now | 0.15 to 0.30 g/kg |
| 30 min | 0.25 to 0.50 g/kg |
| 60 min | 0.45 to 0.80 g/kg |
| 90 min | 0.75 to 1.25 g/kg |
| 2 hr | 1.00 to 1.75 g/kg |
| 3 hr | 1.50 to 2.75 g/kg |
| 4 hr | 2.00 to 4.00 g/kg |

The demand index selects a point within this envelope. A separate duration ceiling prevents an early meal for a short workout from becoming a race-sized meal.

```text
selected g/kg = min(timing selection, duration ceiling)
target grams = body weight kg x selected g/kg
working range = approximately +/- 12%
```

The broad scientific guideline is 1 to 4 g/kg in the 1 to 4 hours before longer exercise. The values below one hour are practical app heuristics and must be personalized with tolerance feedback over time.

## 2. Practical carbohydrate availability

Fast, medium, and slow are whole-meal availability estimates. They are not direct measurements of gastric emptying, blood glucose, glycaemic index, or individual absorption.

### Target mix

| Time before training | Fast | Medium | Slow |
| --- | ---: | ---: | ---: |
| 30 min | 76% | 24% | 0% |
| 60 min | 58% | 37% | 5% |
| 90 min | 42% | 43% | 15% |
| 2 hr | 28% | 47% | 25% |
| 3 hr | 16% | 42% | 42% |
| 4 hr | 10% | 35% | 55% |

The app interpolates continuously between these anchors.

### Food evidence

Classification considers:

- verified catalog tier and confidence;
- food structure and name;
- total carbohydrate and sugar when present;
- fiber, fat, and protein;
- ingredient-list signals;
- source reliability;
- sugar alcohols and allulose.

Low-confidence evidence remains partly or fully unclassified. The model never silently defaults an unknown food to medium.

A tier represents a center of gravity rather than assigning every gram to one bucket:

```text
Fast center:   82% fast, 18% medium
Medium center: 14% fast, 72% medium, 14% slow
Slow center:   24% medium, 76% slow
```

Fat, fiber, and protein elsewhere on the plate can shift a capped portion of the meal from fast toward medium and from medium toward slow. This lets toast with honey behave differently from toast with honey and a large amount of nut butter.

Sugar alcohols and allulose remain visible in label carbohydrate but are removed from dependable workout carbohydrate. They cannot satisfy the athlete's fuel target.

## 3. Fuel Score

| Component | Points |
| --- | ---: |
| Available carbohydrate amount | 55 |
| Carb availability fit | 20 |
| Timing fit | 15 |
| Likely comfort | 10 |

Carbohydrate misses use a nonlinear penalty:

```text
below range fit = (available carbs / lower target) ^ 3.6
above range fit = (upper target / available carbs) ^ 3.6
```

Availability fit uses an ordered earth-mover distance. A fast-to-slow mismatch costs more than a fast-to-medium mismatch. Low carb quantity also gates availability and timing points, so a tiny meal cannot score well because its ratio looks correct.

Comfort uses smooth timing-dependent limits for meal size, fat, fiber, and protein. Unknown availability produces a provisional score and a visible confidence warning rather than a hidden assumption.

## 4. Important limits

- Exact pre-workout needs depend on recent meals, glycogen status, training goals, gut tolerance, environment, and individual response.
- Glycaemic index alone does not reliably predict endurance performance.
- Camera-derived foods and portions remain estimates until corrected by the user.
- The model supports fueling decisions and is not medical advice.
- Personal post-workout feedback should eventually calibrate timing and comfort, but correlations must not be presented as proof of cause.

## 5. Evidence base

- Thomas, Erdman, and Burke. Nutrition and Athletic Performance. 2016.
- Burke et al. Carbohydrates for training and competition. 2011.
- Burdon et al. Effect of Glycemic Index of a Pre-exercise Meal on Endurance Exercise Performance. 2017.
- Costa et al. Sports Dietitians Australia and Ultra Sports Science Foundation gastrointestinal position statement. 2025.

The app's exact interpolation anchors, sport factors, and scoring weights are product heuristics layered on these guidelines. They should be recalibrated with validated outcomes rather than presented as clinical equations.
