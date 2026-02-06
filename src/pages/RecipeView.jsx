import { Link, useParams } from 'react-router-dom'

export default function RecipeView() {
  const { recipeId } = useParams()

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-sky-500 dark:text-sky-400">
        Preview
      </p>
      <h1 className="text-3xl font-semibold sm:text-4xl">Recipe Details</h1>
      <p className="text-base text-sky-600 dark:text-sky-300">
        This page will show the recipe details.
      </p>
      <Link
        to={`/recipe/${recipeId}/edit`}
        className="rounded-full bg-sky-900 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-black/10 transition hover:bg-sky-800 dark:bg-white dark:text-sky-900 dark:shadow-black/20 dark:hover:bg-sky-100"
      >
        Edit Recipe
      </Link>
      <p className="text-sm text-sky-500 dark:text-sky-400">
        Recipe ID: {recipeId}
      </p>
    </div>
  )
}
