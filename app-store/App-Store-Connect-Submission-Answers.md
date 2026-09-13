# StrictlyFuel App Store Connect Submission Answers

Prepared for StrictlyFuel iOS version **1.0.1**, build **15**, bundle ID **`com.strictlyfuel.app`**.

This is the complete app-specific answer sheet for the first release. Values marked **OWNER INPUT** are private legal/contact details that must come from the account holder and should not be invented.

## 1. New App Record

- Platforms: **iOS**
- Name: **StrictlyFuel**
- Primary language: **English (U.S.)**
- Bundle ID: **com.strictlyfuel.app**
- SKU: **strictlyfuel-ios-001**
- User access: **Full Access**

## 2. App Information

- App name: **StrictlyFuel**
- Subtitle: **Fuel Every Workout Smarter**
- Primary category: **Health & Fitness**
- Secondary category: **Sports**
- Content rights: **Yes, this app contains, shows, or accesses third-party content, and I have the necessary rights.**
  - Reason: the app can display USDA FoodData Central data, Open Food Facts data, and user-created community meal posts.
  - Before launch, retain required Open Food Facts attribution and comply with its database license. USDA data is generally public-domain U.S. government data.
- Made for Kids: **No**
- License agreement: **Apple Standard End User License Agreement**
- Regulated medical device declaration: **No, this app is not a regulated medical device.**

## 3. Age Rating Questionnaire

Use these answers for the current build:

### In-App Controls

- Parental controls: **No**
- Age assurance: **No**

### Capabilities

- Unrestricted web access: **No**
- User-generated content: **Yes**
- Social media: **Yes**
- Social media disabled for users under 13: **No**
- Messaging and chat: **No**
- Advertising: **No**

### Medical or Wellness

- Medical or treatment information: **None**
- Health or wellness topics: **Frequent**

StrictlyFuel gives exercise-fueling and nutrition education. It does not diagnose, treat, cure, or manage medical conditions.

### Mature Themes

- Profanity or crude humor: **None**
- Horror or fear themes: **None**
- Alcohol, tobacco, or drug use or references: **None**

### Sexuality or Nudity

- Mature or suggestive themes: **None**
- Sexual content or nudity: **None**
- Graphic sexual content and nudity: **None**

### Violence

- Cartoon or fantasy violence: **None**
- Realistic violence: **None**
- Prolonged graphic or sadistic realistic violence: **None**
- Guns or other weapons: **None**

### Chance-Based Activities

- Gambling: **None**
- Simulated gambling: **None**
- Contests: **None**
- Loot boxes: **No**

Accept the rating Apple calculates from these answers. Do not manually override it.

## 4. App Privacy

### Privacy URLs

- Privacy Policy URL: **https://strictlyinc.com/privacy**
- User Privacy Choices URL: **https://strictlyinc.com/privacy**

The privacy policy must be publicly reachable without signing in and must describe Supabase, RevenueCat, OpenAI processing through Supabase Edge Functions, Apple Health, USDA FoodData Central, Open Food Facts, account deletion, retention, and community posts.

### Data Collection Overview

- Do you or your third-party partners collect data from this app? **Yes**
- Is any collected data used for tracking? **No**
- Does the app show third-party advertising? **No**
- Does the app use IDFA or request App Tracking Transparency permission? **No**
- Is data sold? **No**

For every data type below, select **No** for “used for tracking.”

### Contact Info

#### Name

- Collected: **Yes**
- Linked to the user: **Yes**
- Purposes: **App Functionality**

#### Email Address

- Collected: **Yes**
- Linked to the user: **Yes**
- Purposes: **App Functionality**

#### Phone Number

- Collected: **No**

#### Physical Address

- Collected: **No**

#### Other User Contact Info

- Collected: **No**

### Health & Fitness

#### Health

- Collected: **Yes**
- Linked to the user: **Yes**
- Purposes: **App Functionality**, **Product Personalization**
- Includes: dietary preferences, allergies, sensitivities, health-condition context, height, and weight supplied by the user.

#### Fitness

