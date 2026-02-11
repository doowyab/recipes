import { Helmet } from 'react-helmet-async'

export default function About() {
  return (
    <>
      <Helmet>
        <title>About - Recipes</title>
      </Helmet>
      <div className="flex flex-col gap-10">
        <section>
          <h1 className="text-2xl font-semibold text-sky-900 dark:text-sky-100 md:text-3xl">About</h1>
          <p className="mt-4 text-sm text-sky-600 dark:text-sky-300 md:text-base">
            This site was created as a personal project, to help speed up the process of weekly
            meal planning. No subscriptions, no adverts, no SEO.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-sky-900 dark:text-sky-100 md:text-2xl">Stack</h2>
          <p className="mt-4 text-sm text-sky-600 dark:text-sky-300 md:text-base">
            The frontend is Vite + React, hosted on GitHub Pages.
          </p>
          <p className="mt-2 text-sm text-sky-600 dark:text-sky-300 md:text-base">
            The backend is{' '}
            <a
              href="https://supabase.com"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-sky-700 underline decoration-sky-300 underline-offset-2 transition hover:text-sky-900 dark:text-sky-200 dark:decoration-sky-600 dark:hover:text-white"
            >
              Supabase
            </a>{' '}
            with a hosted PostgreSQL database.
          </p>
          <p className="mt-2 text-sm text-sky-600 dark:text-sky-300 md:text-base">
            The application was written with the assistance of ChatGPT Codex.
          </p>
        </section>
      </div>
    </>
  )
}
