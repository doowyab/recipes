import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import RecipeFilterControls from '../components/RecipeFilterControls'
import { supabase } from '../lib/supabase'

function formatMinutes(value) {
  if (value === null || value === undefined || value === '') return '—'
  return `${value} min`
}

function formatHeatBadge(value) {
  const heat = Number.parseInt(value, 10)
  if (Number.isNaN(heat) || heat <= 0) return ''
  return '🌶️'.repeat(Math.min(3, heat))
}

export default function Recipes() {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [pendingDeleteRecipe, setPendingDeleteRecipe] = useState(null)
  const [deletingId, setDeletingId] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [sortBy, setSortBy] = useState('alphabetical')
  const [sortDirection, setSortDirection] = useState('asc')
  const [selectedIngredients, setSelectedIngredients] = useState([])
  const [selectedServings, setSelectedServings] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadRecipes() {
      setLoading(true)
      setError('')

      const { data, error: fetchError } = await supabase
        .from('recipes')
        .select(
          'id, title, description, pre_minutes, cook_minutes, servings, heat, recipe_ingredients ( ingredients ( id, name ) )'
        )

      if (!isMounted) return

      if (fetchError) {
        setError(fetchError.message ?? 'Unable to load recipes.')
        setRecipes([])
      } else {
        const normalized = (data ?? []).map((recipe) => ({
          ...recipe,
          ingredients: (recipe.recipe_ingredients ?? [])
            .map((entry) => ({
              id: entry.ingredients?.id ?? '',
              name: entry.ingredients?.name ?? '',
            }))
            .filter((ingredient) => ingredient.name),
        }))
        setRecipes(normalized)
      }

      setLoading(false)
    }

    loadRecipes()

    return () => {
      isMounted = false
    }
  }, [])

  const handleRequestDelete = (recipe) => {
    if (!recipe?.id) return
    setPendingDeleteRecipe(recipe)
    setShowDeleteConfirm(true)
    setDeleteError('')
  }

  const handleConfirmDelete = async () => {
    if (!pendingDeleteRecipe?.id) return

    setDeletingId(pendingDeleteRecipe.id)
    setDeleteError('')

    const { error: removeError } = await supabase
      .from('recipes')
      .delete()
      .eq('id', pendingDeleteRecipe.id)

    if (removeError) {
      const isForeignKeyError =
        removeError.code === '23503' ||
        /foreign key|recipe_ingredients|recipe_steps|menu_recipes|plan_recipes|constraint/i.test(
          removeError.message || ''
        )

      setDeleteError(
        isForeignKeyError
          ? 'Cannot delete this recipe because it is still used in related data.'
          : removeError.message ?? 'Unable to delete recipe.'
      )
      setDeletingId('')
      return
    }

    setRecipes((previous) => previous.filter((recipe) => recipe.id !== pendingDeleteRecipe.id))
    setDeletingId('')
    setShowDeleteConfirm(false)
    setPendingDeleteRecipe(null)
    setDeleteError('')
  }

  const filteredRecipes = useMemo(() => {
    const ingredientFiltered = selectedIngredients.length > 0
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
        <title>Recipes - Recipes</title>
      </Helmet>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-sky-900 dark:text-sky-100">All Recipes</h1>
          <p className="mt-2 text-sm text-sky-600 dark:text-sky-300">
            Recipes are shared with all users.
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
        {loading ? (
          <p className="text-sm text-sky-500 dark:text-sky-400">Loading recipes...</p>
        ) : error ? (
          <p className="text-sm text-rose-300">{error}</p>
        ) : filteredRecipes.length === 0 ? (
          <div className="flex flex-col gap-3 rounded-xl border border-dashed border-sky-200 bg-sky-50 p-6 text-center dark:border-sky-800 dark:bg-sky-900/50">
            <p className="text-sm text-sky-600 dark:text-sky-300">No recipes match this filter.</p>
            <p className="text-xs text-sky-500 dark:text-sky-500">
              Try another ingredient filter or add a new recipe.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {filteredRecipes.map((recipe) => {
              const badges = [
                {
                  label: 'Prep',
                  value: recipe.pre_minutes,
                  display: formatMinutes(recipe.pre_minutes),
                },
                {
                  label: 'Cook',
                  value: recipe.cook_minutes,
                  display: formatMinutes(recipe.cook_minutes),
                },
                {
                  label: 'Serves',
                  value: recipe.servings,
                  display: recipe.servings,
                },
              ].filter(
                (badge) =>
                  badge.value !== null &&
                  badge.value !== undefined &&
                  badge.value !== ''
              )
              const heatBadge = formatHeatBadge(recipe.heat)

              return (
                <div
                  key={recipe.id}
                  className="rounded-xl border border-sky-200 bg-white p-5 dark:border-sky-800 dark:bg-sky-900/50"
                >
                  <div className="flex h-full flex-col gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-sky-900 dark:text-sky-100">
                        {recipe.title || 'Untitled Recipe'}
                      </h3>
                      {selectedIngredients.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {recipe.ingredients
                            .filter((ingredient) => selectedIngredients.includes(ingredient.name))
                            .map((ingredient) => (
                              <span
                                key={`${recipe.id}-filter-${ingredient.id || ingredient.name}`}
                                className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:border-emerald-700/60 dark:bg-emerald-900/40 dark:text-emerald-200"
                              >
                                {ingredient.name}
                              </span>
                            ))}
                        </div>
                      ) : null}
                      {recipe.description ? (
                        <p className="mt-1 text-sm text-sky-500 dark:text-sky-400">
                          {recipe.description}
                        </p>
                      ) : null}
                    </div>
                    {badges.length > 0 || heatBadge ? (
                      <div className="mt-auto flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-600 dark:text-sky-300">
                        {badges.map((badge) => (
                          <span
                            key={badge.label}
                            className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 dark:border-sky-800 dark:bg-sky-900/60"
                          >
                            {badge.label} {badge.display}
                          </span>
                        ))}
                        {heatBadge ? (
                          <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 dark:border-sky-800 dark:bg-sky-900/60">
                            {heatBadge}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Link
                        to={`/recipe/${recipe.id}/view`}
                        className="rounded-full bg-sky-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-lg shadow-black/10 transition hover:bg-sky-800 dark:bg-white dark:text-sky-900 dark:shadow-black/20 dark:hover:bg-sky-100"
                      >
                        View
                      </Link>
                      <Link
                        to={`/recipe/${recipe.id}/edit`}
                        className="rounded-full border border-sky-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700 transition hover:border-sky-400 hover:text-sky-900 dark:border-sky-700 dark:text-sky-200 dark:hover:border-sky-500 dark:hover:text-white"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleRequestDelete(recipe)}
                        className="rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-rose-600 transition hover:border-rose-400 hover:text-rose-700 dark:border-rose-500/40 dark:text-rose-200 dark:hover:border-rose-400 dark:hover:text-rose-100"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
            <Link
              to="/create"
              className="group flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-sky-300 bg-sky-50 px-5 py-4 text-center transition hover:border-sky-400 hover:bg-sky-100 dark:border-sky-700 dark:bg-sky-900/40 dark:hover:border-sky-500 dark:hover:bg-sky-900/70"
            >
              <span className="text-3xl font-semibold leading-none text-sky-700 transition group-hover:text-sky-900 dark:text-sky-200 dark:group-hover:text-white">
                +
              </span>
              <span className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-600 dark:text-sky-300">
                Create Recipe
              </span>
            </Link>
          </div>
        )}
      </div>

      {showDeleteConfirm && pendingDeleteRecipe ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-sky-950/60 px-6">
          <div className="w-full max-w-md rounded-2xl border border-sky-200 bg-white p-6 shadow-2xl dark:border-sky-800 dark:bg-sky-950">
            <h2 className="text-xl font-semibold text-sky-900 dark:text-sky-100">
              Delete this recipe?
            </h2>
            <p className="mt-2 text-sm text-sky-600 dark:text-sky-300">
              You are about to remove{' '}
              <span className="font-semibold">
                {pendingDeleteRecipe.title || 'Untitled Recipe'}
              </span>
              .
            </p>
            {deleteError ? <p className="mt-3 text-sm text-rose-300">{deleteError}</p> : null}
            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  if (deletingId) return
                  setShowDeleteConfirm(false)
                  setPendingDeleteRecipe(null)
                  setDeleteError('')
                }}
                className="rounded-full border border-sky-200 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:border-sky-400 hover:text-sky-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-sky-700 dark:text-sky-200 dark:hover:border-sky-500 dark:hover:text-white"
                disabled={Boolean(deletingId)}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="rounded-full bg-rose-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-black/10 transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-rose-500 dark:hover:bg-rose-400"
                disabled={Boolean(deletingId)}
              >
                {deletingId === pendingDeleteRecipe.id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
