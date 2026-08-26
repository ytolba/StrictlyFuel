# Strictly scoring rubric

Strictly Score is a product-quality heuristic. It is independent from **Fit for you**, which is calculated from the user's sensitivities, conditions, dietary patterns, and priorities.

## Calculation

- Ingredient quality starts at 96 and contributes 60% of the product score.
- Level of processing starts at 96 and contributes 40%.
- Each distinct matched ingredient tier applies its multiplier sequentially. This makes multiple high-concern signals compound instead of averaging away.
- Recognizable whole-food signals add a small positive adjustment; long labels receive a complexity deduction.
- Fit for you is reported separately and never changes Strictly Score.

| Tier | Quality multiplier | Processing multiplier | Examples |
| --- | ---: | ---: | --- |
| Critical concern | 0.35 | 0.55 | Partially hydrogenated oils/trans fat, brominated vegetable oil, potassium bromate |
| High concern | 0.58 | 0.70 | Artificial colors, high-fructose corn syrup, aspartame, sucralose, BHA/BHT/TBHQ, nitrites/nitrates |
| Moderate concern | 0.82 | 0.84 | Added sugars, maltodextrin, artificial flavor, modified starch, carrageenan, preservatives |
| Watch | 0.93 | 0.95 | Natural flavors, gums, soy lecithin |

The tiers are intentionally conservative ranking heuristics, not medical diagnoses or universal safety determinations. Each score flag exposes its evidence source in the app. Reference points include [FDA trans-fat guidance](https://www.fda.gov/food/food-additives-petitions/trans-fat), [FDA color-additive guidance](https://www.fda.gov/food/color-additives-information-consumers/color-additives-questions-and-answers-consumers), and [FDA added-sugars labeling guidance](https://www.fda.gov/food/food-labeling-nutrition/added-sugars-nutrition-facts-label).