- Collected: **Yes**
- Linked to the user: **Yes**
- Purposes: **App Functionality**, **Product Personalization**
- Includes: workout activity, duration, intensity, heart-rate context, calories, distance, and optional read-only Apple Health workout data used to create a fuel plan.

### Financial Info

#### Payment Info

- Collected: **No**

Apple handles payment credentials. StrictlyFuel and RevenueCat receive transaction/entitlement records, not the card number or payment credentials.

#### Credit Info

- Collected: **No**

#### Other Financial Info

- Collected: **No**

### Location

- Precise location: **No**
- Coarse location: **No**

Do not add route or precise-location HealthKit permissions to this release.

### Sensitive Info

- Collected: **Yes**
- Linked to the user: **Yes**
- Purposes: **App Functionality**, **Product Personalization**
- Reason: allergy, sensitivity, dietary, and health-condition preferences can include sensitive information, including a user-selected halal dietary preference.

### Contacts

- Collected: **No**

### User Content

#### Emails or Text Messages

- Collected: **No**

#### Photos or Videos

- Collected: **Yes**
- Linked to the user: **Yes**
- Purposes: **App Functionality**
- Includes: meal photos and nutrition-label photos uploaded for analysis or voluntarily published with a community post.

#### Audio Data

- Collected: **No**

#### Gameplay Content

- Collected: **No**

#### Customer Support

- Collected: **No in this app build**

If support is later collected through an in-app form or SDK, change this to **Yes** and disclose its purposes.

#### Other User Content

- Collected: **Yes**
- Linked to the user: **Yes**
- Purposes: **App Functionality**, **Product Personalization**
- Includes: meals, ingredients, workout plans, captions, nutrition corrections, saved meals, reports, and post-workout feedback.

### Browsing History

- Collected: **No**

### Search History

- Collected: **No**, provided food-search text is processed only to return results and is not retained as a user search-history profile.

If production logging or database tables retain identifiable query text, change this answer to **Yes**, linked to the user, for **App Functionality**.

### Identifiers

#### User ID

- Collected: **Yes**
- Linked to the user: **Yes**
- Purposes: **App Functionality**

#### Device ID

- Collected: **No**

This answer assumes no third-party SDK in the release retains a device identifier. Recheck the App Privacy Report from the final archive before submission.

### Purchases

#### Purchase History

- Collected: **Yes**
- Linked to the user: **Yes**
- Purposes: **App Functionality**
- Includes: RevenueCat/App Store subscription and entitlement status.

### Usage Data

#### Product Interaction

- Collected: **Yes**
- Linked to the user: **Yes**
- Purposes: **App Functionality**
- Includes: scan and reshuffle usage counters, saves, copies, blocks, reports, and feature-entitlement checks.

#### Advertising Data

- Collected: **No**

#### Other Usage Data

- Collected: **No**

### Diagnostics

- Crash data: **No**
- Performance data: **No**
- Other diagnostic data: **No**

This assumes the release has no separate crash-reporting or telemetry SDK enabled. Apple’s own opt-in diagnostics are not developer collection through StrictlyFuel.

### Other Data

- Collected: **No**

## 5. iOS Version Information

- Version: **1.0.1**
- Build: **11**
- Copyright: **2026 STRICTLYBASED LLC**
- App Clip: **None**
- Apple Watch app: **None**
- iMessage app: **None**
- Game Center: **No**

### Promotional Text

> Turn your next workout into a personalized carb target, a real meal, and a practical timing plan. Scan what you have, improve it, and fuel the work.

### Description

