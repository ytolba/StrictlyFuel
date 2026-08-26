export const extractIngredients = (text: string): string[] => {
  const ingredients: string[] = [];

  if (!text) {
    return ingredients;
  }

  // Preprocess the text (normalize whitespace and case)
  text = text
    .replace(/-\s*\n\s*/g, "") // Remove hyphens at the end of lines and join words
    .replace(/\n/g, " ") // Replace newlines with spaces
    .replace(/\s+/g, " ") // Collapse multiple spaces
    .toLowerCase(); // Convert text to lowercase

  // Attempt to locate the "ingredients" section
  const ingredientsMatch = /ingredients[:]?([\s\S]*?)(?:\.(?:\s|$)|$)/i;
  const match = text.match(ingredientsMatch);

  let ingredientsText = match && match[1] ? match[1] : "";

  // If no explicit "ingredients:" found, try a fallback approach
  if (!ingredientsText) {
    const endIndexOptions = [
      text.search(/nutrition facts/),
      text.search(/safe handling instructions/),
      text.search(/allergen information/),
      text.search(/serving size/),
      text.search(/contains/),
      text.search(/distributed by/),
      text.search(/manufactured by/),
    ].filter((index) => index !== -1);

    const firstEndIndex =
      endIndexOptions.length > 0 ? Math.min(...endIndexOptions) : -1;

    ingredientsText =
      firstEndIndex !== -1 ? text.substring(0, firstEndIndex) : text;
  }

  // Stop reading after encountering "does not contain" / "may contain", etc. (case-insensitive)
  const stopPhrases = ["does not contain", "may contain", "does NOT contain"];
  for (const phrase of stopPhrases) {
    const phraseIndex = ingredientsText
      .toLowerCase()
      .indexOf(phrase.toLowerCase());
    if (phraseIndex !== -1) {
      ingredientsText = ingredientsText.substring(0, phraseIndex);
      break;
    }
  }

  // Remove known non-ingredient phrases (case-insensitive whole-word matches)
  const nonIngredientPhrases: string[] = [
    // Handling instructions and safety
    "keep frozen",
    "safe handling instructions",
    "cooked thoroughly",
    "refrigerate after opening",
    "thaw in refrigerator",
    "wash hands",
    "keep separate",
    "keep hot foods hot",
    "refrigerate leftovers",
    "follow these instructions",
    "improperly cooked",
    "not a significant source",
    "best before",
    "expiry date",
    "not evaluated by the fda",
    "this product is not intended to diagnose",
    "best if",
    "front",
    "back",

    // Nutritional and serving data
    "nutrition facts",
    "calories",
    "daily value",
    "total fat",
    "cholesterol",
    "sodium",
    "carbohydrate",
    "protein",
    "calcium",
    "iron",
    "vitamin",
    "percent daily values",
    "serving size",
    "servings per container",
    "amount per serving",
    "serving",

    // Manufacturing and branding
    "distributed by",
    "manufactured by",
    "produced by",
    "inspected by",
    "net wt",
    ".com",

    // Allergens and legal
    "contains",
    "allergen information",
    "product of",
    "warning",
    "do not ingest",
    "store in a cool place",
    "consult your physician",
  ];

  nonIngredientPhrases.forEach((phrase) => {
    const phraseRegex = new RegExp(`\\b${phrase}\\b`, "gi");
    ingredientsText = ingredientsText.replace(phraseRegex, "");
  });

  // Remove percentages, then remove special characters EXCEPT letters, digits, parentheses, commas, hyphens, and spaces
  ingredientsText = ingredientsText
    .replace(/\d+%/g, "")
    .replace(/[^a-z0-9(),\-\s]/gi, "") // Preserve letters, digits, parentheses, commas, hyphens, and spaces
    .replace(/\s+/g, " ") // Collapse extra spaces
    .trim();

  // Split final text on commas, then clean up each piece
  ingredientsText.split(/,/).forEach((ingredient) => {
    const cleanIngredient = ingredient.trim();
    if (cleanIngredient && !nonIngredientPhrases.includes(cleanIngredient)) {
      ingredients.push(cleanIngredient);
    }
  });

  // Filter out overly short items (<= 2 chars) and ensure only valid characters remain
  return ingredients.filter(
    (ingredient) =>
      ingredient.length > 2 && /^[a-z0-9()\-\s]+$/i.test(ingredient) // Allow letters, digits, parentheses, hyphens, spaces
  );
};
