# Product

<!-- impeccable:product-schema 1 -->

## Platform

ios

## Users

**Primary: athletes and people who train** — runners, cyclists, lifters, HIIT and field-sport athletes — deciding what to eat before (and after) a session. Their job in the app is to turn the workout in front of them into a carbohydrate target and a real meal that fits the timing.

## Product Purpose

StrictlyFuel turns a workout into a practical carb target, then helps the athlete build, scan, or borrow a meal that lands in range. Success is an athlete who knows what to eat and when, without doing sports-nutrition math.

## Positioning

The plan starts from the specific session — activity, duration, intensity, heart-rate zones, and time until training — rather than a daily calorie budget. Apple Health workouts can seed the session and drive post-workout recovery guidance.

## Operating Context

- **Pre-workout flow:** set the session on Preworkout → calculate → see the carb target and timing → open the full plan.
- **Meal paths:** meal ideas matched to the target, a meal builder with adjustable portions, photo meal scan and food-label capture (AI estimates, weekly credit limits for free users).
- **Post Workout:** recovery meals built from completed Apple Health workouts (Pro).
- **Race Mode:** carbs, timing, and what to pack for race day.
- **Account:** email or Apple sign-in, nutrition profile stored on device, appearance setting (dark default, light, system).

## Capabilities and Constraints

- Expo / React Native app, iOS only (`supportsTablet: false`), portrait. Backend is Supabase; subscriptions via RevenueCat.
- Apple Health access is read-only.
- Carb speeds (fast / medium / slow / unclassified) are practical timing guides, not glycemic-index claims.
- Meal scan and label analysis are estimates and are labeled as such.

## Brand Commitments

- **Name:** StrictlyFuel, a Strictly product (legal entity StrictlyBased LLC). Company site: strictlyinc.com.
- **Mark:** the StrictlyFuel lightning bolt with its accent dot (`Strictly-Family-Brand-Kit/StrictlyFuel`). It is the app icon, splash, and in-app mark.
- **Binding voice commitment (company-wide):** *"Clarity without fear. Standards without judgment."* Give context and reasons; the athlete makes the call.
- **Standing design preference (founder, 2026-09-11; applied to the app 2026-09-13):** Strictly products look like a premium fitness-technology product, executed at the craft level of **Whoop and Eight Sleep** — dark ground, product- and data-led, conventions embraced without irony. The app follows the same system as strictlyinc.com (near-black ground, one lime accent for primary action and live data). Only the founder can change this.

## Evidence on Hand

**Real:** the shipped App Store app, App Store screenshot set (`app-store/`), cited sports-nutrition guidance behind the calculator.

**Absent — must not be fabricated:** user counts, testimonials, outcome claims, or partnerships.

## Product Principles

1. **The athlete decides.** Targets come with reasons and ranges, never orders.
2. **Estimates are labeled estimates.** Photo and label analysis never pose as measurement.
3. **Start from the session.** Every recommendation traces back to the workout in front of the athlete.
4. **Fast to a usable answer.** A target in under a minute; depth is optional.

## Accessibility & Inclusion

- 11 pt text floor, 44 pt touch targets, readable contrast in both dark and light appearance.
