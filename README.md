# StrictlyFuel

StrictlyFuel is the athlete-focused sister app to Strictly. It keeps the same Expo, React Native, Firebase, authentication, and native iOS architecture as the original app while adding a performance nutrition workflow.

## Core flow

- **Fuel dashboard:** daily calorie and macro targets, active meal, and quick-add search.
- **Barcode and food lookup:** the existing Scan flow remains available from the barcode action and can be connected to nutrition data through the shared product service.
- **Meal builder:** foods can be added to a meal and totals are calculated for calories, carbohydrates, protein, and fat.
- **AI meal estimate:** the dashboard entry point is ready for the existing OpenAI pipeline to estimate macros from a meal photo, with a confirmation step before logging.

## Run locally

Install dependencies, copy `.env.example` to `.env`, configure the Firebase and AI values, then run `npm start`.

The repository is intentionally independent from Strictly but shares its data and service boundaries so the two products can use the same Firebase project later.
