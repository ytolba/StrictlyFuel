begin;

with starter(source_product_id, name, category, tier, reason, calories, carbs, protein, fat, fiber, portion_label, portion_grams, aliases) as (
  values
    ('starter:banana', 'Banana', 'fruit', 'fast', 'Low-fat fruit commonly tolerated close to training.', 89, 22.8, 1.1, 0.3, 2.6, '1 medium', 118, array['fruit']),
    ('starter:applesauce', 'Unsweetened applesauce', 'fruit', 'fast', 'Soft texture and relatively low digestion burden.', 42, 11.3, 0.2, 0.1, 1.8, '1/2 cup', 122, array['apple pouch']),
    ('starter:grapes', 'Grapes', 'fruit', 'fast', 'High-water, lower-fiber fruit serving.', 69, 18.1, 0.7, 0.2, 0.9, '1 cup', 151, array[]::text[]),
    ('starter:pineapple', 'Pineapple', 'fruit', 'fast', 'High-water fruit with modest fiber per serving.', 50, 13.1, 0.5, 0.1, 1.4, '1 cup', 165, array[]::text[]),
    ('starter:dates', 'Medjool dates', 'fruit', 'fast', 'Concentrated carbohydrate in a small serving.', 277, 75, 1.8, 0.2, 6.7, '2 dates', 48, array['dried fruit']),
    ('starter:raisins', 'Raisins', 'fruit', 'fast', 'Concentrated carbohydrate in a small serving.', 299, 79.2, 3.1, 0.5, 3.7, '1/4 cup', 40, array['dried grapes']),
    ('starter:apple', 'Apple', 'fruit', 'medium', 'Whole-fruit structure and fiber can slow the meal slightly.', 52, 13.8, 0.3, 0.2, 2.4, '1 medium', 182, array[]::text[]),
    ('starter:orange', 'Orange', 'fruit', 'medium', 'Whole-fruit structure adds moderate digestion burden.', 47, 11.8, 0.9, 0.1, 2.4, '1 medium', 131, array[]::text[]),
    ('starter:mango', 'Mango', 'fruit', 'medium', 'Moderate whole-fruit structure with low fat.', 60, 15, 0.8, 0.4, 1.6, '1 cup', 165, array[]::text[]),
    ('starter:white-rice', 'Cooked white rice', 'grain', 'medium', 'Low-fiber starch appropriate across a broad pre-workout window.', 130, 28.2, 2.7, 0.3, 0.4, '1 cup', 160, array['rice']),
    ('starter:jasmine-rice', 'Cooked jasmine rice', 'grain', 'fast', 'Low-fiber starch with minimal fat.', 130, 31.8, 2.7, 0.3, 0.4, '1 cup', 160, array['white jasmine rice']),
    ('starter:brown-rice', 'Cooked brown rice', 'grain', 'slow', 'Whole-grain structure and additional fiber.', 123, 25.6, 2.7, 1, 1.6, '1 cup', 195, array['whole grain rice']),
    ('starter:white-pasta', 'Cooked white pasta', 'grain', 'medium', 'Moderate starch structure with relatively low fiber.', 158, 30.9, 5.8, 0.9, 1.8, '1 cup', 140, array['spaghetti']),
    ('starter:potato', 'Boiled white potato', 'grain', 'medium', 'Low-fat starch with moderate food structure.', 87, 20.1, 1.9, 0.1, 1.8, '1 medium', 170, array['white potato']),
    ('starter:sweet-potato', 'Cooked sweet potato', 'grain', 'slow', 'More fiber and food structure than refined starches.', 90, 20.7, 2, 0.2, 3.3, '1 medium', 180, array[]::text[]),
    ('starter:oats', 'Cooked rolled oats', 'grain', 'slow', 'Soluble fiber and intact grain structure increase digestion time.', 71, 12, 2.5, 1.5, 1.7, '1 cup', 234, array['oatmeal']),
    ('starter:quinoa', 'Cooked quinoa', 'grain', 'slow', 'Fiber, protein, and intact grain structure.', 120, 21.3, 4.4, 1.9, 2.8, '1 cup', 185, array[]::text[]),
    ('starter:bagel', 'Plain bagel', 'bread', 'medium', 'Dense refined starch with moderate food structure.', 250, 50.5, 10, 1.5, 2.3, '1 medium', 95, array[]::text[]),
    ('starter:white-bread', 'White bread', 'bread', 'fast', 'Refined, lower-fiber carbohydrate source.', 266, 49.4, 8.9, 3.3, 2.7, '2 slices', 56, array['toast']),
    ('starter:sourdough', 'Sourdough bread', 'bread', 'medium', 'Moderate bread structure suitable with some digestion time.', 274, 49.7, 8.8, 3.4, 2.4, '2 slices', 76, array['sourdough toast']),
    ('starter:rice-cakes', 'Plain rice cakes', 'bread', 'fast', 'Light, low-volume refined rice source.', 387, 81.5, 8, 2.8, 3.5, '2 cakes', 18, array['rice cake']),
    ('starter:low-fiber-cereal', 'Low-fiber cereal', 'bread', 'fast', 'Refined cereal designed for a lower-fiber meal.', 357, 84, 7.5, 0.4, 3, '1 1/2 cups', 45, array['corn flakes']),
    ('starter:honey', 'Honey', 'sports', 'fast', 'Concentrated carbohydrate with minimal fiber, fat, and protein.', 304, 82.4, 0.3, 0, 0.2, '1 tbsp', 21, array[]::text[]),
    ('starter:maple-syrup', 'Maple syrup', 'sports', 'fast', 'Concentrated liquid carbohydrate with minimal digestion burden.', 260, 67, 0, 0, 0, '1 tbsp', 20, array[]::text[]),
    ('starter:fruit-juice', 'Fruit juice', 'sports', 'fast', 'Liquid carbohydrate with little fiber.', 45, 11, 0.7, 0.2, 0.2, '8 fl oz', 240, array['orange juice','apple juice']),
    ('starter:sports-drink', 'Sports drink', 'sports', 'fast', 'Dilute liquid carbohydrate intended close to or during training.', 24, 6, 0, 0, 0, '16 fl oz', 480, array['electrolyte drink']),
    ('starter:carb-gel', 'Carbohydrate gel', 'sports', 'fast', 'Concentrated sports carbohydrate intended close to or during training.', 260, 65, 0, 0, 0, '1 gel', 32, array['energy gel']),
    ('starter:greek-yogurt', 'Low-fat Greek yogurt', 'dairy', 'medium', 'Protein and modest fat slow a mixed meal compared with isolated carbohydrate.', 73, 3.9, 9.9, 1.9, 0, '1 cup', 170, array['yogurt']),
    ('starter:chicken', 'Cooked chicken breast', 'protein', 'slow', 'Primarily protein rather than carbohydrate and adds digestion burden to a mixed meal.', 165, 0, 31, 3.6, 0, '4 oz', 113, array['chicken']),
    ('starter:peanut-butter', 'Peanut butter', 'fat', 'slow', 'High fat and some fiber increase digestion burden.', 588, 20, 25, 50, 6, '1 tbsp', 16, array['nut butter'])
), inserted as (
  insert into public.foods (
    source_id, source_product_id, name, category, carb_speed_tier_id, carb_speed_confidence,
    carb_speed_reason, calories_per_100g, carbs_per_100g, protein_per_100g,
    fat_per_100g, fiber_per_100g, data_quality_score, is_verified
  )
  select 'strictly', source_product_id, name, category, tier, 82, reason,
         calories, carbs, protein, fat, fiber, 82, true
  from starter
  on conflict (source_id, source_product_id) do update set
    name = excluded.name,
    category = excluded.category,
    carb_speed_tier_id = excluded.carb_speed_tier_id,
    carb_speed_reason = excluded.carb_speed_reason,
    calories_per_100g = excluded.calories_per_100g,
    carbs_per_100g = excluded.carbs_per_100g,
    protein_per_100g = excluded.protein_per_100g,
    fat_per_100g = excluded.fat_per_100g,
    fiber_per_100g = excluded.fiber_per_100g,
    updated_at = now()
  returning id, source_product_id
)
insert into public.food_portions (food_id, label, amount, unit, gram_weight, is_default, source_description)
select i.id, s.portion_label, 1, 'serving', s.portion_grams, true, 'StrictlyFuel starter portion'
from inserted i join starter s using (source_product_id)
on conflict (food_id, label, amount, unit) do update set gram_weight = excluded.gram_weight, is_default = true;

