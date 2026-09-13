begin;

-- A small set of complete, recognizable meals is kept ahead of the larger
-- combinatorial catalog. The app can still scale portions, but the recipe
-- itself always remains something a person would reasonably make and eat.

with missing_foods(source_product_id, name, category, tier, calories, carbs, protein, fat, fiber) as (
  values
    ('library:overnight-oats','Overnight oats','grain','slow',375,68,13,7,10),
    ('library:english-muffin','English muffin','bread','medium',270,52,9,3.5,3),
    ('library:plain-pretzel','Plain pretzel','bread','medium',270,52,9,3.5,3),
    ('library:cooked-couscous','Cooked couscous','grain','medium',125,26,3.5,1,2),
    ('library:pita-bread','Pita bread','bread','medium',270,52,9,3.5,3),
    ('library:cooked-rice-noodles','Cooked rice noodles','grain','medium',125,26,3.5,1,2),
    ('library:chocolate-milk','Chocolate milk','dairy','medium',82,11,6.2,1.8,0)
)
insert into public.foods (
  source_id, source_product_id, name, category, carb_speed_tier_id,
  carb_speed_confidence, carb_speed_reason, calories_per_100g, carbs_per_100g,
  protein_per_100g, fat_per_100g, fiber_per_100g, data_quality_score, is_verified
)
select 'strictly', source_product_id, name, category, tier, 76,
  'Curated meal-library reference; prefer a verified label for branded products.',
  calories, carbs, protein, fat, fiber, 78, true
from missing_foods
on conflict (source_id, source_product_id) do update set
  name=excluded.name, category=excluded.category,
  carb_speed_tier_id=excluded.carb_speed_tier_id,
  calories_per_100g=excluded.calories_per_100g,
  carbs_per_100g=excluded.carbs_per_100g,
  protein_per_100g=excluded.protein_per_100g,
  fat_per_100g=excluded.fat_per_100g,
  fiber_per_100g=excluded.fiber_per_100g,
  is_verified=true, updated_at=now();

