import { Helmet } from 'react-helmet-async'
import heroImage from '../images/ella-olsson-KPDbRyFOTnE-unsplash.jpg'

export default function Home() {
  return (
    <>
      <Helmet>
        <title>Home - Recipes</title>
      </Helmet>
      <div className="flex flex-col gap-8 pb-4">
        <section className="relative overflow-hidden rounded-3xl border border-sky-200/80 bg-gradient-to-br from-white via-sky-50 to-cyan-100 p-6 shadow-xl shadow-black/10 dark:border-sky-800/70 dark:from-sky-950 dark:via-sky-900 dark:to-cyan-950/80 dark:shadow-black/30 md:p-10">
          <div className="pointer-events-none absolute -top-20 -right-16 h-52 w-52 rounded-full bg-cyan-300/25 blur-3xl dark:bg-cyan-400/10" />
          <div className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-sky-300/35 blur-2xl dark:bg-sky-500/10" />
          <div className="relative grid gap-8 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:items-center">
            <div className="space-y-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700 dark:text-sky-300">
                Meal Planning, Finally Simpler
              </p>
              <h1 className="max-w-2xl text-3xl font-semibold leading-tight text-sky-950 dark:text-white md:text-5xl">
                Planning meals is hard when your recipes live everywhere.
              </h1>
              <p className="max-w-xl text-base text-sky-700 dark:text-sky-200 md:text-lg">
                Wouldn&apos;t it be easier if all your recipes were in one place, your favorites were
                easy to plan, and new synergies surfaced from fresh ingredients you already use?
              </p>
            </div>
            <div className="h-[20rem] overflow-hidden rounded-2xl border border-sky-200 bg-white/70 shadow-lg shadow-black/10 dark:border-sky-800 dark:bg-sky-950/60 md:h-[24rem]">
              <img
                src={heroImage}
                alt="Prepared meal ingredients and dishes arranged for planning and cooking"
                className="block h-full w-full object-cover object-center"
                loading="lazy"
              />
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <article className="rounded-2xl border border-sky-200 bg-white p-5 shadow-sm shadow-black/5 dark:border-sky-800 dark:bg-sky-950/65 dark:shadow-black/20">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-500 dark:text-sky-400">
              1. Store
            </p>
            <h2 className="mt-2 text-xl font-semibold text-sky-900 dark:text-sky-100">
              Add your favorite recipes
            </h2>
            <p className="mt-2 text-sm text-sky-600 dark:text-sky-300">
              Keep your best meals in one place instead of juggling notes, links, and screenshots.
            </p>
          </article>

          <article className="rounded-2xl border border-sky-200 bg-white p-5 shadow-sm shadow-black/5 dark:border-sky-800 dark:bg-sky-950/65 dark:shadow-black/20">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-500 dark:text-sky-400">
              2. Plan
            </p>
            <h2 className="mt-2 text-xl font-semibold text-sky-900 dark:text-sky-100">
              Plan out your next week
            </h2>
            <p className="mt-2 text-sm text-sky-600 dark:text-sky-300">
              Build your week quickly from the recipes you already trust.
            </p>
          </article>

          <article className="rounded-2xl border border-sky-200 bg-white p-5 shadow-sm shadow-black/5 dark:border-sky-800 dark:bg-sky-950/65 dark:shadow-black/20">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-500 dark:text-sky-400">
              3. Discover
            </p>
            <h2 className="mt-2 text-xl font-semibold text-sky-900 dark:text-sky-100">
              Get smart recipe suggestions
            </h2>
            <p className="mt-2 text-sm text-sky-600 dark:text-sky-300">
              Discover recipes that synergize with ingredients you already plan to use.
            </p>
          </article>

          <article className="rounded-2xl border border-sky-200 bg-white p-5 shadow-sm shadow-black/5 dark:border-sky-800 dark:bg-sky-950/65 dark:shadow-black/20">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-500 dark:text-sky-400">
              4. Shop
            </p>
            <h2 className="mt-2 text-xl font-semibold text-sky-900 dark:text-sky-100">
              Go shopping with an automated list
            </h2>
            <p className="mt-2 text-sm text-sky-600 dark:text-sky-300">
              Check what you already have and buy only what you need.
            </p>
          </article>

          <article className="rounded-2xl border border-sky-200 bg-white p-5 shadow-sm shadow-black/5 dark:border-sky-800 dark:bg-sky-950/65 dark:shadow-black/20">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-500 dark:text-sky-400">
              5. Cook
            </p>
            <h2 className="mt-2 text-xl font-semibold text-sky-900 dark:text-sky-100">
              Cook from your planned recipes
            </h2>
            <p className="mt-2 text-sm text-sky-600 dark:text-sky-300">
              No bookmarking or remembering what to make next.
            </p>
          </article>
        </section>

        <section className="rounded-3xl border border-sky-200 bg-white p-6 shadow-md shadow-black/5 dark:border-sky-800 dark:bg-sky-950/65 dark:shadow-black/20 md:p-8">
          <div>
            <div>
              <h2 className="text-2xl font-semibold text-sky-900 dark:text-sky-100 md:text-3xl">
                Save it now. Recall it instantly later.
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-sky-600 dark:text-sky-300 md:text-base">
                Keep your meal planning flow simple: collect recipes, pick your plan, and return to
                your best ideas when it&apos;s time to cook.
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
