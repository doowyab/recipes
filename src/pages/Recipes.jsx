import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { supabase } from '../lib/supabase'

function formatMinutes(value) {
  if (value === null || value === undefined || value === '') return '—'
  return `${value} min`
}

export default function Recipes() {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadRecipes() {
      setLoading(true)
      setError('')

      const { data, error: fetchError } = await supabase
        .from('recipes')
        .select('id, title, description, pre_minutes, cook_minutes, servings')

      if (!isMounted) return

      if (fetchError) {
        setError(fetchError.message ?? 'Unable to load recipes.')
        setRecipes([])
      } else {
        setRecipes(data ?? [])
      }

      setLoading(false)
    }

    loadRecipes()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <>
      <Helmet>
        <title>Recipes - Recipes</title>
      </Helmet>
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold text-sky-900 dark:text-sky-100">All Recipes</h1>
        {loading ? (
          <p className="text-sm text-sky-500 dark:text-sky-400">Loading recipes...</p>
        ) : error ? (
          <p className="text-sm text-rose-300">{error}</p>
        ) : recipes.length === 0 ? (
          <div className="flex flex-col gap-3 rounded-xl border border-dashed border-sky-200 bg-sky-50 p-6 text-center dark:border-sky-800 dark:bg-sky-900/50">
            <p className="text-sm text-sky-600 dark:text-sky-300">No recipes yet.</p>
            <p className="text-xs text-sky-500 dark:text-sky-500">
              Create your first recipe to see it listed here.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {recipes.map((recipe) => {
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
                  label: 'Servings',
                  value: recipe.servings,
                  display: recipe.servings,
                },
              ].filter(
                (badge) =>
                  badge.value !== null &&
                  badge.value !== undefined &&
                  badge.value !== ''
              )

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
                      {recipe.description ? (
                        <p className="mt-1 text-sm text-sky-500 dark:text-sky-400">
                          {recipe.description}
                        </p>
                      ) : null}
                    </div>
                    {badges.length > 0 ? (
                      <div className="mt-auto flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-600 dark:text-sky-300">
                        {badges.map((badge) => (
                          <span
                            key={badge.label}
                            className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 dark:border-sky-800 dark:bg-sky-900/60"
                          >
                            {badge.label} {badge.display}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Link
                        to={`/recipe/${recipe.id}/view`}
                        className="rounded-full border border-sky-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700 transition hover:border-sky-400 hover:text-sky-900 dark:border-sky-700 dark:text-sky-200 dark:hover:border-sky-500 dark:hover:text-white"
                      >
                        View
                      </Link>
                      <Link
                        to={`/recipe/${recipe.id}/edit`}
                        className="rounded-full bg-sky-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-lg shadow-black/10 transition hover:bg-sky-800 dark:bg-white dark:text-sky-900 dark:shadow-black/20 dark:hover:bg-sky-100"
                      >
                        Edit
                      </Link>
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
    </>
  )
}