with recipes as (
  select * from jsonb_to_recordset($pre$[
    {"slug":"strictly-featured-banana-berry-overnight-oats","name":"Banana Berry Overnight Oats","description":"Overnight oats, yogurt, banana, blueberries, and honey in one familiar breakfast.","ingredients":[{"foodId":"strictly-overnight-oats","grams":220},{"foodId":"greek-yogurt","grams":120},{"foodId":"banana","grams":118},{"foodId":"strictly-blueberries","grams":80},{"foodId":"honey","grams":15}],"instructions":["Stir the oats and yogurt together the night before.","Top with banana, blueberries, and honey before eating."],"prep":5,"ideal":135,"low":120,"high":150,"minimum":45,"tags":["vegetarian","halal"],"allergens":["gluten","dairy"]},
    {"slug":"strictly-featured-banana-yogurt-oat-bowl","name":"Banana Yogurt Oat Bowl","description":"Warm oats with yogurt, banana, and honey.","ingredients":[{"foodId":"oats","grams":260},{"foodId":"greek-yogurt","grams":150},{"foodId":"banana","grams":118},{"foodId":"honey","grams":15}],"instructions":["Prepare the oats until soft.","Add yogurt, sliced banana, and honey."],"prep":8,"ideal":120,"low":105,"high":135,"minimum":45,"tags":["vegetarian","halal"],"allergens":["gluten","dairy"]},
    {"slug":"strictly-featured-eggs-toast-and-banana-breakfast","name":"Eggs, Toast and Banana Breakfast","description":"Eggs and toast with banana and a small glass of juice.","ingredients":[{"foodId":"whole-eggs","grams":100},{"foodId":"white-bread","grams":84},{"foodId":"banana","grams":118},{"foodId":"fruit-juice","grams":180}],"instructions":["Cook the eggs and toast the bread.","Serve with banana and a small glass of juice."],"prep":10,"ideal":150,"low":135,"high":165,"minimum":60,"tags":["vegetarian","halal","dairy-free"],"allergens":["eggs","gluten"]},
    {"slug":"strictly-featured-egg-and-rice-breakfast-bowl","name":"Egg and Rice Breakfast Bowl","description":"Eggs over jasmine rice with spinach and salsa.","ingredients":[{"foodId":"whole-eggs","grams":100},{"foodId":"jasmine-rice","grams":240},{"foodId":"spinach","grams":45},{"foodId":"salsa","grams":40}],"instructions":["Warm the rice and spinach.","Top with cooked eggs and salsa."],"prep":12,"ideal":150,"low":135,"high":165,"minimum":60,"tags":["vegetarian","halal","dairy-free","gluten-free"],"allergens":["eggs"]},
    {"slug":"strictly-featured-chicken-rice-and-pineapple-bowl","name":"Chicken Rice and Pineapple Bowl","description":"A light chicken and jasmine-rice bowl with pineapple.","ingredients":[{"foodId":"chicken","grams":90},{"foodId":"jasmine-rice","grams":260},{"foodId":"pineapple","grams":120}],"instructions":["Warm the chicken and rice.","Serve with pineapple and keep added fat light."],"prep":12,"ideal":165,"low":150,"high":180,"minimum":75,"tags":["halal","dairy-free","gluten-free"],"allergens":[]},
    {"slug":"strictly-featured-turkey-rice-and-orange-plate","name":"Turkey Rice and Orange Plate","description":"Turkey and white rice with a fresh orange on the side.","ingredients":[{"foodId":"turkey-breast","grams":90},{"foodId":"white-rice","grams":260},{"foodId":"orange","grams":131}],"instructions":["Warm the turkey and rice.","Serve with the orange on the side."],"prep":12,"ideal":165,"low":150,"high":180,"minimum":60,"tags":["halal","dairy-free","gluten-free"],"allergens":[]},
    {"slug":"strictly-featured-chicken-marinara-pasta","name":"Chicken Marinara Pasta","description":"Chicken and pasta tossed with a light tomato sauce.","ingredients":[{"foodId":"chicken","grams":90},{"foodId":"white-pasta","grams":260},{"foodId":"tomato-sauce","grams":100}],"instructions":["Warm the chicken and tomato sauce.","Toss with pasta and season simply."],"prep":15,"ideal":180,"low":165,"high":195,"minimum":75,"tags":["halal","dairy-free"],"allergens":["gluten"]},
    {"slug":"strictly-featured-berry-pancake-yogurt-plate","name":"Berry Pancake Yogurt Plate","description":"Pancakes with yogurt, strawberries, and maple syrup.","ingredients":[{"foodId":"strictly-pancakes","grams":130},{"foodId":"greek-yogurt","grams":120},{"foodId":"strictly-strawberries","grams":120},{"foodId":"maple-syrup","grams":18}],"instructions":["Warm the pancakes.","Serve with yogurt, strawberries, and maple syrup."],"prep":10,"ideal":135,"low":120,"high":150,"minimum":45,"tags":["vegetarian","halal"],"allergens":["gluten","dairy"]},
    {"slug":"strictly-featured-banana-waffle-yogurt-plate","name":"Banana Waffle Yogurt Plate","description":"Waffles with yogurt, banana, and maple syrup.","ingredients":[{"foodId":"strictly-waffles","grams":130},{"foodId":"greek-yogurt","grams":120},{"foodId":"banana","grams":118},{"foodId":"maple-syrup","grams":18}],"instructions":["Warm the waffles.","Serve with yogurt, banana, and maple syrup."],"prep":10,"ideal":135,"low":120,"high":150,"minimum":45,"tags":["vegetarian","halal"],"allergens":["gluten","dairy"]},
    {"slug":"strictly-featured-english-muffin-banana-and-honey","name":"English Muffin, Banana and Honey","description":"A toasted English muffin with honey, banana, and juice.","ingredients":[{"foodId":"strictly-english-muffin","grams":65},{"foodId":"banana","grams":118},{"foodId":"honey","grams":18},{"foodId":"fruit-juice","grams":180}],"instructions":["Toast the English muffin and add honey.","Serve with banana and juice."],"prep":4,"ideal":75,"low":60,"high":90,"minimum":30,"tags":["vegetarian","halal","vegan","dairy-free"],"allergens":["gluten"]},
    {"slug":"strictly-featured-bagel-yogurt-and-banana","name":"Bagel, Yogurt and Banana","description":"A plain bagel with yogurt, banana, and honey.","ingredients":[{"foodId":"bagel","grams":95},{"foodId":"greek-yogurt","grams":120},{"foodId":"banana","grams":118},{"foodId":"honey","grams":12}],"instructions":["Toast the bagel if preferred.","Serve with yogurt, banana, and honey."],"prep":5,"ideal":105,"low":90,"high":120,"minimum":45,"tags":["vegetarian","halal"],"allergens":["gluten","dairy"]},
    {"slug":"strictly-featured-pretzel-banana-and-applesauce-snack","name":"Pretzel, Banana and Applesauce Snack","description":"A light pretzel, banana, and applesauce snack for shorter digestion windows.","ingredients":[{"foodId":"strictly-plain-pretzel","grams":65},{"foodId":"banana","grams":118},{"foodId":"applesauce","grams":122}],"instructions":["Portion the pretzel and applesauce.","Eat with the banana as a light pre-workout snack."],"prep":2,"ideal":45,"low":30,"high":60,"minimum":30,"tags":["vegetarian","halal","vegan","dairy-free"],"allergens":["gluten"]}
  ]$pre$::jsonb) as r(slug text,name text,description text,ingredients jsonb,instructions jsonb,prep integer,ideal integer,low integer,high integer,minimum integer,tags jsonb,allergens jsonb)
)
insert into public.meal_templates (
  slug,name,description,prep_minutes,instructions,dietary_tags,allergens,activity_types,
  ideal_timing_minutes,timing_low_minutes,timing_high_minutes,min_workout_minutes,
  ingredient_blueprint,is_verified,purpose
)
select slug,name,description,prep,
  array(select jsonb_array_elements_text(instructions)),
  array(select jsonb_array_elements_text(tags)),
  array(select jsonb_array_elements_text(allergens)),
  array['running','trail_running','cycling','indoor_cycling','swimming','rowing','triathlon','strength','strength_training','bodybuilding','crossfit','hyrox','soccer','basketball','general_cardio','mixed_training']::text[],
  ideal,low,high,minimum,ingredients,true,'pre_workout'