> StrictlyFuel answers the question athletes ask before training: what should I eat, how much, and when?
>
> Plan your workout and get a personalized carbohydrate target based on your body weight, activity, duration, intensity, heart-rate zones, and time before training. Then turn that number into food you would actually eat.
>
> FEATURES
>
> • Personalized pre-workout carb targets
> • Intra-workout fueling guidance for longer sessions
> • Real meal recommendations scaled to your target
> • Fast, medium, and slow carbohydrate estimates
> • Meal-photo scanning with editable portions and macros
> • A workout-specific Fuel Score
> • Practical ways to improve the meal you already have
> • Barcode and nutrition-label scanning
> • Optional Apple Health workout import
> • Post-workout recovery targets and complete meal ideas
> • Race Mode with fueling intervals and a packing plan
> • A private fuel history and contextual athlete meal ideas
>
> StrictlyFuel is built for runners, cyclists, swimmers, lifters, triathletes, and anyone who wants a clearer plan before training.
>
> Camera-based nutrition values and digestion categories are estimates. You can review and correct detected foods before saving. StrictlyFuel provides educational workout-fueling guidance and is not medical advice.
>
> Free users receive three meal-photo scans each week. StrictlyFuel Pro unlocks expanded scans, post-workout recovery guidance, Race Mode, and additional fuel-planning tools. Subscriptions renew automatically unless canceled at least 24 hours before the end of the current period. Manage or cancel subscriptions in your Apple ID settings.
>
> Privacy Policy: https://strictlyinc.com/privacy
>
> Terms of Use: https://strictlyinc.com/terms

### Keywords

`carbs,workout,nutrition,running,cycling,preworkout,race,meal,athlete,macros`

### URLs

- Support URL: **https://strictlyinc.com/**
- Marketing URL: **https://strictlyinc.com/**

The live homepage exposes `getstrictly@gmail.com`, so it is usable as the launch support URL. A dedicated `/support` page would be cleaner later, but that route currently returns 404 and must not be entered in App Store Connect.

### What’s New

Not normally required for the first release. If App Store Connect asks for it, use:

> Meet StrictlyFuel: personalized workout carb targets, realistic meal ideas, meal scanning, Apple Health workout import, and Race Mode in one focused fueling app.

## 6. Screenshots and Previews

- App previews: **None for version 1.0.1**
- 6.9-inch iPhone screenshots: upload the six JPEG files in `app-store/screens/final` in filename order.
- Each screenshot is a flattened, high-quality **1320 × 2868 px** portrait JPEG with no alpha channel.
- iPad screenshots: **Not required**, because this build is iPhone-only.

Recommended order:

1. Plan your workout
2. Personal carb target
3. Real meal ideas
4. Scan and improve
5. Race Mode
6. Apple Health recovery

## 7. App Review Information

### Contact Information

- First name: **OWNER INPUT**
- Last name: **OWNER INPUT**
- Phone number: **OWNER INPUT — a number Apple can reach during review**
- Email: **OWNER INPUT — a monitored support/review email**

### Sign-In Information

- Sign-in required: **Yes — supply the dedicated App Review account below so Apple can inspect its expired subscription history**
- User name: **OWNER INPUT — dedicated StrictlyFuel review-account email**
- Password: **OWNER INPUT — stable password that will remain valid throughout review**

The guest path remains available for the core experience. The supplied review account is specifically required for Apple to inspect the full purchase flow and an account with an expired StrictlyFuel Pro subscription.

### App Review Notes

Paste this:

> StrictlyFuel is an educational workout-fueling app and is not a medical device. It does not diagnose or treat medical conditions.
>
> SIGN-IN: Use the App Review credentials above to inspect the requested expired-subscription account. A guest path also remains available for the free core experience.
>
> BASIC FLOW: Open Preworkout, choose an activity, duration, intensity, heart-rate zones if applicable, and start time. Tap Calculate My Fuel to receive a carbohydrate target. From the result, use Tell Me What to Eat, Use What I Have, or Scan My Meal.
>
> CAMERA: The Scan tab contains meal-photo, barcode, and nutrition-label options. Photo-based values are clearly labeled as estimates and can be corrected before saving.
>
> APPLE HEALTH: During onboarding, the final information screen now has one neutral Continue button. Continue always opens Apple’s system Health permission sheet on a supported device; there is no Skip or close action on this pre-permission screen. The user decides what to share in Apple’s sheet. StrictlyFuel requests read-only workout access, remains usable with manual workout entry if access is declined, and never uses Health data for advertising or marketing.
>
> SUBSCRIPTIONS: StrictlyFuel Pro is offered through Apple auto-renewable subscriptions. The supplied review account has expired subscription history and is currently not entitled to Pro, so the complete purchase flow can be reviewed. Race Mode and the Post Workout tab are Pro features. Free users receive three meal-photo scans per week. The paywall includes Restore Purchases, Terms of Use, and Privacy Policy. Prices are loaded from StoreKit.
>
> ACCOUNT DELETION: A signed-in user can open the profile icon, scroll to Account, and tap Delete account. This permanently deletes the account and owned data.
>
> COMMUNITY SAFETY: Meal logs are private by default. Publishing is optional. On a community post, signed-in users can report the post or block its author. Users can delete their own posts.
>
> No precise location is collected or attached to workouts or posts.

