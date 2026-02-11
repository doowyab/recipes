import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { supabase } from '../lib/supabase'

function toIntOrNull(value) {
  if (value === '' || value === null || value === undefined) return null
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? null : parsed
}

function isValidHeatLevel(value) {
  if (value === null || value === undefined) return true
  return Number.isInteger(value) && value >= 0 && value <= 3
}

function RecipeBasicsForm({ recipeDraft, setRecipeDraft, onSave, saving, status }) {
  return (
    <section className="p-0">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-sky-900 dark:text-sky-100">
          New Recipe
        </h1>
        <p className="mt-2 text-sm text-sky-600 dark:text-sky-300">
          Add the basics now, then build out ingredients and steps next.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <label className="form-label">
          <span>Title</span>
          <input
            className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm text-sky-900 outline-none placeholder:text-slate-400 focus:border-sky-900 focus:ring-2 focus:ring-sky-900/20 dark:border-sky-800 dark:bg-sky-900 dark:text-sky-100 dark:placeholder:text-slate-500 dark:focus:border-white dark:focus:ring-white/40"
            value={recipeDraft.title}
            onChange={(event) =>
              setRecipeDraft((prev) => ({ ...prev, title: event.target.value }))
            }
            placeholder="Smoky Lemon Pasta"
          />
        </label>

        <label className="form-label">
          <span>Servings</span>
          <input
            type="number"
            min="0"
            step="1"
            className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm text-sky-900 outline-none placeholder:text-slate-400 focus:border-sky-900 focus:ring-2 focus:ring-sky-900/20 dark:border-sky-800 dark:bg-sky-900 dark:text-sky-100 dark:placeholder:text-slate-500 dark:focus:border-white dark:focus:ring-white/40"
            value={recipeDraft.servings}
            onChange={(event) =>
              setRecipeDraft((prev) => ({ ...prev, servings: event.target.value }))
            }
            placeholder="4"
          />
        </label>

        <label className="form-label md:col-span-2">
          <span>Description</span>
          <textarea
            className="min-h-[120px] rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm text-sky-900 outline-none placeholder:text-slate-400 focus:border-sky-900 focus:ring-2 focus:ring-sky-900/20 dark:border-sky-800 dark:bg-sky-900 dark:text-sky-100 dark:placeholder:text-slate-500 dark:focus:border-white dark:focus:ring-white/40"
            value={recipeDraft.description}
            onChange={(event) =>
              setRecipeDraft((prev) => ({ ...prev, description: event.target.value }))
            }
            placeholder="Notes on flavor, pairings, or a quick story."
          />
        </label>

        <label className="form-label">
          <span>Prep Time (min)</span>
          <input
            type="number"
            min="0"
            className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm text-sky-900 outline-none placeholder:text-slate-400 focus:border-sky-900 focus:ring-2 focus:ring-sky-900/20 dark:border-sky-800 dark:bg-sky-900 dark:text-sky-100 dark:placeholder:text-slate-500 dark:focus:border-white dark:focus:ring-white/40"
            value={recipeDraft.preMinutes}
            onChange={(event) =>
              setRecipeDraft((prev) => ({
                ...prev,
                preMinutes: event.target.value,
              }))
            }
            placeholder="15"
          />
        </label>

        <label className="form-label">
          <span>Cook Time (min)</span>
          <input
            type="number"
            min="0"
            className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm text-sky-900 outline-none placeholder:text-slate-400 focus:border-sky-900 focus:ring-2 focus:ring-sky-900/20 dark:border-sky-800 dark:bg-sky-900 dark:text-sky-100 dark:placeholder:text-slate-500 dark:focus:border-white dark:focus:ring-white/40"
            value={recipeDraft.cookMinutes}
            onChange={(event) =>
              setRecipeDraft((prev) => ({
                ...prev,
                cookMinutes: event.target.value,
              }))
            }
            placeholder="20"
          />
        </label>

        <label className="form-label">
          <span>Heat Level</span>
          <input
            type="number"
            min="0"
            max="3"
            step="1"
            className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm text-sky-900 outline-none placeholder:text-slate-400 focus:border-sky-900 focus:ring-2 focus:ring-sky-900/20 dark:border-sky-800 dark:bg-sky-900 dark:text-sky-100 dark:placeholder:text-slate-500 dark:focus:border-white dark:focus:ring-white/40"
            value={recipeDraft.heat}
            onChange={(event) =>
              setRecipeDraft((prev) => ({ ...prev, heat: event.target.value }))
            }
            placeholder="0-3"
          />
        </label>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded-full bg-sky-900 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-black/10 transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-sky-900 dark:shadow-black/20 dark:hover:bg-sky-100"
        >
          {saving ? 'Saving...' : 'Create Recipe'}
        </button>
        {status && (
          <span className="text-sm text-sky-500 dark:text-sky-400">
            {status}
          </span>
        )}
      </div>
    </section>
  )
}

export default function CreateRecipe() {
  const navigate = useNavigate()
  const [recipeDraft, setRecipeDraft] = useState({
    title: '',
    description: '',
    preMinutes: '',
    cookMinutes: '',
    servings: '',
    heat: '',
  })
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')

  async function getUserId() {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data?.user) {
      throw new Error('You need to be signed in to save recipes.')
    }
    return data.user.id
  }

  async function handleSaveRecipe() {
    setSaving(true)
    setStatus('')

    try {
      const userId = await getUserId()
      const payload = {
        title: recipeDraft.title.trim(),
        description: recipeDraft.description.trim(),
        owner_id: userId,
        pre_minutes: toIntOrNull(recipeDraft.preMinutes),
        cook_minutes: toIntOrNull(recipeDraft.cookMinutes),
        servings: toIntOrNull(recipeDraft.servings),
        heat: toIntOrNull(recipeDraft.heat),
      }

      if (!payload.title) {
        throw new Error('Recipe title is required.')
      }
      if (!isValidHeatLevel(payload.heat)) {
        throw new Error('Heat level must be between 0 and 3.')
      }

      const { data, error } = await supabase
        .from('recipes')
        .insert(payload)
        .select('id')
        .single()

      if (error) throw error

      navigate(`/recipe/${data.id}/edit`)
    } catch (err) {
      setStatus(err.message ?? 'Unable to save recipe.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Helmet>
        <title>Create Recipe · Recipes</title>
      </Helmet>
    <div className="flex w-full flex-col gap-10 text-left">
      <RecipeBasicsForm
        recipeDraft={recipeDraft}
        setRecipeDraft={setRecipeDraft}
        onSave={handleSaveRecipe}
        saving={saving}
        status={status}
      />
    </div>
    </>
  )
}
