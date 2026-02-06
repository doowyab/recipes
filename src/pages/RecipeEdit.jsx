import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import IngredientsSection from '../components/IngredientsSection'
import RecipeBasicsPanel from '../components/RecipeBasicsPanel'
import { supabase } from '../lib/supabase'

function toIntOrNull(value) {
  if (value === '' || value === null || value === undefined) return null
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? null : parsed
}

export default function RecipeEdit() {
  const { recipeId } = useParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [recipeDraft, setRecipeDraft] = useState({
    title: '',
    description: '',
    preMinutes: '',
    cookMinutes: '',
    servings: '',
  })

  useEffect(() => {
    let isMounted = true

    async function loadRecipe() {
      setLoading(true)
      setStatus('')

      const { data, error } = await supabase
        .from('recipes')
        .select('title, description, pre_minutes, cook_minutes, servings')
        .eq('id', recipeId)
        .single()

      if (!isMounted) return

      if (error) {
        setStatus(error.message ?? 'Unable to load recipe details.')
      } else {
        setRecipeDraft({
          title: data?.title ?? '',
          description: data?.description ?? '',
          preMinutes: data?.pre_minutes ?? '',
          cookMinutes: data?.cook_minutes ?? '',
          servings: data?.servings ?? '',
        })
      }

      setLoading(false)
    }

    if (recipeId) {
      loadRecipe()
    }

    return () => {
      isMounted = false
    }
  }, [recipeId])

  async function handleSaveBasics() {
    setSaving(true)
    setStatus('')

    try {
      const payload = {
        title: recipeDraft.title.trim(),
        description: recipeDraft.description.trim(),
        pre_minutes: toIntOrNull(recipeDraft.preMinutes),
        cook_minutes: toIntOrNull(recipeDraft.cookMinutes),
        servings: toIntOrNull(recipeDraft.servings),
      }

      if (!payload.title) {
        throw new Error('Recipe title is required.')
      }

      const { error } = await supabase
        .from('recipes')
        .update(payload)
        .eq('id', recipeId)

      if (error) throw error

      setStatus('Recipe basics saved.')
    } catch (err) {
      setStatus(err.message ?? 'Unable to save recipe basics.')
      throw err
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex w-full flex-col gap-8 text-left">
      <RecipeBasicsPanel
        recipeDraft={recipeDraft}
        setRecipeDraft={setRecipeDraft}
        onSave={handleSaveBasics}
        loading={loading}
        saving={saving}
        status={status}
      />
      <IngredientsSection recipeId={recipeId} />

      <section className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-lg shadow-black/5 dark:border-slate-800 dark:bg-slate-950/70 dark:shadow-black/20">
        <header className="mb-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
            Steps
          </p>
          <h2 className="text-xl font-semibold">Steps</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Add cooking steps here. This section is coming next.
          </p>
        </header>
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
          Step list placeholder.
        </div>
      </section>
    </div>
  )
}