from recipes
on conflict (slug) do update set
  name=excluded.name,description=excluded.description,prep_minutes=excluded.prep_minutes,
  instructions=excluded.instructions,dietary_tags=excluded.dietary_tags,allergens=excluded.allergens,
  activity_types=excluded.activity_types,ideal_timing_minutes=excluded.ideal_timing_minutes,
  timing_low_minutes=excluded.timing_low_minutes,timing_high_minutes=excluded.timing_high_minutes,
  min_workout_minutes=excluded.min_workout_minutes,ingredient_blueprint=excluded.ingredient_blueprint,
  is_verified=true,purpose='pre_workout',updated_at=now();

with recipes as (
  select * from jsonb_to_recordset($post$[
    {"slug":"strictly-post-chicken-couscous-bowl","name":"Chicken Couscous Bowl","description":"Chicken breast, couscous, roasted vegetables, spinach, and olive oil.","ingredients":[{"foodId":"chicken","grams":142,"role":"protein","scalable":true,"minGrams":85,"maxGrams":227,"incrementGrams":28},{"foodId":"strictly-cooked-couscous","grams":280,"role":"carb","scalable":true,"minGrams":170,"maxGrams":480,"incrementGrams":45},{"foodId":"mixed-vegetables","grams":150,"role":"produce"},{"foodId":"spinach","grams":60,"role":"produce"},{"foodId":"olive-oil","grams":8,"role":"fat"}],"instructions":["Warm the chicken, couscous, and vegetables.","Add spinach and finish with olive oil and seasoning."],"prep":20,"difficulty":"easy","cuisine":"Mediterranean","mealType":"lunch","tags":["halal","dairy-free"],"allergens":["gluten"],"categories":["post_workout_standard","post_workout_high_demand","post_workout_rapid_recovery"],"carb":"strictly-cooked-couscous","protein":"chicken"},
    {"slug":"strictly-post-salmon-couscous-bowl","name":"Salmon Couscous Bowl","description":"Salmon with couscous, spinach, roasted vegetables, and olive oil.","ingredients":[{"foodId":"salmon","grams":142,"role":"protein","scalable":true,"minGrams":113,"maxGrams":200,"incrementGrams":28},{"foodId":"strictly-cooked-couscous","grams":280,"role":"carb","scalable":true,"minGrams":170,"maxGrams":480,"incrementGrams":45},{"foodId":"spinach","grams":90,"role":"produce"},{"foodId":"mixed-vegetables","grams":120,"role":"produce"},{"foodId":"olive-oil","grams":8,"role":"fat"}],"instructions":["Warm the couscous and vegetables.","Add cooked salmon and finish with olive oil."],"prep":24,"difficulty":"moderate","cuisine":"Mediterranean","mealType":"dinner","tags":["pescatarian","halal","dairy-free"],"allergens":["fish","gluten"],"categories":["post_workout_standard","post_workout_high_demand"],"carb":"strictly-cooked-couscous","protein":"salmon"},
    {"slug":"strictly-post-turkey-pita-recovery-plate","name":"Turkey Pita Recovery Plate","description":"Warm pita with turkey, rice, spinach, salsa, and yogurt.","ingredients":[{"foodId":"turkey-breast","grams":142,"role":"protein","scalable":true,"minGrams":85,"maxGrams":227,"incrementGrams":28},{"foodId":"strictly-pita-bread","grams":100,"role":"carb","scalable":true,"minGrams":65,"maxGrams":180,"incrementGrams":30},{"foodId":"white-rice","grams":160,"role":"topping"},{"foodId":"spinach","grams":45,"role":"produce"},{"foodId":"salsa","grams":60,"role":"topping"},{"foodId":"greek-yogurt","grams":120,"role":"topping"}],"instructions":["Fill the warm pita with turkey, spinach, and salsa.","Serve with rice and yogurt."],"prep":12,"difficulty":"easy","cuisine":"Mediterranean","mealType":"lunch","tags":["halal"],"allergens":["gluten","dairy"],"categories":["post_workout_standard","post_workout_high_demand","post_workout_rapid_recovery"],"carb":"strictly-pita-bread","protein":"turkey-breast"},
    {"slug":"strictly-post-tuna-sandwich-recovery","name":"Tuna Sandwich, Fruit & Yogurt","description":"A tuna and spinach sandwich with apple and Greek yogurt.","ingredients":[{"foodId":"tuna","grams":120,"role":"protein","scalable":true,"minGrams":90,"maxGrams":180,"incrementGrams":30},{"foodId":"wholegrain-bread","grams":120,"role":"carb","scalable":true,"minGrams":80,"maxGrams":200,"incrementGrams":40},{"foodId":"spinach","grams":45,"role":"produce"},{"foodId":"apple","grams":182,"role":"produce"},{"foodId":"greek-yogurt","grams":150,"role":"topping"}],"instructions":["Build the sandwich with tuna and spinach.","Serve with the apple and yogurt."],"prep":8,"difficulty":"easy","cuisine":"American","mealType":"lunch","tags":["pescatarian","halal"],"allergens":["fish","gluten","dairy"],"categories":["post_workout_light","post_workout_standard","post_workout_high_demand"],"carb":"wholegrain-bread","protein":"tuna"},
    {"slug":"strictly-post-breakfast-burrito-rice","name":"Egg & Rice Breakfast Burrito","description":"Eggs, rice, black beans, spinach, and salsa in warm tortillas.","ingredients":[{"foodId":"whole-eggs","grams":150,"role":"protein","scalable":true,"minGrams":100,"maxGrams":250,"incrementGrams":50},{"foodId":"white-rice","grams":200,"role":"carb","scalable":true,"minGrams":120,"maxGrams":400,"incrementGrams":40},{"foodId":"black-beans","grams":80,"role":"topping"},{"foodId":"corn-tortillas","grams":78,"role":"topping"},{"foodId":"spinach","grams":45,"role":"produce"},{"foodId":"salsa","grams":60,"role":"topping"}],"instructions":["Warm the rice, beans, and tortillas.","Fill with cooked eggs, spinach, and salsa."],"prep":18,"difficulty":"easy","cuisine":"Mexican-inspired","mealType":"breakfast","tags":["vegetarian","halal","dairy-free","gluten-free"],"allergens":["eggs"],"categories":["post_workout_standard","post_workout_high_demand"],"carb":"white-rice","protein":"whole-eggs"},
    {"slug":"strictly-post-beef-potato-egg-hash","name":"Beef, Egg & Potato Hash","description":"Lean beef, eggs, roasted potatoes, spinach, and salsa.","ingredients":[{"foodId":"lean-ground-beef","grams":120,"role":"protein","scalable":true,"minGrams":85,"maxGrams":180,"incrementGrams":20},{"foodId":"potato","grams":350,"role":"carb","scalable":true,"minGrams":200,"maxGrams":650,"incrementGrams":50},{"foodId":"whole-eggs","grams":100,"role":"topping"},{"foodId":"spinach","grams":90,"role":"produce"},{"foodId":"salsa","grams":60,"role":"topping"}],"instructions":["Brown the beef and warm the potatoes in a skillet.","Add spinach and cooked eggs, then finish with salsa."],"prep":25,"difficulty":"moderate","cuisine":"Breakfast","mealType":"breakfast","tags":["halal","dairy-free","gluten-free"],"allergens":["eggs"],"categories":["post_workout_standard","post_workout_high_demand"],"carb":"potato","protein":"lean-ground-beef"},
    {"slug":"strictly-post-chicken-rice-noodle-bowl","name":"Chicken Rice Noodle Bowl","description":"Chicken, rice noodles, spinach, and vegetables in a simple bowl.","ingredients":[{"foodId":"chicken","grams":142,"role":"protein","scalable":true,"minGrams":85,"maxGrams":227,"incrementGrams":28},{"foodId":"strictly-cooked-rice-noodles","grams":300,"role":"carb","scalable":true,"minGrams":180,"maxGrams":520,"incrementGrams":45},{"foodId":"mixed-vegetables","grams":150,"role":"produce"},{"foodId":"spinach","grams":60,"role":"produce"}],"instructions":["Warm the noodles, chicken, and vegetables.","Fold in spinach and season to taste."],"prep":18,"difficulty":"easy","cuisine":"Asian-inspired","mealType":"dinner","tags":["halal","dairy-free","gluten-free"],"allergens":[],"categories":["post_workout_standard","post_workout_high_demand","post_workout_rapid_recovery"],"carb":"strictly-cooked-rice-noodles","protein":"chicken"},
    {"slug":"strictly-post-tofu-rice-noodle-bowl","name":"Tofu Rice Noodle Bowl","description":"Seared tofu, rice noodles, spinach, and vegetables.","ingredients":[{"foodId":"firm-tofu","grams":200,"role":"protein","scalable":true,"minGrams":150,"maxGrams":300,"incrementGrams":30},{"foodId":"strictly-cooked-rice-noodles","grams":300,"role":"carb","scalable":true,"minGrams":180,"maxGrams":520,"incrementGrams":45},{"foodId":"mixed-vegetables","grams":150,"role":"produce"},{"foodId":"spinach","grams":60,"role":"produce"}],"instructions":["Sear the tofu and warm the noodles.","Add vegetables and spinach, then season to taste."],"prep":20,"difficulty":"easy","cuisine":"Asian-inspired","mealType":"dinner","tags":["vegan","vegetarian","halal","dairy-free","gluten-free"],"allergens":["soy"],"categories":["post_workout_standard","post_workout_high_demand"],"carb":"strictly-cooked-rice-noodles","protein":"firm-tofu"},
    {"slug":"strictly-post-lentil-marinara-pasta","name":"Lentil Marinara Pasta","description":"Lentils, pasta, tomato sauce, and spinach.","ingredients":[{"foodId":"lentils","grams":220,"role":"protein","scalable":true,"minGrams":150,"maxGrams":340,"incrementGrams":40},{"foodId":"white-pasta","grams":260,"role":"carb","scalable":true,"minGrams":140,"maxGrams":500,"incrementGrams":35},{"foodId":"tomato-sauce","grams":150,"role":"produce"},{"foodId":"spinach","grams":90,"role":"produce"}],"instructions":["Warm the lentils with tomato sauce and spinach.","Toss with the cooked pasta."],"prep":20,"difficulty":"easy","cuisine":"Italian-inspired","mealType":"dinner","tags":["vegan","vegetarian","halal","dairy-free"],"allergens":["gluten"],"categories":["post_workout_light","post_workout_standard","post_workout_high_demand"],"carb":"white-pasta","protein":"lentils"},
    {"slug":"strictly-post-salmon-marinara-pasta","name":"Salmon Marinara Pasta","description":"Salmon, pasta, tomato sauce, and spinach.","ingredients":[{"foodId":"salmon","grams":142,"role":"protein","scalable":true,"minGrams":113,"maxGrams":200,"incrementGrams":28},{"foodId":"white-pasta","grams":280,"role":"carb","scalable":true,"minGrams":160,"maxGrams":520,"incrementGrams":35},{"foodId":"tomato-sauce","grams":150,"role":"produce"},{"foodId":"spinach","grams":90,"role":"produce"}],"instructions":["Warm the tomato sauce with spinach.","Fold in cooked salmon and toss with pasta."],"prep":24,"difficulty":"moderate","cuisine":"Italian-inspired","mealType":"dinner","tags":["pescatarian","halal","dairy-free"],"allergens":["fish","gluten"],"categories":["post_workout_standard","post_workout_high_demand","post_workout_rapid_recovery"],"carb":"white-pasta","protein":"salmon"},
    {"slug":"strictly-post-cottage-cheese-bagel-plate","name":"Cottage Cheese Bagel & Fruit Plate","description":"A toasted bagel with cottage cheese, banana, berries, and honey.","ingredients":[{"foodId":"cottage-cheese","grams":250,"role":"protein","scalable":true,"minGrams":180,"maxGrams":350,"incrementGrams":40},{"foodId":"bagel","grams":95,"role":"carb","scalable":true,"minGrams":70,"maxGrams":150,"incrementGrams":25},{"foodId":"banana","grams":118,"role":"produce"},{"foodId":"strictly-blueberries","grams":100,"role":"produce"},{"foodId":"honey","grams":15,"role":"topping"}],"instructions":["Toast the bagel and serve with cottage cheese.","Add banana, blueberries, and honey."],"prep":6,"difficulty":"easy","cuisine":"Breakfast","mealType":"breakfast","tags":["vegetarian","halal"],"allergens":["dairy","gluten"],"categories":["post_workout_light","post_workout_standard","post_workout_high_demand"],"carb":"bagel","protein":"cottage-cheese"},
    {"slug":"strictly-post-chocolate-milk-banana-breakfast","name":"Chocolate Milk, Banana & Oat Breakfast","description":"Chocolate milk with oatmeal, banana, yogurt, and berries.","ingredients":[{"foodId":"greek-yogurt","grams":170,"role":"protein","scalable":true,"minGrams":120,"maxGrams":280,"incrementGrams":50},{"foodId":"oats","grams":280,"role":"carb","scalable":true,"minGrams":180,"maxGrams":500,"incrementGrams":40},{"foodId":"strictly-chocolate-milk","grams":300,"role":"topping"},{"foodId":"banana","grams":118,"role":"produce"},{"foodId":"strictly-strawberries","grams":120,"role":"produce"}],"instructions":["Prepare the oatmeal and add banana and berries.","Serve with yogurt and chocolate milk."],"prep":8,"difficulty":"easy","cuisine":"Breakfast","mealType":"breakfast","tags":["vegetarian","halal"],"allergens":["dairy","gluten"],"categories":["post_workout_standard","post_workout_high_demand","post_workout_rapid_recovery"],"carb":"oats","protein":"greek-yogurt"}
  ]$post$::jsonb) as r(slug text,name text,description text,ingredients jsonb,instructions jsonb,prep integer,difficulty text,cuisine text,"mealType" text,tags jsonb,allergens jsonb,categories jsonb,carb text,protein text)
)
insert into public.meal_templates (
  slug,name,description,prep_minutes,instructions,dietary_tags,allergens,activity_types,
  ideal_timing_minutes,timing_low_minutes,timing_high_minutes,min_workout_minutes,
  ingredient_blueprint,is_verified,purpose,recovery_categories,cuisine_category,meal_type,
  preparation_difficulty,is_portion_scalable,primary_carb_food_id,primary_protein_food_id
)
select slug,name,description,prep,
  array(select jsonb_array_elements_text(instructions)),
  array(select jsonb_array_elements_text(tags)),
  array(select jsonb_array_elements_text(allergens)),
  array['running','trail_running','cycling','indoor_cycling','mountain_biking','swimming','rowing','triathlon','ironman_70_3','ironman','strength','strength_training','bodybuilding','powerlifting','crossfit','hyrox','hiit','soccer','basketball','general_cardio','mixed_training','endurance']::text[],
  60,30,120,0,ingredients,true,'post_workout',
  array(select jsonb_array_elements_text(categories)),cuisine,"mealType",difficulty,true,carb,protein
