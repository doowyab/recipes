# DATABASE SCHEMA — Recipe Synergy App

## households
id uuid PK  
name text

## household_members
user_id uuid FK → auth.users.id  
household_id uuid FK → households.id  
PK (user_id, household_id)

## recipes
id uuid PK  
created_at timestamptz  
title text  
description text  
owner_id uuid FK → auth.users.id  
pre_minutes int2  
cook_minutes int2  
servings int2  
heat int2

## recipe_steps
id uuid PK  
recipe_id uuid FK → recipes.id  
created_at timestamptz  
position int2  
instruction text  
is_heading bool

## ingredients
id uuid PK  
created_at timestamptz  
name text  
is_synergy_core bool  
default_unit text
default_quantity int2
supermarket_section text

## recipe_ingredients
recipe_id uuid FK → recipes.id  
ingredient_id uuid FK → ingredients.id  
quantity numeric  
unit text  
notes text  
PK (recipe_id, ingredient_id)

## menu_recipes
id uuid PK  
household_id uuid FK → households.id  
recipe_id uuid FK → recipes.id

## plan_recipes
id uuid PK  
recipe_id uuid FK → recipes.id  
household_id uuid FK → households.id

---

## Relationships

auth.users → household_members (1:N)  
households → household_members (1:N)

auth.users → recipes (1:N)

recipes → recipe_steps (1:N)  
recipes → recipe_ingredients (1:N)  
ingredients → recipe_ingredients (1:N)

households → menu_recipes (1:N)  
recipes → menu_recipes (1:N)

households → plan_recipes (1:N)  
recipes → plan_recipes (1:N)
