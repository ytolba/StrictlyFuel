# StrictlyFuel

StrictlyFuel is the athlete-focused sister app to Strictly. It keeps the same Expo, React Native, Firebase, authentication, and native iOS architecture as the original app while adding a performance nutrition workflow.

## Core flow

- **Fuel dashboard:** daily calorie and macro targets, active meal, and quick-add search.
- **Barcode and food lookup:** the existing Scan flow remains available from the barcode action and can be connected to nutrition data through the shared product service.
- **Meal builder:** foods can be added to a meal and totals are calculated for calories, carbohydrates, protein, and fat.
- **AI meal estimate:** a Firebase-backed OpenAI vision pipeline identifies visible foods, estimates cooked portions and hidden oils, returns calorie and macro ranges, checks calorie-to-macro consistency, and asks for portion details when scale is uncertain.
- **Human confirmation:** estimates are never silently logged. Athletes can answer the highest-value portion question, rerun the estimate with that context, and then confirm the meal.

## Run locally

Install dependencies, copy `.env.example` to `.env`, configure the Firebase and AI values, then run `npm start`.

The repository is intentionally independent from Strictly but shares its data and service boundaries so the two products can use the same Firebase project later.

## AI secret and deployment

The OpenAI key belongs in Firebase Functions secrets, not in the shipped app:

`firebase functions:secrets:set OPENAI_API_KEY`

Then deploy the callable function with `firebase deploy --only functions:analyzeMealPhoto`. The model defaults to `gpt-5.6-sol` for maximum image-analysis quality and can be overridden server-side with `OPENAI_MEAL_MODEL`.

Run deterministic checks with `npm test` inside `functions`. An optional live fixture runner is available at `functions/test/liveMealAnalysis.js` and requires a local `.env` key.