from recipes
on conflict (slug) do update set
  name=excluded.name,description=excluded.description,prep_minutes=excluded.prep_minutes,
  instructions=excluded.instructions,dietary_tags=excluded.dietary_tags,allergens=excluded.allergens,
  activity_types=excluded.activity_types,ingredient_blueprint=excluded.ingredient_blueprint,
  is_verified=true,purpose='post_workout',recovery_categories=excluded.recovery_categories,
  cuisine_category=excluded.cuisine_category,meal_type=excluded.meal_type,
  preparation_difficulty=excluded.preparation_difficulty,is_portion_scalable=true,
  primary_carb_food_id=excluded.primary_carb_food_id,
  primary_protein_food_id=excluded.primary_protein_food_id,updated_at=now();

delete from public.meal_template_items
where template_id in (
  select id from public.meal_templates
  where slug like 'strictly-featured-%'
     or slug in (
       'strictly-post-chicken-couscous-bowl','strictly-post-salmon-couscous-bowl',
       'strictly-post-turkey-pita-recovery-plate','strictly-post-tuna-sandwich-recovery',
       'strictly-post-breakfast-burrito-rice','strictly-post-beef-potato-egg-hash',
       'strictly-post-chicken-rice-noodle-bowl','strictly-post-tofu-rice-noodle-bowl',
       'strictly-post-lentil-marinara-pasta','strictly-post-salmon-marinara-pasta',
       'strictly-post-cottage-cheese-bagel-plate','strictly-post-chocolate-milk-banana-breakfast'
     )
);

