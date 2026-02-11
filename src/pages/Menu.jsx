import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Menu() {
  const [household, setHousehold] = useState(null)
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [removingId, setRemovingId] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [pendingRemoveId, setPendingRemoveId] = useState('')
  const [pendingAction, setPendingAction] = useState('')

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
        .select('id, title, description')
        .in('id', recipeIds)
        .order('title')

      if (recipeError) {
        setError(recipeError.message ?? 'Unable to load menu recipes.')
        setRecipes([])
        setLoading(false)
        return
      }

      setRecipes(recipeRows ?? [])
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
              <h2 className="text-lg font-semibold text-sky-900 dark:text-sky-100">
                Menu at {household?.name || 'your home'}
              </h2>
              <p className="text-sm text-sky-600 dark:text-sky-300">
                These are the recipes you picked and planned for. You can mark them off as you cook them, and{' '}
                <Link className="font-semibold text-sky-900 underline dark:text-white" to="/plan">
                  plan
                </Link>{' '}
                the next batch of meals.
              </p>
            </div>
            {recipes.map((recipe) => (
              <div
                key={recipe.id}
                className="flex flex-col gap-3 rounded-xl border border-sky-100 bg-white/90 px-4 py-4 shadow-sm shadow-black/5 backdrop-blur dark:border-sky-900 dark:bg-sky-950/70 dark:shadow-black/20 md:flex-row md:items-start md:justify-between"
              >
                <div>
                  <h3 className="text-lg font-semibold text-sky-900 dark:text-sky-100">
                    {recipe.title || 'Untitled recipe'}
                  </h3>
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
            ))}
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
