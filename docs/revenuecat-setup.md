# RevenueCat setup — StrictlyFuel

StrictlyFuel is an Expo / React Native app, so RevenueCat is integrated through
`react-native-purchases`, not the native iOS SDK. There is no SwiftUI code and
no `pod 'Purchases'` line to add: the pod is installed automatically by Expo's
autolinking (`RNPurchases` → `PurchasesHybridCommon` → `RevenueCat` 5.32.0).

## 1. Install

```sh
npm install
npx expo prebuild --platform ios   # only if ios/ needs regenerating
cd ios && pod install && cd ..
npx expo run:ios                   # a full rebuild is required, not a reload
```

`react-native-purchases-ui@8.12.0` was added alongside `react-native-purchases@8.12.0`.
The two packages must stay on the same version. It brings in Paywalls and
Customer Center. Hot reloading after adding it will fail with
`Invariant Violation: 'new NativeEventEmitter()' requires a non-null argument` —
rebuild instead.

In-app purchases never work in Expo Go. Use a development build, TestFlight or
the App Store build on a real device.

## 2. Dashboard configuration

Everything below has to match the constants in `src/config/monetization.ts`.

| Where | Value |
| --- | --- |
| Entitlement identifier | `strictlyfuel_pro` |
| Package identifiers in the offering | `monthly`, `yearly` |
| App Store product ids | `strictlyfuel_pro_monthly`, `strictlyfuel_pro_yearly` |
| Offering | whichever is marked **Current** |

1. **Product catalog → Products** — import the two subscriptions from App Store
   Connect. They must be in the same subscription group so customers can switch
   plans, and each needs a 3-day introductory free trial to match the paywall copy.
2. **Product catalog → Entitlements** — create `strictlyfuel_pro` and attach both products.
3. **Product catalog → Offerings** — create an offering, mark it Current, and add
   two packages identified `monthly` and `yearly`. The app also accepts
   RevenueCat's built-in `$rc_monthly` / `$rc_annual` identifiers.
4. **Paywalls** — build a paywall on that offering. Without one, the SDK renders
   a default template; the app still works either way.
5. **Customer Center** (Lifecycle → Retention → Customer Center) — configure the
   management options and survey copy.

## 3. API keys

Keys are read from the environment, with the current Apple key as the fallback:

```
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_...
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_...
```

These are public SDK keys and are meant to ship inside the binary. The secret
key (`sk_...`) and `REVENUECAT_WEBHOOK_SECRET` are server-side only.

### About the `test_` key

A `test_`-prefixed key targets the **RevenueCat Test Store**, which simulates
purchases without App Store Connect. Two constraints:

- It needs `react-native-purchases` **9.5.4 or newer**. This app is on 8.12.0,
  so a Test Store key does nothing until that major upgrade is done.
- It must never reach a release build. `resolveApiKey()` only returns it when
  `__DEV__` is true *and* `EXPO_PUBLIC_REVENUECAT_USE_TEST_STORE=1` is set.

For sandbox testing today, use a sandbox Apple ID with the real `appl_` key.

## 4. Webhook

`supabase/functions/revenuecat-webhook` mirrors entitlement state into
`public.user_subscriptions`, which is what `consume_ai_credit()` reads on the
server. Configure it under **Integrations → Webhooks**:

- URL: `https://<project>.functions.supabase.co/revenuecat-webhook`
- Authorization header: the value of `REVENUECAT_WEBHOOK_SECRET`

Its `PRO_ENTITLEMENT` constant is `strictlyfuel_pro` and must stay in step with
`src/config/monetization.ts` and the dashboard. If the three drift apart,
purchases succeed on device but nobody is ever marked Pro on the server.

## 5. How identity works

`Purchases.configure({ apiKey, appUserID })` is called with the Supabase user id
when a session already exists, and `Purchases.logIn(user.id)` runs on every
subsequent sign-in. The webhook keys off `app_user_id`, so without this the
backend has no way to map a purchase to a user.

## 6. Release checklist

- [ ] `EXPO_PUBLIC_REVENUECAT_USE_TEST_STORE` unset in the release build
- [ ] Entitlement `strictlyfuel_pro` exists and both products are attached
- [ ] Offering marked Current with `monthly` and `yearly` packages
- [ ] Webhook configured and returning 200
- [ ] Purchase tested end to end with a sandbox Apple ID on a real device
- [ ] Restore purchases tested on a second device
