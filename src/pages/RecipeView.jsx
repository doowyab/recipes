import { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function RecipeView() {
  const { recipeId } = useParams()
  const [recipe, setRecipe] = useState(null)
  const [ingredients, setIngredients] = useState([])
  const [steps, setSteps] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeStepId, setActiveStepId] = useState(null)

  const formattedSteps = useMemo(() => {
    let stepCount = 0
    return steps.map((step) => {
      if (step.is_heading) {
        return { ...step, displayIndex: null }
      }
      stepCount += 1
      return { ...step, displayIndex: stepCount }
    })
  }, [steps])

  const nonHeadingSteps = useMemo(
    () => formattedSteps.filter((step) => !step.is_heading),
    [formattedSteps]
  )

  const stepIndexById = useMemo(() => {
    const map = new Map()
    nonHeadingSteps.forEach((step, index) => {
      map.set(step.id, index)
    })
    return map
  }, [nonHeadingSteps])

  useEffect(() => {
    if (formattedSteps.length === 0) {
      setActiveStepId(null)
      return
    }
    const firstStep = nonHeadingSteps[0]
    setActiveStepId((current) => current ?? firstStep?.id ?? null)
  }, [formattedSteps, nonHeadingSteps])

  const hasDescription = Boolean(recipe?.description?.trim())
  const badges = [
    {
      label: 'Prep',
      value: recipe?.pre_minutes,
      display: formatMinutes(recipe?.pre_minutes),
    },
    {
      label: 'Cook',
      value: recipe?.cook_minutes,
      display: formatMinutes(recipe?.cook_minutes),
    },
    { label: 'Servings', value: recipe?.servings, display: recipe?.servings },
    { label: 'Heat', value: recipe?.heat, display: recipe?.heat },
  ].filter(
    (badge) =>
      badge.value !== null &&
      badge.value !== undefined &&
      badge.value !== ''
  )

  useEffect(() => {
    let isMounted = true

    async function loadRecipeView() {
      if (!recipeId) return
      setLoading(true)
      setError('')

      const [recipeResult, ingredientsResult, stepsResult] = await Promise.all([
        supabase
          .from('recipes')
          .select(
            'id, title, description, pre_minutes, cook_minutes, servings, heat'
          )
          .eq('id', recipeId)
          .single(),
        supabase
          .from('recipe_ingredients')
          .select(
            'ingredient_id, quantity, unit, notes, ingredients ( id, name, default_unit )'
          )
          .eq('recipe_id', recipeId),
        supabase
          .from('recipe_steps')
          .select('id, position, instruction, is_heading')
          .eq('recipe_id', recipeId)
          .order('position', { ascending: true }),
      ])

      if (!isMounted) return

      if (recipeResult.error) {
        setError(recipeResult.error.message ?? 'Unable to load recipe details.')
        setRecipe(null)
      } else {
        setRecipe(recipeResult.data ?? null)
      }

      if (ingredientsResult.error) {
        setError(
          ingredientsResult.error.message ?? 'Unable to load ingredients.'
        )
        setIngredients([])
      } else {
        const sorted = (ingredientsResult.data ?? [])
          .slice()
          .sort((a, b) => {
            const nameA = a.ingredients?.name ?? ''
            const nameB = b.ingredients?.name ?? ''
            return nameA.localeCompare(nameB)
          })
        setIngredients(sorted)
      }

      if (stepsResult.error) {
        setError(stepsResult.error.message ?? 'Unable to load steps.')
        setSteps([])
      } else {
        setSteps(stepsResult.data ?? [])
      }

      setLoading(false)
    }

    loadRecipeView()

    return () => {
      isMounted = false
    }
  }, [recipeId])

  function formatMinutes(value) {
    if (value === null || value === undefined || value === '') return '—'
    return `${value} min`
  }

  function formatQuantity(value) {
    if (value === null || value === undefined || value === '') return ''
    if (Number.isInteger(Number(value))) return `${Number(value)}`
    return `${value}`
  }

  function formatIngredient(item) {
    const name = item?.ingredients?.name ?? 'Unknown ingredient'
    const quantity = formatQuantity(item?.quantity)
    const rawUnit = item?.unit || item?.ingredients?.default_unit || ''
    const unit = rawUnit?.toLowerCase() === 'count' ? '' : rawUnit
    const notes = item?.notes?.trim() || ''
    const amount = [quantity, unit].filter(Boolean).join(' ')
    const detail = [amount, notes].filter(Boolean).join(' • ')
    return { name, detail }
  }

  function getNextStepId(currentId) {
    if (!currentId) return null
    const currentIndex = stepIndexById.get(currentId)
    if (currentIndex === undefined || currentIndex === null) return null
    return nonHeadingSteps[currentIndex + 1]?.id ?? null
  }

  function getPrevStepId(currentId) {
    if (!currentId) return null
    const currentIndex = stepIndexById.get(currentId)
    if (currentIndex === undefined || currentIndex === null) return null
    return nonHeadingSteps[currentIndex - 1]?.id ?? null
  }

  return (
    <>
      <Helmet>
        <title>
          {recipe?.title?.trim()
            ? `${recipe.title.trim()} · Recipes`
            : 'Recipe · Recipes'}
        </title>
      </Helmet>
      <section className="rounded-2xl bg-white/90 px-6 py-6 shadow-sm shadow-sky-900/5 backdrop-blur dark:bg-sky-950/60 dark:shadow-black/20">
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="md:col-span-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-semibold sm:text-4xl">
                {recipe?.title || 'Recipe Details'}
              </h1>
              {hasDescription ? (
                <p className="mt-2 max-w-2xl text-base text-sky-600 dark:text-sky-300">
                  {recipe.description}
                </p>
              ) : null}
              {badges.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-600 dark:text-sky-300">
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
            </div>
            <Link
              to={`/recipe/${recipeId}/edit`}
              className="inline-flex items-center justify-center rounded-full bg-sky-900 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-black/10 transition hover:bg-sky-800 dark:bg-white dark:text-sky-900 dark:shadow-black/20 dark:hover:bg-sky-100"
            >
              Edit Recipe
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center md:col-span-2">
            <div className="flex flex-col items-center gap-3 text-sm text-sky-500 dark:text-sky-400">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-sky-300 border-t-sky-900 dark:border-sky-700 dark:border-t-sky-200" />
              Loading recipe...
            </div>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200 md:col-span-2">
            {error}
          </div>
        ) : (
          <>
            <div className="rounded-2xl bg-transparent">
              <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-500 dark:text-sky-400">
                Ingredients
              </h2>
              {ingredients.length === 0 ? (
                <p className="mt-5 text-sm text-sky-500 dark:text-sky-400">
                  No ingredients added yet.
                </p>
              ) : (
                <ul className="mt-5 space-y-3 text-sm text-sky-700 dark:text-sky-200">
                  {ingredients.map((item) => {
                    const detail = formatIngredient(item)
                    return (
                      <li
                        key={item.ingredient_id}
                        className="flex items-start gap-3"
                      >
                    <div>
                      <p className="font-semibold text-sky-900 dark:text-sky-100">
                        {detail.name}
                          </p>
                          {detail.detail ? (
                            <p className="text-xs text-sky-500 dark:text-sky-400">
                              {detail.detail}
                            </p>
                          ) : null}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            <div className="rounded-2xl bg-transparent">
              <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-500 dark:text-sky-400">
                Steps
              </h2>
              {formattedSteps.length === 0 ? (
                <p className="mt-5 text-sm text-sky-500 dark:text-sky-400">
                  No steps added yet.
                </p>
              ) : (
                <div className="mt-5 space-y-4">
                  <ol className="space-y-4 text-sm text-sky-700 dark:text-sky-200">
                    {formattedSteps.map((step, index) =>
                      step.is_heading ? (
                        <li
                          key={step.id}
                          className="rounded-lg border border-dashed border-sky-200 bg-sky-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-sky-500 dark:border-sky-800 dark:bg-sky-900/40 dark:text-sky-300"
                        >
                          {step.instruction || 'Section'}
                        </li>
                      ) : (
                        <li
                          key={step.id ?? `step-${index}`}
                          className="flex gap-3 rounded-lg px-2 py-1 transition"
                        >
                          <button
                            type="button"
                            onClick={() => setActiveStepId(step.id)}
                            className="flex flex-1 items-start gap-3 text-left"
                          >
                            <span className="mt-0.5 inline-flex min-w-8 items-center justify-center rounded-full border border-sky-200 px-2 py-1 text-xs font-semibold text-sky-600 dark:border-sky-700 dark:text-sky-300">
                              {step.displayIndex}
                            </span>
                            <span
                              className={
                                activeStepId === step.id
                                  ? 'text-base font-semibold text-sky-900 dark:text-sky-100'
                                  : ''
                              }
                            >
                              {step.instruction}
                            </span>
                          </button>
                        </li>
                      )
                    )}
                  </ol>
                  <div className="flex flex-wrap items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveStepId(getPrevStepId(activeStepId))}
                      disabled={!getPrevStepId(activeStepId)}
                      className="inline-flex items-center justify-center rounded-full bg-sky-900 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-sm shadow-sky-900/20 transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-sky-700/50 disabled:text-sky-200 dark:bg-white dark:text-sky-900 dark:hover:bg-sky-100 dark:disabled:bg-sky-200/60 dark:disabled:text-sky-400"
                    >
                      Prev Step
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveStepId(getNextStepId(activeStepId))}
                      disabled={!getNextStepId(activeStepId)}
                      className="inline-flex items-center justify-center rounded-full bg-sky-900 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-sm shadow-sky-900/20 transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-sky-700/50 disabled:text-sky-200 dark:bg-white dark:text-sky-900 dark:hover:bg-sky-100 dark:disabled:bg-sky-200/60 dark:disabled:text-sky-400"
                    >
                      Next Step
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      </section>
    </>
  )
}
