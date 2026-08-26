import type { FuelFood } from "../types/fuel";

const food = (
  id: string,
  name: string,
  emoji: string,
  category: FuelFood["category"],
  carbSpeed: FuelFood["carbSpeed"],
  timing: string,
  defaultGrams: number,
  servingLabel: string,
  nutrition: [number, number, number, number, number],
  aliases: string[] = []
): FuelFood => ({
  id,
  name,
  emoji,
  category,
  carbSpeed,
  timing,
  defaultGrams,
  servingLabel,
  aliases,
  per100g: {
    calories: nutrition[0],
    carbs: nutrition[1],
    protein: nutrition[2],
    fat: nutrition[3],
    fiber: nutrition[4],
  },
  source: "usda",
});

// Practical starter catalog. Nutrient values are per 100 g and should be
// replaced by a package label when the user selects a branded product.
export const FUEL_FOODS: FuelFood[] = [
  food("banana", "Banana", "🍌", "fruit", "fast", "30–120 min", 118, "1 medium", [89, 22.8, 1.1, 0.3, 2.6], ["fruit"]),
  food("applesauce", "Unsweetened applesauce", "🥄", "fruit", "fast", "30–90 min", 122, "½ cup", [42, 11.3, 0.2, 0.1, 1.8], ["apple pouch"]),
  food("grapes", "Grapes", "🍇", "fruit", "fast", "30–90 min", 151, "1 cup", [69, 18.1, 0.7, 0.2, 0.9]),
  food("pineapple", "Pineapple", "🍍", "fruit", "fast", "30–90 min", 165, "1 cup", [50, 13.1, 0.5, 0.1, 1.4]),
  food("dates", "Medjool dates", "🌴", "fruit", "fast", "15–90 min", 48, "2 dates", [277, 75, 1.8, 0.2, 6.7], ["dried fruit"]),
  food("raisins", "Raisins", "🍇", "fruit", "fast", "15–90 min", 40, "¼ cup", [299, 79.2, 3.1, 0.5, 3.7]),
  food("apple", "Apple", "🍎", "fruit", "medium", "45–150 min", 182, "1 medium", [52, 13.8, 0.3, 0.2, 2.4]),
  food("orange", "Orange", "🍊", "fruit", "medium", "45–120 min", 131, "1 medium", [47, 11.8, 0.9, 0.1, 2.4]),
  food("mango", "Mango", "🥭", "fruit", "medium", "45–120 min", 165, "1 cup", [60, 15, 0.8, 0.4, 1.6]),
  food("white-rice", "Cooked white rice", "🍚", "grain", "medium", "60–180 min", 160, "1 cup", [130, 28.2, 2.7, 0.3, 0.4], ["rice"]),
  food("jasmine-rice", "Cooked jasmine rice", "🍚", "grain", "fast", "45–150 min", 160, "1 cup", [130, 31.8, 2.7, 0.3, 0.4]),
  food("brown-rice", "Cooked brown rice", "🍚", "grain", "slow", "120–240 min", 195, "1 cup", [123, 25.6, 2.7, 1, 1.6]),
  food("white-pasta", "Cooked white pasta", "🍝", "grain", "medium", "90–240 min", 140, "1 cup", [158, 30.9, 5.8, 0.9, 1.8], ["spaghetti"]),
  food("potato", "Boiled white potato", "🥔", "grain", "medium", "60–180 min", 170, "1 medium", [87, 20.1, 1.9, 0.1, 1.8]),
  food("sweet-potato", "Cooked sweet potato", "🍠", "grain", "slow", "90–240 min", 180, "1 medium", [90, 20.7, 2, 0.2, 3.3]),
  food("oats", "Cooked rolled oats", "🥣", "grain", "slow", "90–240 min", 234, "1 cup", [71, 12, 2.5, 1.5, 1.7], ["oatmeal"]),
  food("quinoa", "Cooked quinoa", "🥣", "grain", "slow", "120–240 min", 185, "1 cup", [120, 21.3, 4.4, 1.9, 2.8]),
  food("bagel", "Plain bagel", "🥯", "bread", "medium", "60–180 min", 95, "1 medium", [250, 50.5, 10, 1.5, 2.3]),
  food("white-bread", "White bread", "🍞", "bread", "fast", "30–120 min", 56, "2 slices", [266, 49.4, 8.9, 3.3, 2.7], ["toast"]),
  food("sourdough", "Sourdough bread", "🍞", "bread", "medium", "60–150 min", 76, "2 slices", [274, 49.7, 8.8, 3.4, 2.4], ["toast"]),
  food("rice-cakes", "Plain rice cakes", "◯", "bread", "fast", "15–90 min", 18, "2 cakes", [387, 81.5, 8, 2.8, 3.5]),
  food("low-fiber-cereal", "Low-fiber cereal", "🥣", "bread", "fast", "30–120 min", 45, "1½ cups", [357, 84, 7.5, 0.4, 3], ["corn flakes"]),
  food("honey", "Honey", "🍯", "sports", "fast", "15–60 min", 21, "1 tbsp", [304, 82.4, 0.3, 0, 0.2]),
  food("maple-syrup", "Maple syrup", "🍁", "sports", "fast", "15–60 min", 20, "1 tbsp", [260, 67, 0, 0, 0]),
  food("fruit-juice", "Fruit juice", "🧃", "sports", "fast", "15–60 min", 240, "8 fl oz", [45, 11, 0.7, 0.2, 0.2], ["orange juice", "apple juice"]),
  food("sports-drink", "Sports drink", "💧", "sports", "fast", "during or 15–60 min", 480, "16 fl oz", [24, 6, 0, 0, 0], ["electrolyte drink"]),
  food("carb-gel", "Carbohydrate gel", "⚡", "sports", "fast", "during or 15–30 min", 32, "1 gel", [260, 65, 0, 0, 0], ["energy gel"]),
  food("greek-yogurt", "Low-fat Greek yogurt", "🥛", "dairy", "medium", "60–180 min", 170, "1 cup", [73, 3.9, 9.9, 1.9, 0], ["yogurt"]),
  food("chicken", "Cooked chicken breast", "🍗", "protein", "slow", "90–240 min", 113, "4 oz", [165, 0, 31, 3.6, 0]),
  food("peanut-butter", "Peanut butter", "🥜", "fat", "slow", "120–240 min", 16, "1 tbsp", [588, 20, 25, 50, 6]),
];

export const foodById = (id: string) => FUEL_FOODS.find((item) => item.id === id);

export const searchFuelFoods = (query: string) => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return FUEL_FOODS.slice(0, 8);
  return FUEL_FOODS.filter((item) =>
    [item.name, ...item.aliases].some((value) => value.toLowerCase().includes(normalized))
  ).slice(0, 12);
};

