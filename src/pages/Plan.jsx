import { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import RecipeFilterControls from '../components/RecipeFilterControls'
import { supabase } from '../lib/supabase'

function formatQuantity(quantity, unit, defaultUnit) {
  const resolvedUnit = unit || defaultUnit || ''
  const normalizedUnit = resolvedUnit.toLowerCase()
  if (quantity === null || quantity === undefined || quantity === '') {
    return normalizedUnit === 'count' ? '' : resolvedUnit
  }
  if (resolvedUnit) {
    return normalizedUnit === 'count' ? `${quantity}` : `${quantity} ${resolvedUnit}`
  }
  return `${quantity}`
}

function formatMinutes(value) {
  if (value === null || value === undefined || value === '') return ''
  return `${value} min`
}

function formatHeatBadge(value) {
  const heat = Number.parseInt(value, 10)
  if (Number.isNaN(heat) || heat <= 0) return ''
  return '🌶️'.repeat(Math.min(3, heat))
}


export default function Plan() {
  const [household, setHousehold] = useState(null)
  const [recipes, setRecipes] = useState([])
  const [allRecipes, setAllRecipes] = useState([])
  const [synergyRecipes, setSynergyRecipes] = useState([])
  const [synergyCoreByRecipe, setSynergyCoreByRecipe] = useState(new Map())
  const [planRecipeIds, setPlanRecipeIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [addingId, setAddingId] = useState('')
  const [removingId, setRemovingId] = useState('')
  const [addOtherSortBy, setAddOtherSortBy] = useState('alphabetical')
  const [addOtherSortDirection, setAddOtherSortDirection] = useState('asc')
  const [addOtherSelectedIngredients, setAddOtherSelectedIngredients] = useState([])
  const [addOtherSelectedServings, setAddOtherSelectedServings] = useState('')

  const computeSynergy = (planned, all) => {
    const plannedSet = new Set(planned.map((recipe) => recipe.id))
    const synergyCoreIds = new Set(
      planned.flatMap((recipe) =>
        recipe.ingredients
          .filter((ingredient) => ingredient.isSynergyCore)
          .map((ingredient) => ingredient.id)
      )
    )
    const synergyMap = new Map()
    const synergyFiltered = all
      .filter((recipe) => !plannedSet.has(recipe.id))
      .filter((recipe) =>
        recipe.ingredients.some(
          (ingredient) =>
            ingredient.isSynergyCore && synergyCoreIds.has(ingredient.id)
        )
      )
      .map((recipe) => {
        const matches = recipe.ingredients
          .filter(
            (ingredient) =>
              ingredient.isSynergyCore && synergyCoreIds.has(ingredient.id)
          )
          .map((ingredient) => ingredient.name)
        synergyMap.set(recipe.id, matches)
        return recipe
      })

    setSynergyRecipes(synergyFiltered)
    setSynergyCoreByRecipe(synergyMap)
  }

  useEffect(() => {
    let isMounted = true

    async function loadPlan() {
      setLoading(true)
      setError('')

      const { data: userData, error: userError } = await supabase.auth.getUser()

      if (!isMounted) return

      if (userError) {
        setError(userError.message ?? 'Unable to load your account.')
        setLoading(false)
        return
      }

      const user = userData?.user

      if (!user) {
        setError('Please sign in to view your plan.')
        setLoading(false)
        return
      }

      const { data: memberRow, error: memberError } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()

      if (memberError) {
        setError(memberError.message ?? 'Unable to load household membership.')
        setLoading(false)
        return
      }

      if (!memberRow?.household_id) {
        setHousehold(null)
        setRecipes([])
        setLoading(false)
        return
      }

      const { data: householdRow, error: householdError } = await supabase
        .from('households')
        .select('id, name')
        .eq('id', memberRow.household_id)
        .single()

      if (householdError) {
        setError(householdError.message ?? 'Unable to load household.')
        setLoading(false)
        return
      }

      setHousehold(householdRow ?? null)

      const { data: planRows, error: planError } = await supabase
        .from('plan_recipes')
        .select('recipe_id')
        .eq('household_id', memberRow.household_id)

      if (planError) {
        setError(planError.message ?? 'Unable to load plan recipes.')
        setRecipes([])
        setLoading(false)
        return
      }

      const recipeIds = (planRows ?? [])
        .map((row) => row.recipe_id)
        .filter(Boolean)

      setPlanRecipeIds(new Set(recipeIds))

      let plannedNormalized = []
      if (recipeIds.length > 0) {
        const { data: plannedRows, error: plannedError } = await supabase
          .from('recipes')
          .select(
            'id, title, description, pre_minutes, cook_minutes, servings, heat, recipe_ingredients ( quantity, unit, notes, ingredients ( id, name, default_unit, is_synergy_core ) )'
          )
          .in('id', recipeIds)
          .order('title')

        if (plannedError) {
          setError(plannedError.message ?? 'Unable to load planned recipes.')
          setRecipes([])
          setLoading(false)
          return
        }

        const normalized = (plannedRows ?? []).map((recipe) => {
          const ingredients = (recipe.recipe_ingredients ?? [])
            .map((entry) => ({
              id: entry.ingredients?.id ?? entry.ingredient_id,
              name: entry.ingredients?.name ?? 'Unnamed ingredient',
              quantity: entry.quantity,
              unit: entry.unit,
              defaultUnit: entry.ingredients?.default_unit,
              isSynergyCore: entry.ingredients?.is_synergy_core ?? false,
              notes: entry.notes,
            }))
            .sort((a, b) => a.name.localeCompare(b.name))

          return {
            id: recipe.id,
            title: recipe.title || 'Untitled recipe',
            description: recipe.description,
            preMinutes: recipe.pre_minutes,
            cookMinutes: recipe.cook_minutes,
            servings: recipe.servings,
            heat: recipe.heat,
            ingredients,
          }
        })

        plannedNormalized = normalized
        setRecipes(normalized)
      } else {
        setRecipes([])
      }

      const { data: allRows, error: allError } = await supabase
        .from('recipes')
        .select(
          'id, title, description, pre_minutes, cook_minutes, servings, heat, recipe_ingredients ( quantity, unit, notes, ingredients ( id, name, default_unit, is_synergy_core ) )'
        )
        .order('title')

      if (allError) {
        setError(allError.message ?? 'Unable to load recipes.')
        setAllRecipes([])
        setLoading(false)
        return
      }

      const allNormalized = (allRows ?? []).map((recipe) => {
        const ingredients = (recipe.recipe_ingredients ?? [])
          .map((entry) => ({
            id: entry.ingredients?.id ?? entry.ingredient_id,
            name: entry.ingredients?.name ?? 'Unnamed ingredient',
            quantity: entry.quantity,
            unit: entry.unit,
            defaultUnit: entry.ingredients?.default_unit,
            isSynergyCore: entry.ingredients?.is_synergy_core ?? false,
            notes: entry.notes,
          }))
          .sort((a, b) => a.name.localeCompare(b.name))

        return {
          id: recipe.id,
          title: recipe.title || 'Untitled recipe',
          description: recipe.description,
          preMinutes: recipe.pre_minutes,
          cookMinutes: recipe.cook_minutes,
          servings: recipe.servings,
          heat: recipe.heat,
          ingredients,
        }
      })

      setAllRecipes(allNormalized)
      computeSynergy(plannedNormalized, allNormalized)
      setLoading(false)
    }

    loadPlan()

    return () => {
      isMounted = false
    }
  }, [])

  const handleAddToPlan = async (recipeId) => {
    if (!household?.id || !recipeId) return

    setAddingId(recipeId)
    setError('')

    const { error: addError } = await supabase
      .from('plan_recipes')
      .insert({ household_id: household.id, recipe_id: recipeId })

    if (addError) {
      setError(addError.message ?? 'Unable to add recipe to plan.')
      setAddingId('')
      return
    }

    setAddingId('')
    setPlanRecipeIds((prev) => new Set([...prev, recipeId]))
    setRecipes((prev) => {
      const added = allRecipes.find((recipe) => recipe.id === recipeId)
      if (!added) return prev
      const next = [...prev, added]
      computeSynergy(next, allRecipes)
      return next
    })
  }

  const handleRemoveFromPlan = async (recipeId) => {
    if (!household?.id || !recipeId) return

    setRemovingId(recipeId)
    setError('')

    const { error: removeError } = await supabase
      .from('plan_recipes')
      .delete()
      .eq('household_id', household.id)
      .eq('recipe_id', recipeId)

    if (removeError) {
      setError(removeError.message ?? 'Unable to remove recipe from plan.')
      setRemovingId('')
      return
    }

    setRemovingId('')
    setPlanRecipeIds((prev) => {
      const next = new Set(prev)
      next.delete(recipeId)
      return next
    })
    setRecipes((prev) => {
      const next = prev.filter((recipe) => recipe.id !== recipeId)
      computeSynergy(next, allRecipes)
      return next
    })
  }

  const addableRecipes = useMemo(
    () => allRecipes.filter((recipe) => !planRecipeIds.has(recipe.id)),
    [allRecipes, planRecipeIds]
  )

  const filteredAddableRecipes = useMemo(() => {
    const ingredientFiltered = addOtherSelectedIngredients.length > 0
      ? addableRecipes.filter((recipe) =>
          recipe.ingredients.some((ingredient) => addOtherSelectedIngredients.includes(ingredient.name))
        )
      : addableRecipes
    const servingsValue =
      addOtherSelectedServings === '' ? null : Number.parseInt(addOtherSelectedServings, 10)
    const servingsFiltered =
      servingsValue === null || Number.isNaN(servingsValue)
        ? ingredientFiltered
        : ingredientFiltered.filter((recipe) => recipe.servings === servingsValue)

    const sorted = [...servingsFiltered].sort((a, b) => {
      if (addOtherSortBy === 'cook-time') {
        const aCook = a.cookMinutes ?? Number.POSITIVE_INFINITY
        const bCook = b.cookMinutes ?? Number.POSITIVE_INFINITY
        if (aCook !== bCook) return aCook - bCook
      }
      if (addOtherSortBy === 'heat-level') {
        const aHeat = a.heat ?? Number.POSITIVE_INFINITY
        const bHeat = b.heat ?? Number.POSITIVE_INFINITY
        if (aHeat !== bHeat) return aHeat - bHeat
      }

      return a.title.localeCompare(b.title)
    })
    if (addOtherSortDirection === 'desc') sorted.reverse()
    return sorted
  }, [
    addOtherSelectedIngredients,
    addOtherSelectedServings,
    addOtherSortBy,
    addOtherSortDirection,
    addableRecipes,
  ])

  return (
    <>
      <Helmet>
        <title>Plan - Recipes</title>
      </Helmet>
      <div className="flex flex-col gap-6">
        {loading ? (
          <p className="text-sm text-sky-500 dark:text-sky-400">
            Loading plan...
          </p>
        ) : error ? (
          <p className="text-sm text-rose-300">{error}</p>
        ) : !household ? (
          <div className="rounded-2xl border border-dashed border-sky-200 bg-sky-50 p-6 text-center dark:border-sky-800 dark:bg-sky-900/50">
            <p className="text-sm text-sky-600 dark:text-sky-300">
              Join a{' '}
              <Link className="font-semibold text-sky-900 underline dark:text-white" to="/household">
                household
              </Link>{' '}
              to view its plan.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-semibold text-sky-900 dark:text-sky-100">
                  Planned recipes
                </h1>
                <p className="text-sm text-sky-600 dark:text-sky-300">
                  Planned recipes help you create a{' '}
                  <Link className="font-semibold text-sky-900 underline dark:text-white" to="/shop">
                    shopping list
                  </Link>
                  .
                </p>
                <p className="text-sm text-sky-600 dark:text-sky-300">
                  Once you have purchased all the ingredients in your plan you can promote the plan to the menu.
                </p>
              </div>
              <span className="hidden text-xs font-semibold uppercase tracking-[0.25em] text-sky-500 dark:text-sky-400 md:inline-block">
                {recipes.length} total
              </span>
            </div>
            {recipes.length === 0 ? (
              <p className="text-sm text-sky-600 dark:text-sky-300">
                No planned recipes yet for {household.name || 'your household'}.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                {recipes.map((recipe) => (
                  <div
                    key={recipe.id}
                    className="rounded-xl border border-sky-100 bg-white/90 px-4 py-4 shadow-sm shadow-black/5 backdrop-blur dark:border-sky-900 dark:bg-sky-950/70 dark:shadow-black/20"
                  >
                    <div className="flex flex-col gap-3 md:grid md:grid-cols-[1fr_auto] md:items-start md:gap-x-4 md:gap-y-3">
                      <div className="md:col-start-1 md:row-start-1">
                        <h3 className="text-lg font-semibold text-sky-900 dark:text-sky-100">
                          {recipe.title}
                        </h3>
                        {(
                          (recipe.preMinutes !== null &&
                            recipe.preMinutes !== undefined &&
                            recipe.preMinutes !== '') ||
                          (recipe.cookMinutes !== null &&
                            recipe.cookMinutes !== undefined &&
                            recipe.cookMinutes !== '') ||
                          (recipe.servings !== null &&
                            recipe.servings !== undefined &&
                            recipe.servings !== '') ||
                          formatHeatBadge(recipe.heat)
                        ) ? (
                            <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-600 dark:text-sky-300">
                            {recipe.preMinutes !== null &&
                            recipe.preMinutes !== undefined &&
                            recipe.preMinutes !== '' ? (
                              <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 dark:border-sky-800 dark:bg-sky-900/60">
                                Prep {formatMinutes(recipe.preMinutes)}
                              </span>
                            ) : null}
                            {recipe.cookMinutes !== null &&
                            recipe.cookMinutes !== undefined &&
                            recipe.cookMinutes !== '' ? (
                              <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 dark:border-sky-800 dark:bg-sky-900/60">
                                Cook {formatMinutes(recipe.cookMinutes)}
                              </span>
                            ) : null}
                            {recipe.servings !== null &&
                            recipe.servings !== undefined &&
                            recipe.servings !== '' ? (
                              <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 dark:border-sky-800 dark:bg-sky-900/60">
                                Serves {recipe.servings}
                              </span>
                            ) : null}
                            {formatHeatBadge(recipe.heat) ? (
                              <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 dark:border-sky-800 dark:bg-sky-900/60">
                                {formatHeatBadge(recipe.heat)}
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                      <details className="md:col-start-1 md:row-start-2">
                      <summary className="cursor-pointer text-sm font-semibold text-sky-700 transition hover:text-sky-900 dark:text-sky-200 dark:hover:text-white">
                        Ingredients
                      </summary>
                      {recipe.ingredients.length === 0 ? (
                        <p className="mt-3 text-sm text-sky-500 dark:text-sky-400">
                          No ingredients listed.
                        </p>
                      ) : (
                        <ul className="mt-3 grid list-disc gap-2 pl-5 text-sm text-sky-700 dark:text-sky-200 md:grid-cols-2 md:gap-x-6">
                          {recipe.ingredients.map((ingredient) => (
                            <li key={`${recipe.id}-${ingredient.id}`}>
                              <span className="font-semibold text-sky-900 dark:text-sky-100">
                                {formatQuantity(
                                  ingredient.quantity,
                                  ingredient.unit,
                                  ingredient.defaultUnit
                                )}{' '}
                                {ingredient.name}
                              </span>
                              {ingredient.notes ? (
                                <span className="text-xs text-sky-500 dark:text-sky-400">
                                  {ingredient.notes}
                                </span>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      )}
                      </details>
                      <button
                        type="button"
                        onClick={() => handleRemoveFromPlan(recipe.id)}
                        disabled={removingId === recipe.id}
                        className="w-full rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-rose-600 transition hover:border-rose-400 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60 md:col-start-2 md:row-start-1 md:w-auto md:justify-self-end md:self-start md:py-1.5 dark:border-rose-500/40 dark:text-rose-200 dark:hover:border-rose-400 dark:hover:text-rose-100"
                      >
                        {removingId === recipe.id ? 'Removing...' : 'Remove'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {recipes.length > 0 ? (
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to="/shop"
                  className="rounded-full bg-sky-900 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-lg shadow-black/10 transition hover:bg-sky-800 dark:bg-white dark:text-sky-900 dark:shadow-black/20 dark:hover:bg-sky-100"
                >
                  View shopping list
                </Link>
                <Link
                  to="/migrate"
                  className="rounded-full bg-sky-900 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-lg shadow-black/10 transition hover:bg-sky-800 dark:bg-white dark:text-sky-900 dark:shadow-black/20 dark:hover:bg-sky-100"
                >
                  Ready to Cook
                </Link>
              </div>
            ) : null}

            {synergyRecipes.length > 0 ? (
              <section className="flex flex-col gap-3">
                <h2 className="text-lg font-semibold text-sky-900 dark:text-sky-100">
                  Synergy recipes
                </h2>
                <p className="text-sm text-sky-600 dark:text-sky-300">
                  These recipes share core ingredients with your plan.
                </p>
                <div className="flex flex-col gap-3">
                  {synergyRecipes.map((recipe) => (
                    <div
                      key={`synergy-${recipe.id}`}
                      className="rounded-xl border border-sky-100 bg-white/90 px-4 py-3 shadow-sm shadow-black/5 backdrop-blur dark:border-sky-900 dark:bg-sky-950/70 dark:shadow-black/20"
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div className="flex-1">
                          <h3 className="text-base font-semibold text-sky-900 dark:text-sky-100">
                            {recipe.title}
                          </h3>
                          {(
                            (recipe.preMinutes !== null &&
                              recipe.preMinutes !== undefined &&
                              recipe.preMinutes !== '') ||
                            (recipe.cookMinutes !== null &&
                              recipe.cookMinutes !== undefined &&
                              recipe.cookMinutes !== '') ||
                            (recipe.servings !== null &&
                              recipe.servings !== undefined &&
                              recipe.servings !== '') ||
                            formatHeatBadge(recipe.heat)
                          ) ? (
                            <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-600 dark:text-sky-300">
                              {recipe.preMinutes !== null &&
                              recipe.preMinutes !== undefined &&
                              recipe.preMinutes !== '' ? (
                                <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 dark:border-sky-800 dark:bg-sky-900/60">
                                  Prep {formatMinutes(recipe.preMinutes)}
                                </span>
                              ) : null}
                              {recipe.cookMinutes !== null &&
                              recipe.cookMinutes !== undefined &&
                              recipe.cookMinutes !== '' ? (
                                <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 dark:border-sky-800 dark:bg-sky-900/60">
                                  Cook {formatMinutes(recipe.cookMinutes)}
                                </span>
                              ) : null}
                              {recipe.servings !== null &&
                              recipe.servings !== undefined &&
                              recipe.servings !== '' ? (
                                <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 dark:border-sky-800 dark:bg-sky-900/60">
                                  Serves {recipe.servings}
                                </span>
                              ) : null}
                              {formatHeatBadge(recipe.heat) ? (
                                <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 dark:border-sky-800 dark:bg-sky-900/60">
                                  {formatHeatBadge(recipe.heat)}
                                </span>
                              ) : null}
                            </div>
                          ) : null}
                          {synergyCoreByRecipe.get(recipe.id)?.length ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {synergyCoreByRecipe.get(recipe.id).map((name) => (
                                <span
                                  key={`${recipe.id}-${name}`}
                                  className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:border-emerald-700/60 dark:bg-emerald-900/40 dark:text-emerald-200"
                                >
                                  {name}
                                </span>
                              ))}
                            </div>
                          ) : null}
                          <details className="mt-3">
                            <summary className="cursor-pointer text-sm font-semibold text-sky-700 transition hover:text-sky-900 dark:text-sky-200 dark:hover:text-white">
                              Ingredients
                            </summary>
                            {recipe.ingredients.length === 0 ? (
                              <p className="mt-3 text-sm text-sky-500 dark:text-sky-400">
                                No ingredients listed.
                              </p>
                            ) : (
                        <ul className="mt-3 grid list-disc gap-2 pl-5 text-sm text-sky-700 dark:text-sky-200 md:grid-cols-2 md:gap-x-6">
                          {recipe.ingredients.map((ingredient) => (
                            <li key={`${recipe.id}-synergy-${ingredient.id}`}>
                              <span className="font-semibold text-sky-900 dark:text-sky-100">
                                {formatQuantity(
                                  ingredient.quantity,
                                  ingredient.unit,
                                  ingredient.defaultUnit
                                )}{' '}
                                {ingredient.name}
                              </span>
                                    {ingredient.notes ? (
                                      <span className="text-xs text-sky-500 dark:text-sky-400">
                                        {ingredient.notes}
                                      </span>
                                    ) : null}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </details>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddToPlan(recipe.id)}
                          disabled={addingId === recipe.id}
                          className="w-full rounded-full bg-sky-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-lg shadow-black/10 transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto dark:bg-white dark:text-sky-900 dark:shadow-black/20 dark:hover:bg-sky-100"
                        >
                          {addingId === recipe.id ? 'Adding...' : 'Add'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section>
              <h2 className="text-lg font-semibold text-sky-900 dark:text-sky-100">
                Add other recipes
              </h2>
              <p className="mt-2 text-sm text-sky-600 dark:text-sky-300">
                Review each recipe and add it to the plan.
              </p>
              <RecipeFilterControls
                className="mt-4"
                sortBy={addOtherSortBy}
                onSortByChange={setAddOtherSortBy}
                sortDirection={addOtherSortDirection}
                onSortDirectionChange={setAddOtherSortDirection}
                selectedIngredients={addOtherSelectedIngredients}
                onSelectedIngredientsChange={setAddOtherSelectedIngredients}
                selectedServings={addOtherSelectedServings}
                onSelectedServingsChange={setAddOtherSelectedServings}
                recipes={addableRecipes}
              />
              {filteredAddableRecipes.length === 0 ? (
                <p className="mt-4 text-sm text-sky-500 dark:text-sky-400">
                  No recipes available for this filter.
                </p>
              ) : (
                <div className="mt-4 flex flex-col gap-4">
                  {filteredAddableRecipes.map((recipe) => {
                    return (
                      <div
                        key={`add-${recipe.id}`}
                        className="rounded-xl border border-sky-100 bg-white px-4 py-4 dark:border-sky-900 dark:bg-sky-950/70"
                      >
                        <div className="flex flex-col gap-3 md:grid md:grid-cols-[1fr_auto] md:items-start md:gap-x-4 md:gap-y-3">
                          <div className="flex-1 md:col-start-1 md:row-start-1">
                            <h3 className="text-base font-semibold text-sky-900 dark:text-sky-100">
                              {recipe.title}
                            </h3>
                            {(
                              (recipe.preMinutes !== null &&
                                recipe.preMinutes !== undefined &&
                                recipe.preMinutes !== '') ||
                              (recipe.cookMinutes !== null &&
                                recipe.cookMinutes !== undefined &&
                                recipe.cookMinutes !== '') ||
                              (recipe.servings !== null &&
                                recipe.servings !== undefined &&
                                recipe.servings !== '') ||
                              formatHeatBadge(recipe.heat)
                            ) ? (
                              <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-600 dark:text-sky-300">
                                {recipe.preMinutes !== null &&
                                recipe.preMinutes !== undefined &&
                                recipe.preMinutes !== '' ? (
                                  <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 dark:border-sky-800 dark:bg-sky-900/60">
                                    Prep {formatMinutes(recipe.preMinutes)}
                                  </span>
                                ) : null}
                                {recipe.cookMinutes !== null &&
                                recipe.cookMinutes !== undefined &&
                                recipe.cookMinutes !== '' ? (
                                  <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 dark:border-sky-800 dark:bg-sky-900/60">
                                    Cook {formatMinutes(recipe.cookMinutes)}
                                  </span>
                                ) : null}
                                {recipe.servings !== null &&
                                recipe.servings !== undefined &&
                                recipe.servings !== '' ? (
                                  <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 dark:border-sky-800 dark:bg-sky-900/60">
                                    Serves {recipe.servings}
                                  </span>
                                ) : null}
                                {formatHeatBadge(recipe.heat) ? (
                                  <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 dark:border-sky-800 dark:bg-sky-900/60">
                                    {formatHeatBadge(recipe.heat)}
                                  </span>
                                ) : null}
                              </div>
                            ) : null}
                            {addOtherSelectedIngredients.length > 0 ? (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {recipe.ingredients
                                  .filter((ingredient) =>
                                    addOtherSelectedIngredients.includes(ingredient.name)
                                  )
                                  .map((ingredient) => (
                                    <span
                                      key={`${recipe.id}-filter-${ingredient.id}`}
                                      className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:border-emerald-700/60 dark:bg-emerald-900/40 dark:text-emerald-200"
                                    >
                                      {ingredient.name}
                                    </span>
                                  ))}
                              </div>
                            ) : null}
                          </div>
                          <details className="md:col-start-1 md:row-start-2">
                            <summary className="cursor-pointer text-sm font-semibold text-sky-700 transition hover:text-sky-900 dark:text-sky-200 dark:hover:text-white">
                              Ingredients
                            </summary>
                            {recipe.ingredients.length === 0 ? (
                              <p className="mt-3 text-sm text-sky-500 dark:text-sky-400">
                                No ingredients listed.
                              </p>
                            ) : (
                              <ul className="mt-3 grid list-disc gap-2 pl-5 text-sm text-sky-700 dark:text-sky-200 md:grid-cols-2 md:gap-x-6">
                                {recipe.ingredients.map((ingredient) => (
                                  <li key={`${recipe.id}-add-${ingredient.id}`}>
                                    <span className="font-semibold text-sky-900 dark:text-sky-100">
                                      {formatQuantity(
                                        ingredient.quantity,
                                        ingredient.unit,
                                        ingredient.defaultUnit
                                      )}{' '}
                                      {ingredient.name}
                                    </span>
                                    {ingredient.notes ? (
                                      <span className="text-xs text-sky-500 dark:text-sky-400">
                                        {ingredient.notes}
                                      </span>
                                    ) : null}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </details>
                          <button
                            type="button"
                            onClick={() => handleAddToPlan(recipe.id)}
                            disabled={addingId === recipe.id}
                            className="w-full rounded-full bg-sky-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-lg shadow-black/10 transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60 md:col-start-2 md:row-start-1 md:w-auto md:justify-self-end md:self-start md:py-1.5 dark:bg-white dark:text-sky-900 dark:shadow-black/20 dark:hover:bg-sky-100"
                          >
                            {addingId === recipe.id ? 'Adding...' : 'Add'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </>
  )
}