insert into public.meal_template_items (
  template_id,position,food_id,food_name_snapshot,grams,serving_note,is_scalable
)
select mt.id, ingredient.ordinality::smallint, f.id,
  coalesce(f.name, ingredient.value->>'foodId'),
  (ingredient.value->>'grams')::numeric,
  ingredient.value->>'role',
  coalesce((ingredient.value->>'scalable')::boolean, mt.purpose='pre_workout')
from public.meal_templates mt
cross join lateral jsonb_array_elements(mt.ingredient_blueprint) with ordinality as ingredient(value,ordinality)
left join public.foods f on f.source_id='strictly' and f.source_product_id in (
  'starter:'||(ingredient.value->>'foodId'),
  'library:'||regexp_replace(ingredient.value->>'foodId','^strictly-',''),
  'recovery:'||(ingredient.value->>'foodId')
)
where mt.slug like 'strictly-featured-%'
   or mt.slug in (
     'strictly-post-chicken-couscous-bowl','strictly-post-salmon-couscous-bowl',
     'strictly-post-turkey-pita-recovery-plate','strictly-post-tuna-sandwich-recovery',
     'strictly-post-breakfast-burrito-rice','strictly-post-beef-potato-egg-hash',
     'strictly-post-chicken-rice-noodle-bowl','strictly-post-tofu-rice-noodle-bowl',
     'strictly-post-lentil-marinara-pasta','strictly-post-salmon-marinara-pasta',
     'strictly-post-cottage-cheese-bagel-plate','strictly-post-chocolate-milk-banana-breakfast'
   );

