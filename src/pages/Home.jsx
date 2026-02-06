import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function formatMinutes(value) {
  if (value === null || value === undefined || value === '') return '—'
  return `${value} min`
}

export default function Home() {
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
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <p className="text-xs uppercase tracking-[0.3em] text-sky-500 dark:text-sky-400">Welcome</p>
        <h1 className="text-4xl font-semibold sm:text-5xl">Your Recipe Hub</h1>
        <p className="text-base text-sky-600 dark:text-sky-300">
          Add your first recipe or browse what you have saved.
        </p>
      </header>

      <section className="rounded-2xl border border-sky-200 bg-white/80 p-6 shadow-lg shadow-black/5 dark:border-sky-800 dark:bg-sky-950/70 dark:shadow-black/20">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">All Recipes</h2>
          <Link
            className="rounded-full bg-sky-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-800 dark:bg-white dark:text-sky-900 dark:hover:bg-sky-100"
            to="/create"
          >
            Create Recipe
          </Link>
        </div>

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
          <div className="grid gap-4">
            {recipes.map((recipe) => (
              <Link
                key={recipe.id}
                to={`/recipe/${recipe.id}/view`}
                className="group rounded-xl border border-sky-200 bg-white p-5 transition hover:border-sky-400 hover:bg-sky-50 dark:border-sky-800 dark:bg-sky-900/50 dark:hover:border-sky-600 dark:hover:bg-sky-900"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-sky-900 group-hover:text-sky-900 dark:text-sky-100 dark:group-hover:text-white">
                        {recipe.title || 'Untitled Recipe'}
                      </h3>
                      <p className="mt-1 text-sm text-sky-500 dark:text-sky-400">
                        {recipe.description || 'No description yet.'}
                      </p>
                    </div>
                    <span className="text-xs uppercase tracking-[0.2em] text-sky-500 dark:text-sky-500">
                      View
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-sky-500 dark:text-sky-400">
                    <span>Prep: {formatMinutes(recipe.pre_minutes)}</span>
                    <span>Cook: {formatMinutes(recipe.cook_minutes)}</span>
                    <span>Servings: {recipe.servings ?? '—'}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