with starter_aliases as (
  select f.id as food_id, unnest(s.aliases) as alias
  from public.foods f
  join (values
    ('starter:banana', array['fruit']), ('starter:applesauce', array['apple pouch']),
    ('starter:dates', array['dried fruit']), ('starter:raisins', array['dried grapes']),
    ('starter:white-rice', array['rice']), ('starter:jasmine-rice', array['white jasmine rice']),
    ('starter:brown-rice', array['whole grain rice']), ('starter:white-pasta', array['spaghetti']),
    ('starter:potato', array['white potato']), ('starter:oats', array['oatmeal']),
    ('starter:white-bread', array['toast']), ('starter:sourdough', array['sourdough toast']),
    ('starter:rice-cakes', array['rice cake']), ('starter:low-fiber-cereal', array['corn flakes']),
    ('starter:fruit-juice', array['orange juice','apple juice']), ('starter:sports-drink', array['electrolyte drink']),
    ('starter:carb-gel', array['energy gel']), ('starter:greek-yogurt', array['yogurt']),
    ('starter:chicken', array['chicken']), ('starter:peanut-butter', array['nut butter'])
  ) as s(source_product_id, aliases) on s.source_product_id = f.source_product_id
  where f.source_id = 'strictly'
)
insert into public.food_aliases (food_id, alias)
select food_id, alias from starter_aliases
on conflict (food_id, alias) do nothing;

commit;