with totals as (
  select mti.template_id,
    sum(f.calories_per_100g*mti.grams/100) calories,
    sum(f.carbs_per_100g*mti.grams/100) carbs,
    sum(f.protein_per_100g*mti.grams/100) protein,
    sum(f.fat_per_100g*mti.grams/100) fat,
    sum(f.fiber_per_100g*mti.grams/100) fiber,
    sum(case when f.carb_speed_tier_id='fast' then f.carbs_per_100g*mti.grams/100 else 0 end) fast,
    sum(case when f.carb_speed_tier_id='medium' then f.carbs_per_100g*mti.grams/100 else 0 end) medium,
    sum(case when f.carb_speed_tier_id='slow' then f.carbs_per_100g*mti.grams/100 else 0 end) slow
  from public.meal_template_items mti
  join public.foods f on f.id=mti.food_id
  group by mti.template_id
)
update public.meal_templates mt set
  calories=round(t.calories,2),carbs_g=round(t.carbs,2),protein_g=round(t.protein,2),
  fat_g=round(t.fat,2),fiber_g=round(t.fiber,2),fast_carbs_g=round(t.fast,2),
  medium_carbs_g=round(t.medium,2),slow_carbs_g=round(t.slow,2),updated_at=now()
from totals t where mt.id=t.template_id;

commit;
