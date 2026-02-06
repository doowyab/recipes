import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function formatStatusTime(date) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export default function RecipeStepsSection({ recipeId }) {
  const [steps, setSteps] = useState([])
  const [stepsLoading, setStepsLoading] = useState(true)
  const [stepsSaving, setStepsSaving] = useState(false)
  const [stepsStatus, setStepsStatus] = useState('')
  const [stepErrors, setStepErrors] = useState({})
  const [deletedStepIds, setDeletedStepIds] = useState(() => new Set())

  useEffect(() => {
    let isMounted = true

    async function loadSteps() {
      if (!recipeId) return
      setStepsLoading(true)
      setStepsStatus('')

      const { data, error } = await supabase
        .from('recipe_steps')
        .select('id, position, instruction, is_heading')
        .eq('recipe_id', recipeId)
        .order('position', { ascending: true })

      if (!isMounted) return

      if (error) {
        setStepsStatus(error.message ?? 'Unable to load steps.')
        setSteps([])
      } else {
        const normalized = (data ?? []).map((step) => ({
          id: step.id,
          instruction: step.instruction ?? '',
          isHeading: Boolean(step.is_heading),
        }))
        setSteps(normalized)
      }

      setStepsLoading(false)
    }

    if (recipeId) {
      loadSteps()
    }

    return () => {
      isMounted = false
    }
  }, [recipeId])

  function updateStep(index, patch) {
    setSteps((current) =>
      current.map((step, idx) => (idx === index ? { ...step, ...patch } : step))
    )
  }

  function moveStep(fromIndex, toIndex) {
    if (toIndex < 0 || toIndex >= steps.length) return
    setSteps((current) => {
      const next = current.slice()
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
  }

  function handleAddStep() {
    setSteps((current) => [
      ...current,
      { id: null, instruction: '', isHeading: false },
    ])
  }

  function handleDeleteStep(index) {
    setSteps((current) => {
      const next = current.slice()
      const [removed] = next.splice(index, 1)
      if (removed?.id) {
        setDeletedStepIds((prev) => {
          const updated = new Set(prev)
          updated.add(removed.id)
          return updated
        })
      }
      return next
    })
  }

  function validateSteps(nextSteps) {
    const errors = {}
    nextSteps.forEach((step, index) => {
      if (!step.instruction.trim()) {
        errors[index] = 'Step text is required.'
      }
    })
    setStepErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSaveSteps() {
    if (!recipeId) return
    setStepsSaving(true)
    setStepsStatus('')

    try {
      if (!validateSteps(steps)) {
        throw new Error('Please fill in all step descriptions.')
      }

      const normalized = steps.map((step, index) => ({
        id: step.id,
        recipe_id: recipeId,
        position: index + 1,
        instruction: step.instruction.trim(),
        is_heading: step.isHeading,
      }))

      const existing = normalized.filter((step) => step.id)
      const created = normalized.filter((step) => !step.id)

      if (deletedStepIds.size > 0) {
        const ids = Array.from(deletedStepIds)
        const { error: deleteError } = await supabase
          .from('recipe_steps')
          .delete()
          .in('id', ids)
        if (deleteError) throw deleteError
      }

      if (existing.length > 0) {
        const { error: upsertError } = await supabase
          .from('recipe_steps')
          .upsert(existing, { onConflict: 'id' })
        if (upsertError) throw upsertError
      }

      if (created.length > 0) {
        const { error: insertError } = await supabase
          .from('recipe_steps')
          .insert(created.map(({ id, ...rest }) => rest))
        if (insertError) throw insertError
      }

      setDeletedStepIds(new Set())
      setStepsStatus(`Steps saved at ${formatStatusTime(new Date())}.`)

      const { data, error: refreshError } = await supabase
        .from('recipe_steps')
        .select('id, position, instruction, is_heading')
        .eq('recipe_id', recipeId)
        .order('position', { ascending: true })

      if (refreshError) throw refreshError

      const refreshed = (data ?? []).map((step) => ({
        id: step.id,
        instruction: step.instruction ?? '',
        isHeading: Boolean(step.is_heading),
      }))
      setSteps(refreshed)
      setStepErrors({})
    } catch (err) {
      setStepsStatus(err.message ?? 'Unable to save steps.')
      throw err
    } finally {
      setStepsSaving(false)
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-lg shadow-black/5 dark:border-slate-800 dark:bg-slate-950/70 dark:shadow-black/20">
      <header className="mb-4">
        <h2 className="text-xl font-semibold">Steps</h2>
      </header>
      <div className="flex flex-col gap-4">
        {stepsLoading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Loading steps...
          </p>
        ) : null}

        {steps.length === 0 && !stepsLoading ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
            No steps yet. Add the first one below.
          </div>
        ) : null}

        {steps.length > 0 ? (
          <ul className="grid gap-3">
            {steps.map((step, index) => (
              <li
                key={step.id ?? `new-${index}`}
                className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm shadow-black/5 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-200"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Step {index + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => moveStep(index, index - 1)}
                        disabled={index === 0}
                        className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 transition hover:border-slate-300 hover:text-slate-700 disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-white dark:disabled:border-slate-800 dark:disabled:text-slate-600"
                      >
                        Up
                      </button>
                      <button
                        type="button"
                        onClick={() => moveStep(index, index + 1)}
                        disabled={index === steps.length - 1}
                        className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 transition hover:border-slate-300 hover:text-slate-700 disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-white dark:disabled:border-slate-800 dark:disabled:text-slate-600"
                      >
                        Down
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteStep(index)}
                        className="rounded-md border border-rose-200 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-600 transition hover:border-rose-300 hover:text-rose-700 dark:border-rose-900/60 dark:text-rose-300 dark:hover:border-rose-700 dark:hover:text-rose-200"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <label className="form-label">
                    <textarea
                      rows={3}
                      value={step.instruction}
                      onChange={(event) =>
                        updateStep(index, { instruction: event.target.value })
                      }
                      className="min-h-[72px] rounded-md border border-slate-200 bg-white px-2 py-2 text-sm text-slate-900 outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-400"
                    />
                    {stepErrors[index] ? (
                      <span className="text-[11px] text-rose-500">
                        {stepErrors[index]}
                      </span>
                    ) : null}
                  </label>

                  <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    <input
                      type="checkbox"
                      checked={step.isHeading}
                      onChange={(event) =>
                        updateStep(index, { isHeading: event.target.checked })
                      }
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900/20 dark:border-slate-600 dark:bg-slate-950 dark:text-white dark:focus:ring-white/30"
                    />
                    Section heading
                  </label>
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleAddStep}
            className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700 transition hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:text-white"
          >
            Add Step
          </button>
          <button
            type="button"
            onClick={handleSaveSteps}
            disabled={stepsSaving}
            className="rounded-lg border border-slate-300 bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-700 dark:border-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 dark:disabled:bg-slate-200"
          >
            {stepsSaving ? 'Saving...' : 'Save Steps'}
          </button>
          {stepsStatus ? (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {stepsStatus}
            </span>
          ) : null}
        </div>
      </div>
    </section>
  )
}
