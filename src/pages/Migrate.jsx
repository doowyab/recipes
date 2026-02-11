import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Migrate() {
  const navigate = useNavigate()
  const [household, setHousehold] = useState(null)
  const [planRecipes, setPlanRecipes] = useState([])
  const [menuRecipes, setMenuRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [pendingAction, setPendingAction] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadMigrate() {
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
        setError('Please sign in to manage your menu.')
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
        setPlanRecipes([])
        setMenuRecipes([])
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

      const [planRows, menuRows] = await Promise.all([
        supabase
          .from('plan_recipes')
          .select('recipe_id')
          .eq('household_id', memberRow.household_id),
        supabase
          .from('menu_recipes')
          .select('recipe_id')
          .eq('household_id', memberRow.household_id),
      ])

      if (planRows.error) {
        setError(planRows.error.message ?? 'Unable to load plan recipes.')
        setLoading(false)
        return
      }

      if (menuRows.error) {
        setError(menuRows.error.message ?? 'Unable to load menu recipes.')
        setLoading(false)
        return
      }

      const planIds = (planRows.data ?? [])
        .map((row) => row.recipe_id)
        .filter(Boolean)
      const menuIds = (menuRows.data ?? [])
        .map((row) => row.recipe_id)
        .filter(Boolean)

      const [planRecipesResult, menuRecipesResult] = await Promise.all([
        planIds.length > 0
          ? supabase.from('recipes').select('id, title').in('id', planIds).order('title')
          : Promise.resolve({ data: [], error: null }),
        menuIds.length > 0
          ? supabase.from('recipes').select('id, title').in('id', menuIds).order('title')
          : Promise.resolve({ data: [], error: null }),
      ])

      if (planRecipesResult.error) {
        setError(planRecipesResult.error.message ?? 'Unable to load plan recipes.')
        setLoading(false)
        return
      }

      if (menuRecipesResult.error) {
        setError(menuRecipesResult.error.message ?? 'Unable to load menu recipes.')
        setLoading(false)
        return
      }

      const normalize = (rows) =>
        (rows ?? []).map((recipe) => ({
          id: recipe.id,
          title: recipe.title || 'Untitled recipe',
        }))

      setPlanRecipes(normalize(planRecipesResult.data))
      setMenuRecipes(normalize(menuRecipesResult.data))
      setLoading(false)
    }

    loadMigrate()

    return () => {
      isMounted = false
    }
  }, [])

  const handleAction = (action) => {
    setPendingAction(action)
    setShowConfirm(true)
  }

  const handleConfirm = async () => {
    if (!household?.id) return
    if (planRecipes.length === 0) return

    setSaving(true)
    setError('')

    const planIds = planRecipes.map((recipe) => recipe.id)

    if (pendingAction === 'replace') {
      const { error: deleteError } = await supabase
        .from('menu_recipes')
        .delete()
        .eq('household_id', household.id)

      if (deleteError) {
        setError(deleteError.message ?? 'Unable to replace menu recipes.')
        setSaving(false)
        return
      }
    }

    if (pendingAction === 'add' || pendingAction === 'replace') {
      const existingIds = new Set(menuRecipes.map((recipe) => recipe.id))
      const rows = planIds
        .filter((recipeId) => pendingAction === 'replace' || !existingIds.has(recipeId))
        .map((recipeId) => ({
          household_id: household.id,
          recipe_id: recipeId,
        }))

      if (rows.length > 0) {
        const { error: insertError } = await supabase
          .from('menu_recipes')
          .insert(rows)

        if (insertError) {
          setError(insertError.message ?? 'Unable to update menu recipes.')
          setSaving(false)
          return
        }
      }
    }

    const { error: clearPlanError } = await supabase
      .from('plan_recipes')
      .delete()
      .eq('household_id', household.id)

    if (clearPlanError) {
      setError(clearPlanError.message ?? 'Unable to clear plan recipes.')
      setSaving(false)
      return
    }

    setSaving(false)
    setShowConfirm(false)
    navigate('/menu', { replace: true })
  }

  return (
    <>
      <Helmet>
        <title>Move to Menu - Recipes</title>
      </Helmet>
      <div className="flex flex-col gap-6">
        {loading ? (
          <p className="text-sm text-sky-500 dark:text-sky-400">
            Loading menu migration...
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
              to manage its menu.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-semibold text-sky-900 dark:text-sky-100">
              Ready to start cooking?
            </h1>
            <p className="text-sm text-sky-600 dark:text-sky-300">
              Once you have purchased the ingredients for your planned meals, you can add them to your ready to go menu.
            </p>
            <div className="grid gap-6 lg:grid-cols-[1fr_auto_1fr] lg:items-start">
              <section>
                <h2 className="text-lg font-semibold text-sky-900 dark:text-sky-100">
                  Planned recipes
                </h2>
                {planRecipes.length === 0 ? (
                  <p className="mt-3 text-sm text-sky-600 dark:text-sky-300">
                    No recipes in the plan yet.
                  </p>
                ) : (
                  <ul className="mt-4 flex flex-col gap-2 text-sm text-sky-700 dark:text-sky-200">
                    {planRecipes.map((recipe) => (
                      <li
                        key={recipe.id}
                        className="rounded-lg border border-sky-100 bg-white px-3 py-2 font-semibold text-sky-900 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-100"
                      >
                        {recipe.title}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <div className="flex items-center justify-center text-2xl font-semibold text-sky-400 dark:text-sky-600">
                →
              </div>

              <section>
                <h2 className="text-lg font-semibold text-sky-900 dark:text-sky-100">
                  Menu recipes
                </h2>
                {menuRecipes.length === 0 ? (
                  <p className="mt-3 text-sm text-sky-600 dark:text-sky-300">
                    No recipes on the menu yet.
                  </p>
                ) : (
                  <ul className="mt-4 flex flex-col gap-2 text-sm text-sky-700 dark:text-sky-200">
                    {menuRecipes.map((recipe) => (
                      <li
                        key={recipe.id}
                        className="rounded-lg border border-sky-100 bg-white px-3 py-2 font-semibold text-sky-900 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-100"
                      >
                        {recipe.title}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <section className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => handleAction('add')}
                disabled={planRecipes.length === 0}
                className="rounded-full bg-sky-900 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-lg shadow-black/10 transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-sky-900 dark:shadow-black/20 dark:hover:bg-sky-100"
              >
                Add plan to menu
              </button>
              <span className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-500 dark:text-sky-400">
                or
              </span>
              <button
                type="button"
                onClick={() => handleAction('replace')}
                disabled={planRecipes.length === 0}
                className="rounded-full bg-sky-900 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-lg shadow-black/10 transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-sky-900 dark:shadow-black/20 dark:hover:bg-sky-100"
              >
                Replace menu with plan
              </button>
            </section>
          </div>
        )}
      </div>

      {showConfirm ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-sky-950/60 px-6">
          <div className="w-full max-w-md rounded-2xl border border-sky-200 bg-white p-6 shadow-2xl dark:border-sky-800 dark:bg-sky-950">
            <h2 className="text-xl font-semibold text-sky-900 dark:text-sky-100">
              Confirm menu update
            </h2>
            <p className="mt-2 text-sm text-sky-600 dark:text-sky-300">
              {pendingAction === 'replace'
                ? 'This will replace every recipe on the menu with your current plan.'
                : 'This will add planned recipes to the menu and keep what is already there.'}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="rounded-full border border-sky-200 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:border-sky-400 hover:text-sky-900 dark:border-sky-700 dark:text-sky-200 dark:hover:border-sky-500 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={saving}
                className="rounded-full bg-sky-900 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-black/10 transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-sky-900 dark:shadow-black/20 dark:hover:bg-sky-100"
              >
                {saving ? 'Working...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
