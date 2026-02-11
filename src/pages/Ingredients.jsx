import { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

async function fetchIngredientsWithUsage() {
  const [{ data: ingredientRows, error: ingredientError }, { data: usageRows, error: usageError }] =
    await Promise.all([
      supabase
        .from('ingredients')
        .select('id, name, is_synergy_core, default_unit')
        .order('name', { ascending: true }),
      supabase.from('recipe_ingredients').select('ingredient_id'),
    ])

  if (ingredientError) {
    return { error: ingredientError.message ?? 'Unable to load ingredients.', data: [] }
  }

  if (usageError) {
    return { error: usageError.message ?? 'Unable to load ingredient usage.', data: [] }
  }

  const usageCountByIngredientId = new Map()
  ;(usageRows ?? []).forEach((row) => {
    const ingredientId = row?.ingredient_id
    if (!ingredientId) return
    usageCountByIngredientId.set(ingredientId, (usageCountByIngredientId.get(ingredientId) ?? 0) + 1)
  })

  const ingredients = (ingredientRows ?? []).map((ingredient) => ({
    ...ingredient,
    usageCount: usageCountByIngredientId.get(ingredient.id) ?? 0,
  }))

  return { error: '', data: ingredients }
}

export default function Ingredients() {
  const [ingredients, setIngredients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [editingIngredient, setEditingIngredient] = useState(null)
  const [editName, setEditName] = useState('')
  const [editDefaultUnit, setEditDefaultUnit] = useState('')
  const [editIsSynergyCore, setEditIsSynergyCore] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [saveSuccess, setSaveSuccess] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [usageModalIngredient, setUsageModalIngredient] = useState(null)
  const [usageRecipes, setUsageRecipes] = useState([])
  const [usageLoading, setUsageLoading] = useState(false)
  const [usageError, setUsageError] = useState('')

  const ingredientCountText = useMemo(() => {
    const total = ingredients.length
    if (total === 1) return '1 ingredient'
    return `${total} ingredients`
  }, [ingredients])

  useEffect(() => {
    let isMounted = true

    async function loadIngredients() {
      setLoading(true)
      setError('')

      const { data, error: fetchError } = await fetchIngredientsWithUsage()

      if (!isMounted) return

      if (fetchError) {
        setError(fetchError)
        setIngredients(data ?? [])
      } else {
        setIngredients(data ?? [])
      }

      setLoading(false)
    }

    loadIngredients()

    return () => {
      isMounted = false
    }
  }, [])

  const openEditModal = (ingredient) => {
    setEditingIngredient(ingredient)
    setEditName(ingredient.name || '')
    setEditDefaultUnit(ingredient.default_unit || '')
    setEditIsSynergyCore(Boolean(ingredient.is_synergy_core))
    setSaveError('')
  }

  const closeEditModal = () => {
    if (saveLoading) return
    setEditingIngredient(null)
    setSaveError('')
  }

  const openDeleteModal = (ingredient) => {
    setDeleteTarget(ingredient)
    setDeleteError('')
  }

  const closeDeleteModal = () => {
    if (deleteLoading) return
    setDeleteTarget(null)
    setDeleteError('')
  }

  const handleSaveIngredient = async (event) => {
    event.preventDefault()
    if (!editingIngredient?.id) return

    const trimmedName = editName.trim()
    const trimmedDefaultUnit = editDefaultUnit.trim()

    if (!trimmedName) {
      setSaveError('Ingredient name is required.')
      return
    }

    setSaveLoading(true)
    setSaveError('')
    setSaveSuccess('')

    const { error: updateError } = await supabase
      .from('ingredients')
      .update({
        name: trimmedName,
        default_unit: trimmedDefaultUnit || null,
        is_synergy_core: editIsSynergyCore,
      })
      .eq('id', editingIngredient.id)

    if (updateError) {
      setSaveError(updateError.message ?? 'Unable to save ingredient.')
      setSaveLoading(false)
      return
    }

    const { data, error: refreshError } = await fetchIngredientsWithUsage()

    if (refreshError) {
      setSaveError(refreshError || 'Saved, but failed to refresh ingredients.')
      setSaveLoading(false)
      return
    }

    setIngredients(data ?? [])
    setEditingIngredient(null)
    setSaveLoading(false)
    setSaveSuccess(`Saved ${trimmedName}.`)
    setTimeout(() => {
      setSaveSuccess('')
    }, 2500)
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget?.id) return

    const ingredientName = deleteTarget.name || 'ingredient'

    setDeleteLoading(true)
    setDeleteError('')
    setSaveSuccess('')

    const { error: removeError } = await supabase
      .from('ingredients')
      .delete()
      .eq('id', deleteTarget.id)

    if (removeError) {
      const isForeignKeyError =
        removeError.code === '23503' ||
        /foreign key|recipe_ingredients|constraint/i.test(removeError.message || '')

      setDeleteError(
        isForeignKeyError
          ? 'Cannot delete this ingredient because it is used in one or more recipes.'
          : removeError.message ?? 'Unable to delete ingredient.'
      )
      setDeleteLoading(false)
      return
    }

    const { data, error: refreshError } = await fetchIngredientsWithUsage()

    if (refreshError) {
      setDeleteError(refreshError || 'Deleted, but failed to refresh ingredients.')
      setDeleteLoading(false)
      return
    }

    setIngredients(data ?? [])
    setDeleteTarget(null)
    setDeleteLoading(false)
    setSaveSuccess(`Deleted ${ingredientName}.`)
    setTimeout(() => {
      setSaveSuccess('')
    }, 2500)
  }

  const openUsageModal = async (ingredient) => {
    if (!ingredient?.id || !ingredient.usageCount) return

    setUsageModalIngredient(ingredient)
    setUsageRecipes([])
    setUsageLoading(true)
    setUsageError('')

    const { data, error: usageFetchError } = await supabase
      .from('recipe_ingredients')
      .select('recipes ( id, title )')
      .eq('ingredient_id', ingredient.id)

    if (usageFetchError) {
      setUsageError(usageFetchError.message ?? 'Unable to load recipes for this ingredient.')
      setUsageLoading(false)
      return
    }

    const uniqueById = new Map()
    ;(data ?? []).forEach((row) => {
      const recipe = row?.recipes
      if (!recipe?.id) return
      uniqueById.set(recipe.id, {
        id: recipe.id,
        title: recipe.title || 'Untitled recipe',
      })
    })

    const recipes = Array.from(uniqueById.values()).sort((a, b) =>
      a.title.localeCompare(b.title)
    )

    setUsageRecipes(recipes)
    setUsageLoading(false)
  }

  const closeUsageModal = () => {
    if (usageLoading) return
    setUsageModalIngredient(null)
    setUsageRecipes([])
    setUsageError('')
  }

  return (
    <>
      <Helmet>
        <title>Ingredients - Recipes</title>
      </Helmet>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-sky-900 dark:text-sky-100">Ingredients</h1>
            <p className="mt-1 text-sm text-sky-600 dark:text-sky-300">
              All ingredients defined in your database.
            </p>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-500 dark:text-sky-400">
            {ingredientCountText}
          </p>
        </div>

        {saveSuccess ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-900/20 dark:text-emerald-200">
            {saveSuccess}
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-sky-500 dark:text-sky-400">Loading ingredients...</p>
        ) : error ? (
          <p className="text-sm text-rose-300">{error}</p>
        ) : ingredients.length === 0 ? (
          <div className="rounded-xl border border-dashed border-sky-200 bg-sky-50 p-6 text-center dark:border-sky-800 dark:bg-sky-900/50">
            <p className="text-sm text-sky-600 dark:text-sky-300">No ingredients found.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-sky-200 bg-white shadow-sm shadow-black/5 dark:border-sky-800 dark:bg-sky-950/65 dark:shadow-black/20">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-sky-200 bg-sky-50 text-xs font-semibold uppercase tracking-[0.18em] text-sky-600 dark:border-sky-800 dark:bg-sky-900/40 dark:text-sky-300">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Default Unit</th>
                    <th className="px-4 py-3">Synergy Core</th>
                    <th className="px-4 py-3">Used</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {ingredients.map((ingredient) => (
                    <tr
                      key={ingredient.id}
                      className="border-b border-sky-100/80 text-sky-800 last:border-0 dark:border-sky-800/70 dark:text-sky-100"
                    >
                      <td className="px-4 py-3 font-semibold">{ingredient.name || 'Unnamed ingredient'}</td>
                      <td className="px-4 py-3 text-sky-600 dark:text-sky-300">
                        {ingredient.default_unit || '—'}
                      </td>
                      <td className="px-4 py-3 text-sky-600 dark:text-sky-300">
                        {ingredient.is_synergy_core ? 'Yes' : 'No'}
                      </td>
                      <td className="px-4 py-3 text-sky-600 dark:text-sky-300">
                        {ingredient.usageCount > 0 ? (
                          <button
                            type="button"
                            onClick={() => openUsageModal(ingredient)}
                            className="font-semibold text-sky-700 underline decoration-sky-300 underline-offset-2 transition hover:text-sky-900 dark:text-sky-200 dark:decoration-sky-600 dark:hover:text-white"
                          >
                            {ingredient.usageCount}
                          </button>
                        ) : (
                          <span>{ingredient.usageCount}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(ingredient)}
                            className="rounded-full border border-sky-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700 transition hover:border-sky-400 hover:text-sky-900 dark:border-sky-700 dark:text-sky-200 dark:hover:border-sky-500 dark:hover:text-white"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteModal(ingredient)}
                            className="rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-rose-600 transition hover:border-rose-400 hover:text-rose-700 dark:border-rose-500/40 dark:text-rose-200 dark:hover:border-rose-400 dark:hover:text-rose-100"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {editingIngredient ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-sky-950/60 px-6">
          <div className="w-full max-w-lg rounded-2xl border border-sky-200 bg-white p-6 shadow-2xl dark:border-sky-800 dark:bg-sky-950">
            <h2 className="text-xl font-semibold text-sky-900 dark:text-sky-100">Edit ingredient</h2>
            <p className="mt-2 text-sm text-sky-600 dark:text-sky-300">
              Update details for this ingredient.
            </p>

            <form onSubmit={handleSaveIngredient} className="mt-6 flex flex-col gap-4">
              <label className="flex flex-col gap-2 text-sm font-semibold text-sky-800 dark:text-sky-100">
                Name
                <input
                  className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm text-sky-900 outline-none placeholder:text-slate-400 focus:border-sky-900 focus:ring-2 focus:ring-sky-900/20 dark:border-sky-800 dark:bg-sky-900 dark:text-sky-100 dark:placeholder:text-slate-500 dark:focus:border-white dark:focus:ring-white/40"
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  placeholder="Tomato"
                  autoFocus
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-semibold text-sky-800 dark:text-sky-100">
                Default unit
                <input
                  className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm text-sky-900 outline-none placeholder:text-slate-400 focus:border-sky-900 focus:ring-2 focus:ring-sky-900/20 dark:border-sky-800 dark:bg-sky-900 dark:text-sky-100 dark:placeholder:text-slate-500 dark:focus:border-white dark:focus:ring-white/40"
                  value={editDefaultUnit}
                  onChange={(event) => setEditDefaultUnit(event.target.value)}
                  placeholder="g"
                />
              </label>

              <label className="flex items-center gap-3 text-sm font-semibold text-sky-800 dark:text-sky-100">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-sky-300 text-sky-900 focus:ring-sky-900/20 dark:border-sky-700 dark:bg-sky-900 dark:text-sky-200"
                  checked={editIsSynergyCore}
                  onChange={(event) => setEditIsSynergyCore(event.target.checked)}
                />
                Is synergy core ingredient
              </label>

              {saveError ? <p className="text-sm text-rose-300">{saveError}</p> : null}

              <div className="mt-2 flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="rounded-full border border-sky-200 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:border-sky-400 hover:text-sky-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-sky-700 dark:text-sky-200 dark:hover:border-sky-500 dark:hover:text-white"
                  disabled={saveLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveLoading || !editName.trim()}
                  className="rounded-full bg-sky-900 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-black/10 transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-sky-900 dark:shadow-black/20 dark:hover:bg-sky-100"
                >
                  {saveLoading ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-sky-950/60 px-6">
          <div className="w-full max-w-md rounded-2xl border border-sky-200 bg-white p-6 shadow-2xl dark:border-sky-800 dark:bg-sky-950">
            <h2 className="text-xl font-semibold text-sky-900 dark:text-sky-100">
              Delete this ingredient?
            </h2>
            <p className="mt-2 text-sm text-sky-600 dark:text-sky-300">
              You are about to remove{' '}
              <span className="font-semibold">{deleteTarget.name || 'this ingredient'}</span>.
            </p>
            {deleteError ? <p className="mt-3 text-sm text-rose-300">{deleteError}</p> : null}
            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="rounded-full border border-sky-200 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:border-sky-400 hover:text-sky-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-sky-700 dark:text-sky-200 dark:hover:border-sky-500 dark:hover:text-white"
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="rounded-full bg-rose-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-black/10 transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-rose-500 dark:hover:bg-rose-400"
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {usageModalIngredient ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-sky-950/60 px-6">
          <div className="w-full max-w-lg rounded-2xl border border-sky-200 bg-white p-6 shadow-2xl dark:border-sky-800 dark:bg-sky-950">
            <h2 className="text-xl font-semibold text-sky-900 dark:text-sky-100">
              {usageModalIngredient.name || 'This ingredient'} is used in{' '}
              {usageModalIngredient.usageCount} recipe
              {usageModalIngredient.usageCount === 1 ? '' : 's'}.
            </h2>

            {usageLoading ? (
              <p className="mt-4 text-sm text-sky-500 dark:text-sky-400">Loading recipes...</p>
            ) : usageError ? (
              <p className="mt-4 text-sm text-rose-300">{usageError}</p>
            ) : usageRecipes.length === 0 ? (
              <p className="mt-4 text-sm text-sky-500 dark:text-sky-400">
                No recipes found for this ingredient.
              </p>
            ) : (
              <ul className="mt-4 max-h-72 list-disc overflow-auto pl-6 text-sm text-sky-700 dark:text-sky-200">
                {usageRecipes.map((recipe) => (
                  <li key={recipe.id} className="py-1">
                    <Link
                      to={`/recipe/${recipe.id}/view`}
                      className="transition hover:text-sky-900 hover:underline dark:hover:text-white"
                    >
                      {recipe.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={closeUsageModal}
                className="rounded-full border border-sky-200 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:border-sky-400 hover:text-sky-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-sky-700 dark:text-sky-200 dark:hover:border-sky-500 dark:hover:text-white"
                disabled={usageLoading}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
