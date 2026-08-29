import { foodById } from "./fuelFoods";
import type { ActivityType, MealIngredient } from "../types/fuel";

export type CuratedMealTemplate = {
  id: string;
  name: string;
  description: string;
  ingredients: Array<{ foodId: string; grams: number }>;
  prepMinutes: number;
  instructions: string[];
  dietaryTags: string[];
  allergens: string[];
  idealTimingMinutes: number;
  timingWindow: [number, number];
  activityTypes: ActivityType[];
  minWorkoutMinutes: number;
};

const allTraining: ActivityType[] = ["running", "trail_running", "cycling", "indoor_cycling", "swimming", "strength", "strength_training", "bodybuilding", "crossfit", "hyrox", "soccer", "basketball", "triathlon", "rowing", "general_cardio", "mixed_training"];
const endurance: ActivityType[] = ["running", "trail_running", "cycling", "indoor_cycling", "mountain_biking", "swimming", "rowing", "triathlon", "sprint_triathlon", "olympic_triathlon", "ironman_70_3", "ironman", "brick_workout", "hyrox", "cross_country_skiing"];
const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const label = (foodId: string) => foodById(foodId)?.name.replace(/^Cooked /, "").replace(/^Low-fat /, "") || foodId.replace(/^strictly-/, "").replace(/-/g, " ");
const tagsFor = (ids: string[]) => {
  const dairy = ids.some((id) => /yogurt|milk|kefir/.test(id));
  return ["vegetarian", "halal", ...(!dairy ? ["vegan", "dairy-free"] : [])];
};
const allergensFor = (ids: string[]) => [
  ...(ids.some((id) => /bagel|bread|oats|oatmeal|cereal|pancake|waffle|pasta/.test(id)) ? ["gluten"] : []),
  ...(ids.some((id) => /yogurt|milk|kefir/.test(id)) ? ["dairy"] : []),
];
const template = (family: string, name: string, ingredients: Array<[string, number]>, idealTimingMinutes: number, prepMinutes: number, instructions: string[], activityTypes = allTraining, minWorkoutMinutes = 30): CuratedMealTemplate => {
  const ids = ingredients.map(([id]) => id);
  return { id: `strictly-${family}-${slug(name)}`, name, description: `A practical ${idealTimingMinutes}-minute pre-workout meal built from familiar foods.`, ingredients: ingredients.map(([foodId, grams]) => ({ foodId, grams })), prepMinutes, instructions, dietaryTags: tagsFor(ids), allergens: allergensFor(ids), idealTimingMinutes, timingWindow: [Math.max(20, idealTimingMinutes - 15), idealTimingMinutes + 15], activityTypes, minWorkoutMinutes };
};

const fruits: Array<[string, string, number]> = [
  ["banana", "Banana", 118], ["strictly-blueberries", "Blueberry", 100], ["strictly-strawberries", "Strawberry", 140], ["apple", "Apple Cinnamon", 140],
  ["mango", "Mango", 130], ["strictly-peach", "Peach", 140], ["pineapple", "Pineapple", 140], ["raisins", "Raisin", 35],
];
const breakfastFruits = fruits.filter(([id]) => ["banana", "strictly-blueberries", "strictly-strawberries", "apple", "strictly-peach", "raisins"].includes(id));
const creamOfRiceFruits = fruits.filter(([id]) => ["banana", "strictly-blueberries", "apple", "raisins"].includes(id));
const bagelFruits = fruits.filter(([id]) => ["banana", "strictly-blueberries", "strictly-strawberries", "apple"].includes(id));
const smoothieFruits = fruits.filter(([id]) => ["banana", "strictly-blueberries", "strictly-strawberries", "mango", "strictly-peach", "pineapple"].includes(id));
const sweeteners: Array<[string, string, number]> = [["honey", "Honey", 18], ["maple-syrup", "Maple", 22]];
const milks: Array<[string, string, number]> = [["strictly-skim-milk", "Skim Milk", 240], ["strictly-low-fat-milk", "Low-Fat Milk", 240], ["strictly-oat-milk", "Oat Milk", 240], ["strictly-rice-milk", "Rice Milk", 240]];

