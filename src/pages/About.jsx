import { Helmet } from 'react-helmet-async'

export default function About() {
  return (
    <>
      <Helmet>
        <title>About - Recipes</title>
      </Helmet>
      <div className="rounded-2xl border border-sky-200 bg-white p-6 shadow-sm shadow-black/5 dark:border-sky-800 dark:bg-sky-950/65 dark:shadow-black/20 md:p-8">
        <h1 className="text-2xl font-semibold text-sky-900 dark:text-sky-100">About</h1>
        <p className="mt-3 max-w-3xl text-sm text-sky-600 dark:text-sky-300 md:text-base">
          Recipe Synergy helps households keep recipes in one place, plan meals for the week, and
          reduce waste by reusing overlapping ingredients.
        </p>
      </div>
    </>
  )
}
