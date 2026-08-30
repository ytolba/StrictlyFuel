import type { FuelFood } from "../types/fuel";

const recoveryFood = (
  id: string,
  name: string,
  emoji: string,
  category: FuelFood["category"],
  defaultGrams: number,
  servingLabel: string,
  nutrition: [number, number, number, number, number],
  aliases: string[] = []
): FuelFood => ({
  id,
  name,
  aliases,
  emoji,
  category,
  carbSpeed: category === "grain" || category === "bread" ? "medium" : "slow",
  timing: "post-workout",
  defaultGrams,
  servingLabel,
  per100g: {
    calories: nutrition[0],
    carbs: nutrition[1],
    protein: nutrition[2],
    fat: nutrition[3],
    fiber: nutrition[4],
  },
  source: "usda",
  dataQualityScore: 86,
  isVerified: true,
});

/**
 * Familiar whole-food recovery anchors. Values are practical per-100 g
 * references for cooked foods; branded products should still use their label.
 */
export const POST_WORKOUT_FOODS: FuelFood[] = [
  recoveryFood("chicken-thigh", "Cooked skinless chicken thigh", "🍗", "protein", 142, "5 oz", [209, 0, 26, 10.9, 0], ["chicken thighs"]),
  recoveryFood("lean-ground-beef", "Cooked 90% lean ground beef", "🥩", "protein", 142, "5 oz", [254, 0, 26, 17, 0], ["ground beef", "minced beef"]),
  recoveryFood("sirloin-steak", "Cooked lean sirloin steak", "🥩", "protein", 142, "5 oz", [206, 0, 29, 8, 0], ["steak", "lean steak"]),
  recoveryFood("turkey-breast", "Cooked turkey breast", "🦃", "protein", 142, "5 oz", [135, 0, 30, 1, 0], ["turkey"]),
  recoveryFood("whole-eggs", "Whole eggs", "🍳", "protein", 100, "2 eggs", [155, 1.1, 12.6, 10.6, 0], ["eggs"]),
  recoveryFood("salmon", "Cooked salmon", "🐟", "protein", 142, "5 oz", [206, 0, 22, 12, 0], ["fish"]),
  recoveryFood("tuna", "Tuna in water, drained", "🐟", "protein", 120, "1 can", [116, 0, 25.5, 0.8, 0], ["canned tuna"]),
  recoveryFood("cottage-cheese", "Low-fat cottage cheese", "🥣", "dairy", 220, "1 cup", [82, 3.4, 11.1, 2.3, 0], ["cottage cheese"]),
  recoveryFood("firm-tofu", "Cooked firm tofu", "◻️", "protein", 170, "6 oz", [144, 2.8, 17.3, 8.7, 2.3], ["tofu"]),
  recoveryFood("black-beans", "Cooked black beans", "🫘", "protein", 172, "1 cup", [132, 23.7, 8.9, 0.5, 8.7], ["beans"]),
  recoveryFood("lentils", "Cooked lentils", "🫘", "protein", 198, "1 cup", [116, 20.1, 9, 0.4, 7.9]),
  recoveryFood("broccoli", "Roasted broccoli", "🥦", "vegetable", 120, "1 cup", [35, 7.2, 2.4, 0.4, 3.3]),
  recoveryFood("mixed-vegetables", "Roasted mixed vegetables", "🥕", "vegetable", 150, "1 cup", [65, 12, 3, 0.5, 4], ["vegetables", "roasted vegetables"]),
  recoveryFood("spinach", "Cooked spinach", "🥬", "vegetable", 90, "½ cup", [23, 3.6, 2.9, 0.4, 2.2]),
  recoveryFood("salsa", "Salsa", "🍅", "sauce", 60, "¼ cup", [36, 7, 1.5, 0.2, 1.8]),
  recoveryFood("tomato-sauce", "Tomato pasta sauce", "🍅", "sauce", 125, "½ cup", [54, 10, 1.7, 1.2, 2], ["marinara"]),
  recoveryFood("parmesan", "Parmesan cheese", "🧀", "dairy", 15, "2 tbsp", [431, 4.1, 38, 29, 0]),
  recoveryFood("avocado", "Avocado", "🥑", "fat", 75, "½ avocado", [160, 8.5, 2, 14.7, 6.7]),
  recoveryFood("olive-oil", "Olive oil", "🫒", "fat", 14, "1 tbsp", [884, 0, 0, 100, 0]),
  recoveryFood("corn-tortillas", "Corn tortillas", "🌮", "bread", 52, "2 tortillas", [218, 44.6, 5.7, 2.9, 6.3], ["tortilla", "tacos"]),
  recoveryFood("wholegrain-bread", "Whole-grain bread", "🍞", "bread", 80, "2 slices", [247, 41, 13, 4.2, 6.8], ["whole wheat bread", "toast"]),
];