const oatmealMeals = ["oats", "strictly-instant-oatmeal"].flatMap((base) => breakfastFruits.flatMap(([fruitId, fruitName, fruitGrams]) => sweeteners.map(([sweetenerId, sweetenerName, sweetenerGrams]) =>
  template("oatmeal", `${fruitName} ${sweetenerName} ${base === "oats" ? "Oatmeal" : "Quick Oats"}`, [[base, base === "oats" ? 280 : 70], [fruitId, fruitGrams], [sweetenerId, sweetenerGrams]], 95, 7, ["Prepare the oats until soft.", `Top with ${fruitName.toLowerCase()} and ${sweetenerName.toLowerCase()}.`])
)));

const creamOfRiceMeals = creamOfRiceFruits.flatMap(([fruitId, fruitName, fruitGrams]) => sweeteners.map(([sweetenerId, sweetenerName, sweetenerGrams]) =>
  template("cream-rice", `${fruitName} ${sweetenerName} Cream of Rice`, [["strictly-cooked-cream-of-rice", 260], [fruitId, fruitGrams], [sweetenerId, sweetenerGrams]], 75, 8, ["Cook cream of rice until smooth.", `Stir in ${sweetenerName.toLowerCase()} and add ${fruitName.toLowerCase()}.`])
));

const breadMeals = [
  ...bagelFruits.map(([fruitId, fruitName, fruitGrams]) => template("bagel", `${fruitName} Honey Bagel`, [["bagel", 95], [fruitId, fruitGrams], ["honey", 18]], 75, 4, ["Toast the bagel if preferred.", "Have the fruit on the side and drizzle the bagel with honey."])),
  ...["white-bread", "sourdough"].flatMap((bread) => breakfastFruits.map(([fruitId, fruitName, fruitGrams]) => template("toast", `${fruitName} ${bread === "sourdough" ? "Honey Sourdough Toast" : "Honey Toast"}`, [[bread, bread === "sourdough" ? 76 : 56], [fruitId, fruitGrams], ["honey", 16]], 60, 4, ["Toast the bread.", "Serve with fruit and honey."]))),
  ...breakfastFruits.slice(0, 5).map(([fruitId, fruitName, fruitGrams]) => template("rice-cake", `${fruitName} Honey Rice Cakes`, [["rice-cakes", 27], [fruitId, fruitGrams], ["honey", 15]], 40, 3, ["Arrange rice cakes on a plate.", "Serve with the fruit and drizzle with honey."], allTraining, 20)),
];

const yogurtBowls = fruits.flatMap(([fruitId, fruitName, fruitGrams]) => sweeteners.map(([sweetenerId, sweetenerName, sweetenerGrams]) =>
  template("yogurt", `${fruitName} ${sweetenerName} Yogurt Bowl`, [["greek-yogurt", 170], ["strictly-granola", 55], [fruitId, fruitGrams], [sweetenerId, sweetenerGrams]], 105, 5, ["Add yogurt to a bowl.", "Top with granola, fruit, and sweetener."])
));

const cerealBowls = ["low-fiber-cereal", "strictly-corn-flakes", "strictly-rice-cereal", "strictly-crispy-rice-cereal"].flatMap((cereal) => milks.flatMap(([milkId, milkName, milkGrams]) => breakfastFruits.slice(0, 3).map(([fruitId, fruitName, fruitGrams]) =>
  template("cereal", `${fruitName} ${label(cereal)} with ${milkName}`, [[cereal, 55], [milkId, milkGrams], [fruitId, fruitGrams]], 60, 3, ["Add cereal and fruit to a bowl.", `Pour over ${milkName.toLowerCase()} just before eating.`])
)));

