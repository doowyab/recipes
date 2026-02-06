# DATABASE SCHEMA — Recipe Synergy App

## recipes
id uuid PK
created_at timestamptz
title text
description text
owner_id uuid FK -> auth.users.id
pre_minutes int2
cook_minutes int2
servings int2

## recipe_steps
id uuid PK
recipe_id uuid FK -> recipes.id
created_at timestamptz
position int2
instruction text

## ingredients
id uuid PK
created_at timestamptz
name text unique
is_synergy_core boolean
default_unit text

## recipe_ingredients
recipe_id uuid FK -> recipes.id
ingredient_id uuid FK -> ingredients.id
quantity numeric
unit text
notes text
PK (recipe_id, ingredient_id)

## Relationships
recipes → recipe_steps (1:N)
recipes → recipe_ingredients (1:N)
ingredients → recipe_ingredients (1:N)
recipes.owner_id → auth.users.id
