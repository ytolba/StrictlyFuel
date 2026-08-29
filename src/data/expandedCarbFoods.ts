import type { CarbSpeed, FuelFood } from "../types/fuel";

type Group = {
  key: string;
  names: string[];
  category: FuelFood["category"];
  speed: CarbSpeed;
  timing: string;
  grams: number;
  serving: string;
  nutrition: [number, number, number, number, number];
  emoji: string;
};

// A broad, offline-first reference library for meal planning. Values are
// practical per-100g references for the food family. Branded package labels
// and verified database records replace these estimates when available.
const GROUPS: Group[] = [
  {
    key: "fresh-light-fruit", category: "fruit", speed: "fast", timing: "30–120 min", grams: 150, serving: "1 cup or 1 medium", nutrition: [52, 13.5, 0.7, 0.2, 1.8], emoji: "🍓",
    names: ["Strawberries", "Blueberries", "Raspberries", "Blackberries", "Watermelon", "Cantaloupe", "Honeydew melon", "Peach", "Nectarine", "Plum", "Apricot", "Kiwi", "Papaya", "Guava", "Dragon fruit", "Starfruit", "Persimmon", "Clementine", "Tangerine", "Mandarin orange", "Grapefruit", "Pomegranate arils", "Cherries", "Lychee", "Passion fruit"],
  },
  {
    key: "fresh-carb-fruit", category: "fruit", speed: "medium", timing: "45–150 min", grams: 165, serving: "1 cup or 1 medium", nutrition: [72, 18.5, 0.8, 0.3, 2.5], emoji: "🍐",
    names: ["Pear", "Asian pear", "Plantain", "Fresh figs", "Green apple", "Gala apple", "Fuji apple", "Honeycrisp apple", "Granny Smith apple", "Ataulfo mango", "Red mango", "Jackfruit", "Breadfruit", "Cherimoya", "Sapodilla", "Fresh coconut water fruit", "Prickly pear", "Mulberries", "Gooseberries", "Currants", "Cranberries", "Kumquat", "Blood orange", "Cara Cara orange", "Jujube fruit"],
  },
  {
    key: "dried-fruit", category: "fruit", speed: "fast", timing: "15–90 min", grams: 40, serving: "¼ cup", nutrition: [285, 72, 2.5, 0.6, 6], emoji: "◐",
    names: ["Dried apricots", "Dried mango", "Dried pineapple", "Dried cranberries", "Dried cherries", "Dried blueberries", "Dried figs", "Dried dates", "Dried apple rings", "Dried pears", "Prunes", "Golden raisins", "Sultanas", "Currants dried", "Dried papaya", "Dried peaches", "Dried mulberries", "Dried goji berries", "Fruit leather", "Freeze-dried strawberries"],
  },
  {
    key: "cooked-grains", category: "grain", speed: "medium", timing: "60–210 min", grams: 170, serving: "1 cup cooked", nutrition: [125, 26, 3.5, 1, 2], emoji: "🍚",
    names: ["Cooked basmati rice", "Cooked sushi rice", "Cooked arborio rice", "Cooked parboiled rice", "Cooked wild rice", "Cooked red rice", "Cooked black rice", "Cooked sticky rice", "Cooked rice noodles", "Cooked udon noodles", "Cooked soba noodles", "Cooked egg noodles", "Cooked couscous", "Cooked pearl couscous", "Cooked bulgur", "Cooked barley", "Cooked farro", "Cooked millet", "Cooked amaranth", "Cooked buckwheat", "Cooked polenta", "Cooked grits", "Cooked cream of rice", "Cooked cream of wheat", "Cooked semolina", "Cooked orzo", "Cooked gnocchi", "Cooked ramen noodles", "Cooked vermicelli", "Cooked glass noodles"],
  },
  {
    key: "bread-products", category: "bread", speed: "medium", timing: "45–180 min", grams: 65, serving: "1 piece or 2 slices", nutrition: [270, 52, 9, 3.5, 3], emoji: "🍞",
    names: ["French bread", "Italian bread", "Ciabatta", "Brioche", "Challah", "Pita bread", "Naan bread", "Lavash", "Flour tortilla", "Corn tortilla", "English muffin", "Kaiser roll", "Dinner roll", "Hoagie roll", "Hamburger bun", "Hot dog bun", "Pretzel roll", "Plain pretzel", "Saltine crackers", "Water crackers", "Matzo", "Melba toast", "Crumpet", "Pancakes", "Waffles"],
  },
  {
    key: "starchy-vegetables", category: "grain", speed: "medium", timing: "60–210 min", grams: 180, serving: "1 cup cooked", nutrition: [105, 24, 2.2, 0.4, 3.2], emoji: "🥔",
    names: ["Baked russet potato", "Mashed potato", "Roasted potato", "Fingerling potatoes", "Red potatoes", "Yukon gold potatoes", "Purple potatoes", "Sweet potato mash", "Japanese sweet potato", "Purple sweet potato", "Yams", "Cassava", "Yuca", "Taro root", "Malanga", "Green plantain", "Ripe plantain", "Butternut squash", "Acorn squash", "Kabocha squash", "Delicata squash", "Corn kernels", "Corn on the cob", "Green peas", "Parsnips"],
  },
  {
    key: "legumes", category: "grain", speed: "slow", timing: "120–240 min", grams: 170, serving: "1 cup cooked", nutrition: [128, 22, 8.5, 1, 7.5], emoji: "🫘",
    names: ["Black beans", "Pinto beans", "Kidney beans", "Navy beans", "Cannellini beans", "Great northern beans", "Lima beans", "Adzuki beans", "Mung beans", "Chickpeas", "Green lentils", "Brown lentils", "Red lentils", "Black lentils", "Split peas", "Black-eyed peas", "Edamame", "Refried beans", "Baked beans", "White bean puree"],
  },
  {
    key: "cereal-snacks", category: "bread", speed: "fast", timing: "30–120 min", grams: 45, serving: "1 serving", nutrition: [375, 78, 7, 4, 3.5], emoji: "🥣",
    names: ["Corn flakes", "Rice cereal", "Puffed rice cereal", "Crispy rice cereal", "Chex rice cereal", "Chex corn cereal", "Bran flakes", "Granola", "Muesli", "Instant oatmeal", "Quick oats", "Overnight oats", "Rice crackers", "Pretzel sticks", "Animal crackers", "Graham crackers", "Fig bars", "Cereal bar", "Granola bar", "Oat bar", "Rice crispy treat", "Popcorn air-popped", "Baked tortilla chips", "Baked pita chips", "Trail mix with dried fruit"],
  },
  {
    key: "sports-carbs", category: "sports", speed: "fast", timing: "During or 0–60 min", grams: 35, serving: "1 serving", nutrition: [280, 70, 0.5, 0.2, 0.3], emoji: "⚡",
    names: ["Maltodextrin drink mix", "Dextrose drink mix", "Glucose powder", "Fructose powder", "Glucose-fructose drink", "Carbohydrate chew", "Energy chews", "Sports gummies", "Energy waffle", "Sports stroopwafel", "Carb powder", "Isotonic gel", "Hydrogel carbohydrate", "Maple energy gel", "Honey energy packet", "Rice syrup packet", "Electrolyte carb mix", "High-carb drink mix", "Liquid carbohydrate shot", "Sports jelly beans", "Banana puree pouch", "Apple puree pouch", "Fruit smoothie pouch", "Rice ball", "Salted rice cake"],
  },
  {
    key: "dairy-carbs", category: "dairy", speed: "medium", timing: "60–180 min", grams: 200, serving: "1 cup", nutrition: [82, 11, 6.2, 1.8, 0], emoji: "🥛",
    names: ["Skim milk", "Low-fat milk", "Lactose-free milk", "Chocolate milk", "Kefir", "Drinkable yogurt", "Plain yogurt", "Vanilla yogurt", "Icelandic yogurt", "Low-fat cottage cheese with fruit", "Soy milk", "Oat milk", "Rice milk", "Pea milk", "Fruit yogurt smoothie"],
  },
];

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const EXPANDED_CARB_FOODS: FuelFood[] = GROUPS.flatMap((group) => group.names.map((name) => ({
  id: `strictly-${slug(name)}`,
  name,
  aliases: [group.key.replace(/-/g, " ")],
  emoji: group.emoji,
  category: group.category,
  carbSpeed: group.speed,
  timing: group.timing,
  defaultGrams: group.grams,
  servingLabel: group.serving,
  per100g: { calories: group.nutrition[0], carbs: group.nutrition[1], protein: group.nutrition[2], fat: group.nutrition[3], fiber: group.nutrition[4] },
  source: "strictly" as const,
})));