const riceBowls = [
  template("rice-bowl", "Chicken Jasmine Rice Bowl", [["jasmine-rice", 240], ["chicken", 90], ["pineapple", 100]], 150, 12, ["Warm the rice and chicken.", "Add pineapple on the side."], allTraining, 60),
  template("rice-bowl", "Simple Chicken and White Rice", [["white-rice", 260], ["chicken", 95]], 150, 10, ["Warm cooked rice and chicken.", "Season lightly to your tolerance."], allTraining, 60),
  template("rice-bowl", "Mango Jasmine Rice Bowl", [["jasmine-rice", 250], ["mango", 140]], 120, 7, ["Warm the rice.", "Top with fresh mango."], endurance, 60),
  template("rice-bowl", "Sweet Potato Rice Bowl", [["white-rice", 180], ["sweet-potato", 180], ["chicken", 80]], 180, 15, ["Warm all cooked ingredients.", "Keep added fat modest before training."], allTraining, 75),
];

const pastaMeals = [
  template("pasta", "Simple Chicken Pasta", [["white-pasta", 260], ["chicken", 90]], 165, 12, ["Toss warm pasta with chicken.", "Use a light, familiar sauce if desired."], endurance, 75),
  template("pasta", "Pre-Ride Pasta and Bread", [["white-pasta", 250], ["white-bread", 56], ["chicken", 80]], 180, 12, ["Warm the pasta and chicken.", "Serve with bread."], endurance, 90),
  template("pasta", "Light Pasta with Potato", [["white-pasta", 210], ["potato", 170]], 180, 14, ["Combine warm pasta and potato.", "Season simply."], endurance, 90),
];

const smoothies = milks.flatMap(([milkId, milkName, milkGrams]) => smoothieFruits.map(([fruitId, fruitName, fruitGrams]) =>
  template("smoothie", `${fruitName} ${milkName} Smoothie`, [[milkId, milkGrams], [fruitId, fruitGrams], ["honey", 18]], 45, 5, ["Blend until completely smooth.", "Drink slowly and confirm your own tolerance."], allTraining, 30)
));

const quickFuel = [
  template("quick", "Banana Honey Top-Up", [["banana", 118], ["honey", 21]], 25, 2, ["Slice the banana or eat it whole.", "Add honey alongside."], allTraining, 15),
  template("quick", "Dates and Sports Drink", [["dates", 48], ["sports-drink", 480]], 20, 1, ["Pack dates and a sports drink.", "Sip rather than chugging immediately before movement."], endurance, 45),
  template("quick", "Applesauce and Rice Cakes", [["applesauce", 122], ["rice-cakes", 27], ["honey", 12]], 30, 2, ["Serve applesauce with rice cakes.", "Add honey if more carbs are needed."], allTraining, 20),
  template("quick", "Banana and Fruit Juice", [["banana", 118], ["fruit-juice", 240]], 25, 1, ["Pair one banana with juice.", "Use the portion Strictly scales for your target."], allTraining, 20),
];

const griddleMeals = ["strictly-pancakes", "strictly-waffles"].flatMap((base) =>
  breakfastFruits.slice(0, 3).flatMap(([fruitId, fruitName, fruitGrams]) =>
    sweeteners.map(([sweetenerId, sweetenerName, sweetenerGrams]) =>
      template(
        "griddle",
        `${fruitName} ${sweetenerName} ${base === "strictly-pancakes" ? "Pancakes" : "Waffles"}`,
        [[base, 130], [fruitId, fruitGrams], [sweetenerId, sweetenerGrams]],
        105,
        8,
        ["Warm the pancakes or waffles.", `Serve with ${fruitName.toLowerCase()} and ${sweetenerName.toLowerCase()}.`],
        allTraining,
        45
      )
    )
  )
);

export const CURATED_MEAL_TEMPLATES: CuratedMealTemplate[] = [...oatmealMeals, ...creamOfRiceMeals, ...breadMeals, ...yogurtBowls, ...cerealBowls, ...riceBowls, ...pastaMeals, ...smoothies, ...griddleMeals, ...quickFuel];

export const ingredientsForTemplate = (meal: CuratedMealTemplate): MealIngredient[] => meal.ingredients.flatMap((item, index) => {
  const food = foodById(item.foodId);
  return food ? [{ id: `${meal.id}-${index}`, food, grams: item.grams }] : [];
});
