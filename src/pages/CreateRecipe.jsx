import { useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const emptyIngredient = {
  name: '',
  quantity: '',
  unit: '',
  notes: '',
  is_synergy_core: false,
}

const emptyStep = {
  instruction: '',
}

function toIntOrNull(value) {
  if (value === '' || value === null || value === undefined) return null
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? null : parsed
}

function SectionShell({ stepLabel, title, description, children }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 shadow-lg shadow-black/20">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{stepLabel}</p>
        <h2 className="text-2xl font-semibold">{title}</h2>
        <p className="text-sm text-slate-300">{description}</p>
      </header>
      {children}
    </section>
  )
}

function ReadOnlyRow({ label, value }) {
  const displayValue = value === 0 ? '0' : value || '—'
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</span>
      <span className="text-sm text-slate-100">{displayValue}</span>
    </div>
  )
}

function RecipeBasicsSection({
  recipeDraft,
  setRecipeDraft,
  onSave,
  saving,
  status,
  isEditing,
  onEdit,
  isSaved,
}) {
  return (
    <SectionShell
      stepLabel="Step 1"
      title="Recipe Basics"
      description="Start with the core details so we can create the recipe record."
    >
      {isEditing ? (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-200">Title</span>
              <input
                className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-slate-500"
                value={recipeDraft.title}
                onChange={(event) =>
                  setRecipeDraft((prev) => ({ ...prev, title: event.target.value }))
                }
                placeholder="Smoky Lemon Pasta"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-200">Heat</span>
              <input
                type="number"
                min="0"
                max="3"
                step="1"
                className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-slate-500"
                value={recipeDraft.heat}
                onChange={(event) =>
                  setRecipeDraft((prev) => ({ ...prev, heat: event.target.value }))
                }
                placeholder="0 to 3"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-200">Servings</span>
              <input
                type="number"
                min="0"
                step="1"
                className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-slate-500"
                value={recipeDraft.servings}
                onChange={(event) =>
                  setRecipeDraft((prev) => ({ ...prev, servings: event.target.value }))
                }
                placeholder="4"
              />
            </label>

            <label className="flex flex-col gap-2 md:col-span-2">
              <span className="text-sm font-medium text-slate-200">Description</span>
              <textarea
                className="min-h-[120px] rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-slate-500"
                value={recipeDraft.description}
                onChange={(event) =>
                  setRecipeDraft((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="Notes on flavor, pairings, or a quick story."
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-200">Prep Time (min)</span>
              <input
                type="number"
                min="0"
                className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-slate-500"
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

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-200">Cook Time (min)</span>
              <input
                type="number"
                min="0"
                className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-slate-500"
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
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving...' : isSaved ? 'Update Recipe' : 'Save Recipe'}
            </button>
            {status && <span className="text-sm text-slate-300">{status}</span>}
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <ReadOnlyRow label="Title" value={recipeDraft.title} />
            <ReadOnlyRow label="Heat" value={recipeDraft.heat} />
            <ReadOnlyRow label="Servings" value={recipeDraft.servings} />
            <ReadOnlyRow label="Description" value={recipeDraft.description} />
            <ReadOnlyRow label="Prep Time" value={recipeDraft.preMinutes} />
            <ReadOnlyRow label="Cook Time" value={recipeDraft.cookMinutes} />
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onEdit}
              className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
            >
              Edit Basics
            </button>
          </div>
        </>
      )}
    </SectionShell>
  )
}

function IngredientsSection({
  ingredientDraft,
  setIngredientDraft,
  ingredients,
  onAddIngredient,
  onRemoveIngredient,
  onSave,
  saving,
  status,
  canSave,
  isEditing,
  onEdit,
}) {
  return (
    <SectionShell
      stepLabel="Step 2"
      title="Ingredients"
      description="Add ingredients before saving them to the recipe."
    >
      {isEditing ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <label className="flex flex-col gap-2 md:col-span-2">
              <span className="text-sm font-medium text-slate-200">Ingredient</span>
              <input
                className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-slate-500"
                value={ingredientDraft.name}
                onChange={(event) =>
                  setIngredientDraft((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="Cherry tomatoes"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-200">Quantity</span>
              <input
                className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-slate-500"
                value={ingredientDraft.quantity}
                onChange={(event) =>
                  setIngredientDraft((prev) => ({
                    ...prev,
                    quantity: event.target.value,
                  }))
                }
                placeholder="2"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-200">Unit</span>
              <select
                className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-slate-500"
                value={ingredientDraft.unit}
                onChange={(event) =>
                  setIngredientDraft((prev) => ({ ...prev, unit: event.target.value }))
                }
              >
                <option value="">Select unit</option>
                <option value="units">Units</option>
                <option value="grams">Grams</option>
                <option value="cups">Cups</option>
                <option value="tbsp">Tbsp</option>
                <option value="tsp">Tsp</option>
              </select>
            </label>

            <label className="flex flex-col gap-2 md:col-span-4">
              <span className="text-sm font-medium text-slate-200">Notes</span>
              <input
                className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-slate-500"
                value={ingredientDraft.notes}
                onChange={(event) =>
                  setIngredientDraft((prev) => ({ ...prev, notes: event.target.value }))
                }
                placeholder="Halved, fresh."
              />
            </label>

            <label className="flex items-center gap-3 md:col-span-4">
              <input
                type="checkbox"
                checked={ingredientDraft.is_synergy_core}
                onChange={(event) =>
                  setIngredientDraft((prev) => ({
                    ...prev,
                    is_synergy_core: event.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-white focus:ring-2 focus:ring-white/40"
              />
              <span className="text-sm font-medium text-slate-200">
                Short shelf life
              </span>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onAddIngredient}
              className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
            >
              Add Ingredient
            </button>
            {status && <span className="text-sm text-slate-300">{status}</span>}
          </div>

          <div className="mt-6 space-y-3">
            {ingredients.length === 0 ? (
              <p className="text-sm text-slate-400">No ingredients added yet.</p>
            ) : (
              ingredients.map((item, index) => (
                <div
                  key={`${item.name}-${index}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800/80 bg-slate-900/40 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-slate-100">{item.name}</p>
                    <p className="text-slate-400">
                      {item.quantity || '—'} {item.unit || ''}
                      {item.notes ? ` · ${item.notes}` : ''}
                      {item.is_synergy_core ? ' · short shelf life' : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveIngredient(index)}
                    className="text-xs uppercase tracking-[0.2em] text-slate-400 transition hover:text-white"
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onSave}
              disabled={!canSave || saving}
              className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Ingredients'}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="space-y-3">
            {ingredients.length === 0 ? (
              <p className="text-sm text-slate-400">No ingredients saved.</p>
            ) : (
              ingredients.map((item, index) => (
                <div
                  key={`${item.name}-${index}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800/80 bg-slate-900/40 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-slate-100">{item.name}</p>
                    <p className="text-slate-400">
                      {item.quantity || '—'} {item.unit || ''}
                      {item.notes ? ` · ${item.notes}` : ''}
                      {item.is_synergy_core ? ' · short shelf life' : ''}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onEdit}
              className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
            >
              Edit Ingredients
            </button>
          </div>
        </>
      )}
    </SectionShell>
  )
}

function StepsSection({
  stepDraft,
  setStepDraft,
  steps,
  onAddStep,
  onRemoveStep,
  onSave,
  saving,
  status,
  canSave,
  isEditing,
  onEdit,
}) {
  return (
    <SectionShell
      stepLabel="Step 3"
      title="Steps"
      description="Capture the instructions in order, then save."
    >
      {isEditing ? (
        <>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-200">Instruction</span>
            <textarea
              className="min-h-[120px] rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-slate-500"
              value={stepDraft.instruction}
              onChange={(event) =>
                setStepDraft((prev) => ({ ...prev, instruction: event.target.value }))
              }
              placeholder="Sear the tomatoes, then toss with pasta."
            />
          </label>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onAddStep}
              className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
            >
              Add Step
            </button>
            {status && <span className="text-sm text-slate-300">{status}</span>}
          </div>

          <div className="mt-6 space-y-3">
            {steps.length === 0 ? (
              <p className="text-sm text-slate-400">No steps added yet.</p>
            ) : (
              steps.map((item, index) => (
                <div
                  key={`${item.instruction}-${index}`}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-slate-800/80 bg-slate-900/40 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      Step {index + 1}
                    </p>
                    <p className="text-slate-100">{item.instruction}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveStep(index)}
                    className="text-xs uppercase tracking-[0.2em] text-slate-400 transition hover:text-white"
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onSave}
              disabled={!canSave || saving}
              className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Steps'}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="space-y-3">
            {steps.length === 0 ? (
              <p className="text-sm text-slate-400">No steps saved.</p>
            ) : (
              steps.map((item, index) => (
                <div
                  key={`${item.instruction}-${index}`}
                  className="rounded-lg border border-slate-800/80 bg-slate-900/40 px-4 py-3 text-sm"
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Step {index + 1}
                  </p>
                  <p className="text-slate-100">{item.instruction}</p>
                </div>
              ))
            )}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onEdit}
              className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
            >
              Edit Steps
            </button>
          </div>
        </>
      )}
    </SectionShell>
  )
}

export default function CreateRecipe() {
  const [recipeId, setRecipeId] = useState(null)
  const [recipeDraft, setRecipeDraft] = useState({
    title: '',
    description: '',
    preMinutes: '',
    cookMinutes: '',
    heat: '',
    servings: '',
  })
  const [ingredientDraft, setIngredientDraft] = useState(emptyIngredient)
  const [ingredients, setIngredients] = useState([])
  const [stepDraft, setStepDraft] = useState(emptyStep)
  const [steps, setSteps] = useState([])
  const [saving, setSaving] = useState({
    recipe: false,
    ingredients: false,
    steps: false,
  })
  const [status, setStatus] = useState({
    recipe: '',
    ingredients: '',
    steps: '',
  })
  const [savedFlags, setSavedFlags] = useState({
    recipe: false,
    ingredients: false,
    steps: false,
  })
  const [activeSection, setActiveSection] = useState('recipe')

  const canSaveIngredients = recipeId && ingredients.length > 0
  const canSaveSteps = recipeId && steps.length > 0

  const ingredientPreview = useMemo(
    () =>
      ingredients.map((item, index) => ({
        ...item,
        key: `${item.name}-${index}`,
      })),
    [ingredients]
  )

  async function getUserId() {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data?.user) {
      throw new Error('You need to be signed in to save recipes.')
    }
    return data.user.id
  }

  async function handleSaveRecipe() {
    setSaving((prev) => ({ ...prev, recipe: true }))
    setStatus((prev) => ({ ...prev, recipe: '' }))

    try {
      const userId = await getUserId()
      const payload = {
        title: recipeDraft.title.trim(),
        description: recipeDraft.description.trim(),
        owner_id: userId,
        pre_minutes: toIntOrNull(recipeDraft.preMinutes),
        cook_minutes: toIntOrNull(recipeDraft.cookMinutes),
        heat: toIntOrNull(recipeDraft.heat),
        servings: toIntOrNull(recipeDraft.servings),
      }

      if (!payload.title) {
        throw new Error('Recipe title is required.')
      }

      if (recipeId) {
        const { error } = await supabase
          .from('recipes')
          .update(payload)
          .eq('id', recipeId)
        if (error) throw error
        setStatus((prev) => ({ ...prev, recipe: 'Recipe updated.' }))
      } else {
        const { data, error } = await supabase
          .from('recipes')
          .insert(payload)
          .select('id')
          .single()
        if (error) throw error
        setRecipeId(data.id)
        setStatus((prev) => ({ ...prev, recipe: 'Recipe saved. Add ingredients next.' }))
      }
      setSavedFlags((prev) => ({ ...prev, recipe: true }))
      setActiveSection('ingredients')
    } catch (err) {
      setStatus((prev) => ({
        ...prev,
        recipe: err.message ?? 'Unable to save recipe.',
      }))
    } finally {
      setSaving((prev) => ({ ...prev, recipe: false }))
    }
  }

  function handleAddIngredient() {
    const trimmedName = ingredientDraft.name.trim()
    if (!trimmedName) {
      setStatus((prev) => ({ ...prev, ingredients: 'Ingredient name is required.' }))
      return
    }
    setIngredients((prev) => [
      ...prev,
      {
        name: trimmedName,
        quantity: ingredientDraft.quantity.trim(),
        unit: ingredientDraft.unit.trim(),
        notes: ingredientDraft.notes.trim(),
        is_synergy_core: ingredientDraft.is_synergy_core,
      },
    ])
    setIngredientDraft(emptyIngredient)
    setStatus((prev) => ({ ...prev, ingredients: '' }))
  }

  function handleRemoveIngredient(index) {
    setIngredients((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSaveIngredients() {
    if (!recipeId) {
      setStatus((prev) => ({ ...prev, ingredients: 'Save the recipe first.' }))
      return
    }
    if (ingredients.length === 0) {
      setStatus((prev) => ({ ...prev, ingredients: 'Add at least one ingredient.' }))
      return
    }

    setSaving((prev) => ({ ...prev, ingredients: true }))
    setStatus((prev) => ({ ...prev, ingredients: '' }))

    try {
      const ingredientPayload = ingredients.map((item) => ({
        name: item.name,
        is_synergy_core: item.is_synergy_core ?? false,
      }))

      const { data: ingredientRows, error: ingredientError } = await supabase
        .from('ingredients')
        .upsert(ingredientPayload)
        .select('id,name')

      if (ingredientError) throw ingredientError

      const ingredientMap = new Map(
          ingredientRows.map((row) => [row.name, row.id])
      )

      await supabase.from('recipe_ingredients').delete().eq('recipe_id', recipeId)

      const joinRows = ingredients.map((item) => ({
        recipe_id: recipeId,
        ingredient_id: ingredientMap.get(item.name),
        quantity: item.quantity || null,
        unit: item.unit || null,
        notes: item.notes || null,
      }))

      const { error: joinError } = await supabase
        .from('recipe_ingredients')
        .insert(joinRows)

      if (joinError) throw joinError

      setStatus((prev) => ({ ...prev, ingredients: 'Ingredients saved.' }))
      setSavedFlags((prev) => ({ ...prev, ingredients: true }))
      setActiveSection('steps')
    } catch (err) {
      setStatus((prev) => ({
        ...prev,
        ingredients: err.message ?? 'Unable to save ingredients.',
      }))
    } finally {
      setSaving((prev) => ({ ...prev, ingredients: false }))
    }
  }

  function handleAddStep() {
    const trimmed = stepDraft.instruction.trim()
    if (!trimmed) {
      setStatus((prev) => ({ ...prev, steps: 'Step instruction is required.' }))
      return
    }
    setSteps((prev) => [...prev, { instruction: trimmed }])
    setStepDraft(emptyStep)
    setStatus((prev) => ({ ...prev, steps: '' }))
  }

  function handleRemoveStep(index) {
    setSteps((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSaveSteps() {
    if (!recipeId) {
      setStatus((prev) => ({ ...prev, steps: 'Save the recipe first.' }))
      return
    }
    if (steps.length === 0) {
      setStatus((prev) => ({ ...prev, steps: 'Add at least one step.' }))
      return
    }

    setSaving((prev) => ({ ...prev, steps: true }))
    setStatus((prev) => ({ ...prev, steps: '' }))

    try {
      await supabase.from('recipe_steps').delete().eq('recipe_id', recipeId)

      const stepRows = steps.map((item, index) => ({
        recipe_id: recipeId,
        position: index + 1,
        instruction: item.instruction,
      }))

      const { error } = await supabase.from('recipe_steps').insert(stepRows)
      if (error) throw error

      setStatus((prev) => ({ ...prev, steps: 'Steps saved.' }))
      setSavedFlags((prev) => ({ ...prev, steps: true }))
    } catch (err) {
      setStatus((prev) => ({
        ...prev,
        steps: err.message ?? 'Unable to save steps.',
      }))
    } finally {
      setSaving((prev) => ({ ...prev, steps: false }))
    }
  }

  const showIngredients = savedFlags.recipe || activeSection === 'ingredients'
  const showSteps = savedFlags.ingredients || activeSection === 'steps'

  return (
    <div className="flex w-full flex-col gap-10 text-left">
      <RecipeBasicsSection
        recipeDraft={recipeDraft}
        setRecipeDraft={setRecipeDraft}
        onSave={handleSaveRecipe}
        saving={saving.recipe}
        status={status.recipe}
        isEditing={activeSection === 'recipe'}
        isSaved={savedFlags.recipe}
        onEdit={() => setActiveSection('recipe')}
      />

      {showIngredients && (
        <IngredientsSection
          ingredientDraft={ingredientDraft}
          setIngredientDraft={setIngredientDraft}
          ingredients={ingredientPreview}
          onAddIngredient={handleAddIngredient}
          onRemoveIngredient={handleRemoveIngredient}
          onSave={handleSaveIngredients}
          saving={saving.ingredients}
          status={status.ingredients}
          canSave={canSaveIngredients}
          isEditing={activeSection === 'ingredients'}
          onEdit={() => setActiveSection('ingredients')}
        />
      )}

      {showSteps && (
        <StepsSection
          stepDraft={stepDraft}
          setStepDraft={setStepDraft}
          steps={steps}
          onAddStep={handleAddStep}
          onRemoveStep={handleRemoveStep}
          onSave={handleSaveSteps}
          saving={saving.steps}
          status={status.steps}
          canSave={canSaveSteps}
          isEditing={activeSection === 'steps'}
          onEdit={() => setActiveSection('steps')}
        />
      )}
    </div>
  )
}