### Attachment

- Optional: attach a short screen recording showing guest access, calculation, paywall, Restore Purchases, report/block, and account deletion if any of these are difficult for a reviewer to find.

## 8. In-App Purchases and Subscriptions

Create or verify one subscription group:

- Subscription group reference name: **StrictlyFuel Pro**
- Group display name: **StrictlyFuel Pro**

### Monthly Subscription

- Reference name: **StrictlyFuel Monthly**
- Product ID: **StrictlyFuel_Monthly**
- Type: **Auto-Renewable Subscription**
- Duration: **1 Month**
- Display name: **StrictlyFuel Pro Monthly**
- Description: **Race Mode, post-workout recovery guidance, and expanded meal scans and meal-idea reshuffles.**
- Price: **Use the App Store Connect tier that displays $4.99 USD**
- Family Sharing: **No**

### Yearly Subscription

- Reference name: **StrictlyFuel Yearly**
- Product ID: **StrictlyFuel_Yearly**
- Type: **Auto-Renewable Subscription**
- Duration: **1 Year**
- Display name: **StrictlyFuel Pro Yearly**
- Description: **Annual access to Race Mode, post-workout recovery guidance, and expanded meal scans and meal-idea reshuffles.**
- Price: **Use the App Store Connect tier that displays $29.99 USD**
- Family Sharing: **No**

### Subscription Localization and Review

- Subscription group name: **StrictlyFuel Pro**
- Custom grace period: **Optional; leave off for first release unless deliberately configured**
- Introductory offer/free trial: **None unless it has been intentionally configured in both App Store Connect and the paywall**
- Promotional offers: **None for first release**
- Offer codes: **None for first release**
- Billing grace period: **Optional; Apple’s standard handling is acceptable for launch**
- App Store Server Notifications: **Use the RevenueCat-provided production URL if RevenueCat requests it; do not invent a URL**
- Review screenshot: upload a real screenshot of the in-app paywall showing the subscription options, Restore Purchases, Terms, and Privacy links.
- Review notes:

> This auto-renewable subscription unlocks Race Mode, the Post Workout experience, and higher weekly meal-scan and meal-idea limits. Purchase and restore are handled through Apple StoreKit using RevenueCat for receipt validation and entitlement delivery. The app remains useful without a subscription.

Submit both subscription products with the first app version.

## 9. Export Compliance

- Does the app use encryption? **Yes, only standard encryption provided by the operating system and standard HTTPS/TLS libraries.**
- Does the app implement proprietary or non-standard encryption? **No**
- Does the app contain non-exempt encryption? **No**
- Is export-compliance documentation required? **No, based on the current build’s exempt HTTPS/TLS use.**

The project declares `ITSAppUsesNonExemptEncryption = false`. If Apple’s upload flow only asks whether the app uses non-exempt encryption, answer **No**.

## 10. Pricing and Availability

- App price: **Free**
- In-app purchases: **Yes**
- Pre-order: **No**
- Release method: **Manually release this version** for the first launch
- Phased release: **No for the initial launch**
- Availability: **All territories where the LLC is legally able to distribute the app and its subscriptions**
- Education discount: **Not applicable**
- Apple silicon Mac availability: **Do not make available on Mac for version 1.0.1 unless the iPhone UI and HealthKit/camera behavior have been tested on Mac**
- Apple Vision Pro availability: **Do not make available for version 1.0.1**

## 11. European Union Digital Services Act

Because the app is distributed commercially by an LLC and offers paid subscriptions, the expected selection is:

