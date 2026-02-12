import { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import RecipeFilterControls from '../components/RecipeFilterControls'
import { supabase } from '../lib/supabase'

function formatMinutes(value) {
  if (value === null || value === undefined || value === '') return ''
  return `${value} min`
}

function formatHeatBadge(value) {
  const heat = Number.parseInt(value, 10)
  if (Number.isNaN(heat) || heat <= 0) return ''
  return '🌶️'.repeat(Math.min(3, heat))
}

export default function Menu() {
  const [household, setHousehold] = useState(null)
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [removingId, setRemovingId] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [pendingRemoveId, setPendingRemoveId] = useState('')
  const [pendingAction, setPendingAction] = useState('')
  const [sortBy, setSortBy] = useState('alphabetical')
  const [sortDirection, setSortDirection] = useState('asc')
  const [selectedIngredients, setSelectedIngredients] = useState([])
  const [selectedServings, setSelectedServings] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadMenu() {
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
        setError('Please sign in to view your menu.')
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

      const { data: menuRows, error: menuError } = await supabase
        .from('menu_recipes')
        .select('recipe_id')
        .eq('household_id', memberRow.household_id)

      if (menuError) {
        setError(menuError.message ?? 'Unable to load menu recipes.')
        setRecipes([])
        setLoading(false)
        return
      }

      const recipeIds = (menuRows ?? []).map((row) => row.recipe_id).filter(Boolean)

      if (recipeIds.length === 0) {
        setRecipes([])
        setLoading(false)
        return
      }

      const { data: recipeRows, error: recipeError } = await supabase
        .from('recipes')
        .select(
          'id, title, description, pre_minutes, cook_minutes, servings, heat, recipe_ingredients ( quantity, unit, notes, ingredients ( id, name, default_unit ) )'
        )
        .in('id', recipeIds)
        .order('title')

      if (recipeError) {
        setError(recipeError.message ?? 'Unable to load menu recipes.')
        setRecipes([])
        setLoading(false)
        return
      }

      const normalized = (recipeRows ?? []).map((recipe) => ({
        id: recipe.id,
        title: recipe.title,
        description: recipe.description,
        pre_minutes: recipe.pre_minutes,
        cook_minutes: recipe.cook_minutes,
        servings: recipe.servings,
        heat: recipe.heat,
        ingredients: (recipe.recipe_ingredients ?? []).map((entry) => ({
          id: entry.ingredients?.id ?? entry.ingredient_id,
          name: entry.ingredients?.name ?? 'Unnamed ingredient',
          quantity: entry.quantity,
          unit: entry.unit,
          defaultUnit: entry.ingredients?.default_unit,
        })),
      }))

      setRecipes(normalized)
      setLoading(false)
    }

    loadMenu()

    return () => {
      isMounted = false
    }
  }, [])

  const handleRemove = async (recipeId) => {
    if (!household?.id || !recipeId) return

    setRemovingId(recipeId)
    setError('')

    const { error: removeError } = await supabase
      .from('menu_recipes')
      .delete()
      .eq('household_id', household.id)
      .eq('recipe_id', recipeId)

    if (removeError) {
      setError(removeError.message ?? 'Unable to remove recipe.')
      setRemovingId('')
      return
    }

    setRemovingId('')
    setRecipes((prev) => prev.filter((recipe) => recipe.id !== recipeId))
  }

  const handleRequestRemove = (recipeId, action) => {
    setPendingRemoveId(recipeId)
    setPendingAction(action)
    setShowConfirm(true)
  }

  const handleConfirmRemove = async () => {
    if (!pendingRemoveId) return
    await handleRemove(pendingRemoveId)
    setShowConfirm(false)
    setPendingRemoveId('')
    setPendingAction('')
  }

  const filteredRecipes = useMemo(() => {
    const ingredientFiltered =
      selectedIngredients.length > 0
        ? recipes.filter((recipe) =>
            recipe.ingredients?.some((ingredient) => selectedIngredients.includes(ingredient.name))
          )
        : recipes
    const servingsValue = selectedServings === '' ? null : Number.parseInt(selectedServings, 10)
    const servingsFiltered =
      servingsValue === null || Number.isNaN(servingsValue)
        ? ingredientFiltered
        : ingredientFiltered.filter((recipe) => recipe.servings === servingsValue)

    const sorted = [...servingsFiltered].sort((a, b) => {
      if (sortBy === 'cook-time') {
        const aCook = a.cook_minutes ?? Number.POSITIVE_INFINITY
        const bCook = b.cook_minutes ?? Number.POSITIVE_INFINITY
        if (aCook !== bCook) return aCook - bCook
      }
      if (sortBy === 'heat-level') {
        const aHeat = a.heat ?? Number.POSITIVE_INFINITY
        const bHeat = b.heat ?? Number.POSITIVE_INFINITY
        if (aHeat !== bHeat) return aHeat - bHeat
      }

      return (a.title || 'Untitled Recipe').localeCompare(b.title || 'Untitled Recipe')
    })
    if (sortDirection === 'desc') sorted.reverse()

    return sorted
  }, [recipes, selectedIngredients, selectedServings, sortBy, sortDirection])

  return (
    <>
      <Helmet>
        <title>Menu - Recipes</title>
      </Helmet>
      <div className="flex flex-col gap-6">
        {loading ? (
          <p className="text-sm text-sky-500 dark:text-sky-400">Loading menu...</p>
        ) : error ? (
          <p className="text-sm text-rose-300">{error}</p>
        ) : !household ? (
          <div className="rounded-2xl border border-dashed border-sky-200 bg-sky-50 p-6 text-center dark:border-sky-800 dark:bg-sky-900/50">
            <p className="text-sm text-sky-600 dark:text-sky-300">
              Join a{' '}
              <Link className="font-semibold text-sky-900 underline dark:text-white" to="/household">
                household
              </Link>{' '}
              to view its menu.
            </p>
          </div>
        ) : recipes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-sky-200 bg-sky-50 p-6 text-center dark:border-sky-800 dark:bg-sky-900/50">
            <p className="text-sm text-sky-600 dark:text-sky-300">
              No menu recipes yet for {household.name || 'your household'}.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-semibold text-sky-900 dark:text-sky-100">
                Menu at {household?.name || 'your home'}
              </h1>
              <p className="text-sm text-sky-600 dark:text-sky-300">
                These are the recipes you picked and planned for. You can mark them off as you cook them, or
                plan your next batch of meals{' '}
                <Link className="font-semibold text-sky-900 underline dark:text-white" to="/plan">
                  here
                </Link>
                .
              </p>
            </div>
            <RecipeFilterControls
              sortBy={sortBy}
              onSortByChange={setSortBy}
              sortDirection={sortDirection}
              onSortDirectionChange={setSortDirection}
              selectedIngredients={selectedIngredients}
              onSelectedIngredientsChange={setSelectedIngredients}
              selectedServings={selectedServings}
              onSelectedServingsChange={setSelectedServings}
              recipes={recipes}
            />
            {filteredRecipes.length === 0 ? (
              <div className="flex flex-col gap-3 rounded-xl border border-dashed border-sky-200 bg-sky-50 p-6 text-center dark:border-sky-800 dark:bg-sky-900/50">
                <p className="text-sm text-sky-600 dark:text-sky-300">No menu recipes match this filter.</p>
                <p className="text-xs text-sky-500 dark:text-sky-500">
                  Try another ingredient filter or update your menu.
                </p>
              </div>
            ) : (
              filteredRecipes.map((recipe) => (
              <div
                key={recipe.id}
                className="flex flex-col gap-3 rounded-xl border border-sky-100 bg-white/90 px-4 py-4 shadow-sm shadow-black/5 backdrop-blur dark:border-sky-900 dark:bg-sky-950/70 dark:shadow-black/20 md:flex-row md:items-start md:justify-between"
              >
                <div>
                  <h3 className="text-lg font-semibold text-sky-900 dark:text-sky-100">
                    {recipe.title || 'Untitled recipe'}
                  </h3>
                  {(
                    (recipe.pre_minutes !== null &&
                      recipe.pre_minutes !== undefined &&
                      recipe.pre_minutes !== '') ||
                    (recipe.cook_minutes !== null &&
                      recipe.cook_minutes !== undefined &&
                      recipe.cook_minutes !== '') ||
                    (recipe.servings !== null &&
                      recipe.servings !== undefined &&
                      recipe.servings !== '') ||
                    formatHeatBadge(recipe.heat)
                  ) ? (
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-600 dark:text-sky-300">
                      {recipe.pre_minutes !== null &&
                      recipe.pre_minutes !== undefined &&
                      recipe.pre_minutes !== '' ? (
                        <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 dark:border-sky-800 dark:bg-sky-900/60">
                          Prep {formatMinutes(recipe.pre_minutes)}
                        </span>
                      ) : null}
                      {recipe.cook_minutes !== null &&
                      recipe.cook_minutes !== undefined &&
                      recipe.cook_minutes !== '' ? (
                        <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 dark:border-sky-800 dark:bg-sky-900/60">
                          Cook {formatMinutes(recipe.cook_minutes)}
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
                  {recipe.description ? (
                    <p className="mt-1 text-sm text-sky-600 dark:text-sky-300">
                      {recipe.description}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    to={`/recipe/${recipe.id}/view`}
                    className="rounded-full border border-sky-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700 transition hover:border-sky-400 hover:text-sky-900 dark:border-sky-700 dark:text-sky-200 dark:hover:border-sky-500 dark:hover:text-white"
                  >
                    View
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleRequestRemove(recipe.id, 'done')}
                    disabled={removingId === recipe.id || showConfirm}
                    className="rounded-full border border-emerald-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 transition hover:border-emerald-400 hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-500/40 dark:text-emerald-200 dark:hover:border-emerald-400 dark:hover:text-emerald-100"
                  >
                    Done
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRequestRemove(recipe.id, 'delete')}
                    disabled={removingId === recipe.id || showConfirm}
                    className="rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-rose-600 transition hover:border-rose-400 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-500/40 dark:text-rose-200 dark:hover:border-rose-400 dark:hover:text-rose-100"
                  >
                    {removingId === recipe.id ? 'Removing...' : 'Delete'}
                  </button>
                </div>
              </div>
              ))
            )}
          </div>
        )}
      </div>

      {showConfirm ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-sky-950/60 px-6">
          <div className="w-full max-w-md rounded-2xl border border-sky-200 bg-white p-6 shadow-2xl dark:border-sky-800 dark:bg-sky-950">
            <h2 className="text-xl font-semibold text-sky-900 dark:text-sky-100">
              {pendingAction === 'delete' ? 'Delete this recipe?' : 'Mark recipe as done?'}
            </h2>
            <p className="mt-2 text-sm text-sky-600 dark:text-sky-300">
              This will remove the recipe from your menu.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowConfirm(false)
                  setPendingRemoveId('')
                  setPendingAction('')
                }}
                className="rounded-full border border-sky-200 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:border-sky-400 hover:text-sky-900 dark:border-sky-700 dark:text-sky-200 dark:hover:border-sky-500 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemove}
                disabled={removingId === pendingRemoveId}
                className={
                  pendingAction === 'delete'
                    ? 'rounded-full bg-rose-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-black/10 transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-rose-500 dark:hover:bg-rose-400'
                    : 'rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-black/10 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-500 dark:hover:bg-emerald-400'
                }
              >
                {removingId === pendingRemoveId
                  ? 'Removing...'
                  : pendingAction === 'delete'
                  ? 'Delete'
                  : 'Done'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