- Trader status: **Trader**
- Public trader name: **STRICTLYBASED LLC**
- Address: **OWNER INPUT — the verified business contact address Apple is allowed to display**
- Phone: **OWNER INPUT**
- Email: **OWNER INPUT**

Apple may require documentation to verify these details. The Account Holder should complete this section.

## 12. Tax, Banking, and Agreements

- Paid Applications Agreement: **Must be active**
- Banking: **Must be complete and approved**
- Tax forms: **Must be complete and approved**
- U.S. tax category for subscriptions: choose the closest App Store Connect category for **software/digital services**, based on the company’s tax advice.

These are account-level legal decisions and should be confirmed by the Account Holder or accountant.

## 13. Accessibility Information

Do not claim support for an accessibility feature unless it has been tested in the release build.

Safe launch answers:

- VoiceOver: **Do not claim yet unless a full VoiceOver pass is completed**
- Voice Control: **Do not claim yet unless tested**
- Larger Text: **Do not claim yet unless Dynamic Type is verified across all screens**
- Dark Interface: **Yes**, if App Store Connect offers this descriptive option; the app supports dark and light appearance.
- Differentiate Without Color Alone: **Do not claim yet unless audited**
- Sufficient Contrast: **Do not claim yet unless audited**
- Reduced Motion: **Do not claim yet unless audited**
- Captions / Audio Descriptions: **Not applicable; no required video/audio content in the app**

Accessibility metadata is not a substitute for accessibility testing.

## 14. Final Submission Checklist

Complete these before pressing **Add for Review**:

- [ ] Verify `https://strictlyinc.com/privacy` loads publicly.
- [ ] Verify `https://strictlyinc.com/terms` loads publicly.
- [x] Verify the support URL has a visible contact method. The homepage exposes `getstrictly@gmail.com`; do not enter the current 404 `/support` route.
- [ ] Confirm the final archive is version 1.0.1, build 16, bundle ID `com.strictlyfuel.app`.
- [ ] Confirm the archive contains the valid privacy manifest.
- [ ] Run Xcode’s privacy report and reconcile any SDK-collected device or diagnostics data with the privacy answers above.
- [ ] Verify HealthKit capability and the distribution provisioning profile.
- [ ] Test Apple Health permission on a physical iPhone.
- [ ] Test camera, flash, barcode, nutrition-label, and meal-photo flows on a physical iPhone.
- [ ] Test guest mode, email sign-up confirmation, Sign in with Apple, sign-out, and account deletion.
- [ ] Test the three-free-scan limit with a new free account.
- [ ] Test monthly and yearly purchases in StoreKit sandbox/TestFlight.
- [ ] Test Restore Purchases after reinstalling.
- [ ] Verify RevenueCat entitlement `strictlyfuel_pro` is granted and revoked correctly.
- [ ] Verify the RevenueCat webhook reaches Supabase and updates entitlement state.
- [ ] Verify subscription prices on the paywall exactly match StoreKit.
- [ ] Verify Race Mode and Post Workout unlock for Pro and remain gated for free users.
- [ ] Verify report, block, delete-post, and account-deletion flows.
- [ ] Ensure there is a working method to review and respond to community reports.
- [ ] Add `StrictlyFuel_Monthly`, `StrictlyFuel_Yearly`, their subscription group, and build 16 to the same App Review submission.
- [ ] Supply a dedicated App Review login whose RevenueCat customer record shows an expired App Store sandbox subscription and no active `strictlyfuel_pro` entitlement.
- [ ] Upload screenshots in filename order.
- [ ] Add the final build and answer export-compliance questions.
- [ ] Complete DSA trader verification.
- [ ] Complete App Review contact information.
- [ ] Choose manual release and submit for review.

## 15. Fields That Still Require the Owner

Only these cannot be truthfully completed from the codebase:

1. App Review first/last name, phone, and monitored email.
2. Confirmation that `getstrictly@gmail.com` is monitored for App Store customer support.
3. DSA trader address, phone, email, and verification documents.
4. Final territory availability and any territory-specific legal decisions.
5. Tax/banking agreements and tax-category selection.
