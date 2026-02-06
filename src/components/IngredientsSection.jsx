import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

function normalizeName(value) {
  return value.trim().toLowerCase()
}

function uniqueById(list) {
  const map = new Map()
  list.forEach((item) => {
    if (item?.id && !map.has(item.id)) map.set(item.id, item)
  })
  return Array.from(map.values())
}

function uniqueByNameOrId(list) {
  const map = new Map()
  list.forEach((item) => {
    if (item?.id && !map.has(item.id)) {
      map.set(item.id, item)
      return
    }
    const nameKey = item?.name ? normalizeName(item.name) : null
    if (nameKey && !map.has(nameKey)) {
      map.set(nameKey, item)
    }
  })
  return Array.from(map.values())
}

function uniqueRecipeItems(list) {
  const map = new Map()
  list.forEach((item) => {
    if (item?.ingredient_id && !map.has(item.ingredient_id)) {
      map.set(item.ingredient_id, item)
      return
    }
    const nameKey = item?.ingredients?.name
      ? normalizeName(item.ingredients.name)
      : null
    if (nameKey && !map.has(nameKey)) {
      map.set(nameKey, item)
    }
  })
  return Array.from(map.values())
}

export default function IngredientsSection({ recipeId }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [items, setItems] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [query, setQuery] = useState('')
  const [newUnit, setNewUnit] = useState('')
  const [newIsFresh, setNewIsFresh] = useState(false)
  const [draftMode, setDraftMode] = useState(null)
  const [selectedIngredient, setSelectedIngredient] = useState(null)
  const [detailQuantity, setDetailQuantity] = useState('')
  const [detailUnit, setDetailUnit] = useState('')
  const [detailNotes, setDetailNotes] = useState('')
  const [detailErrors, setDetailErrors] = useState({})
  const [suggestions, setSuggestions] = useState([])
  const [searching, setSearching] = useState(false)
  const [actionStatus, setActionStatus] = useState('')

  const normalizedQuery = useMemo(() => normalizeName(query), [query])
  const hasExactMatch = useMemo(
    () =>
      normalizedQuery.length > 0 &&
      suggestions.some(
        (ingredient) => normalizeName(ingredient.name) === normalizedQuery
      ),
    [normalizedQuery, suggestions]
  )

  async function loadIngredients() {
    if (!recipeId) return
    setLoading(true)
    setError('')

    const { data, error: fetchError } = await supabase
      .from('recipe_ingredients')
      .select(
        'ingredient_id, quantity, unit, notes, ingredients ( id, name, default_unit )'
      )
      .eq('recipe_id', recipeId)

    if (fetchError) {
      setError(fetchError.message ?? 'Unable to load ingredients.')
      setItems([])
    } else {
      const sorted = (data ?? []).slice().sort((a, b) => {
        const nameA = a.ingredients?.name ?? ''
        const nameB = b.ingredients?.name ?? ''
        return nameA.localeCompare(nameB)
      })
      setItems(uniqueRecipeItems(sorted))
    }

    setLoading(false)
  }

  useEffect(() => {
    loadIngredients()
  }, [recipeId])

  useEffect(() => {
    let isActive = true

    let debounceTimer

    async function searchIngredients() {
      if (!normalizedQuery) {
        setSuggestions([])
        setSearching(false)
        return
      }

      setSearching(true)
      const { data, error: searchError } = await supabase
        .from('ingredients')
        .select('id, name, default_unit')
        .ilike('name', `%${normalizedQuery}%`)
        .order('name')
        .limit(8)

      if (!isActive) return

      if (searchError) {
        setSuggestions([])
        setSearching(false)
        return
      }

      setSuggestions(uniqueByNameOrId(data ?? []))
      setSearching(false)
    }

    debounceTimer = setTimeout(() => {
      searchIngredients()
    }, 1000)

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      isActive = false
    }
  }, [normalizedQuery])

  useEffect(() => {
    setDraftMode(null)
    setSelectedIngredient(null)
    setDetailQuantity('')
    setDetailUnit('')
    setDetailNotes('')
    setDetailErrors({})
    setActionStatus('')
  }, [normalizedQuery])

  function toNumberOrNull(value) {
    if (value === '' || value === null || value === undefined) return null
    const parsed = Number(value)
    return Number.isNaN(parsed) ? null : parsed
  }

  function resetDraftState() {
    setQuery('')
    setNewUnit('')
    setNewIsFresh(false)
    setDraftMode(null)
    setSelectedIngredient(null)
    setDetailQuantity('')
    setDetailUnit('')
    setDetailNotes('')
    setDetailErrors({})
    setSuggestions([])
    setShowForm(false)
  }

  async function addIngredientToRecipe(ingredientId) {
    if (!recipeId) return
    setActionStatus('')

    const { error: insertError } = await supabase
      .from('recipe_ingredients')
      .insert({
        recipe_id: recipeId,
        ingredient_id: ingredientId,
        quantity: toNumberOrNull(detailQuantity),
        unit: detailUnit?.trim() || null,
        notes: detailNotes.trim() || null,
      })

    if (insertError) {
      setActionStatus(insertError.message ?? 'Unable to add ingredient.')
      return
    }

    resetDraftState()
    await loadIngredients()
  }

  async function handleCreateIngredient() {
    if (!normalizedQuery) return
    setActionStatus('')

    const { data, error: createError } = await supabase
      .from('ingredients')
      .insert({
        name: query.trim(),
        default_unit: newUnit,
        is_synergy_core: newIsFresh,
      })
      .select('id')
      .single()

    if (createError) {
      setActionStatus(createError.message ?? 'Unable to create ingredient.')
      return
    }

    await addIngredientToRecipe(data.id)
  }

  function handleSelectExisting(ingredient) {
    setActionStatus('')
    setDraftMode('existing')
    setSelectedIngredient(ingredient)
    setDetailUnit(ingredient.default_unit || 'units')
    setDetailErrors({})
  }

  function handleStartNewIngredient() {
    if (!normalizedQuery) return
    setActionStatus('')
    setDraftMode('new')
    setSelectedIngredient(null)
    setDetailErrors({})
  }

  function handleContinueToDetails() {
    setDetailUnit(newUnit || 'units')
    setDetailErrors({})
  }

  function validateDetails() {
    const nextErrors = {}
    if (!detailQuantity || toNumberOrNull(detailQuantity) === null) {
      nextErrors.quantity = 'Quantity is required.'
    }
    if (!detailUnit?.trim()) {
      nextErrors.unit = 'Unit is required.'
    }
    setDetailErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-lg shadow-black/5 dark:border-slate-800 dark:bg-slate-950/70 dark:shadow-black/20">
      <header className="mb-2">
        <h2 className="text-xl font-semibold">Ingredients</h2>
      </header>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {loading && 'Loading ingredients...'}
          </p>
        </div>

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        {items.length === 0 && !loading ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
            No ingredients yet.
          </div>
        ) : null}

        {items.length > 0 ? (
          <ul className="grid gap-2">
            {items.map((item) => (
              <li
                key={
                  item.ingredient_id ??
                  item.ingredients?.id ??
                  item.ingredients?.name
                }
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-200"
              >
                <span>{item.ingredients?.name ?? 'Unnamed ingredient'}</span>
                <span className="text-xs text-slate-500 dark:text-slate-500">
                  {item.unit || item.ingredients?.default_unit || 'unit'}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {showForm ? (
          <div className="flex flex-col gap-3">
            <hr className="border-slate-200 dark:border-slate-800" />
            {draftMode !== 'new' ? (
              <label className="form-label">
                Ingredient name
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="e.g. Smoked paprika"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-400"
                />
              </label>
            ) : null}

            <div className="flex flex-col gap-2 text-sm">
              {draftMode === null ? (
                <>
                  <button
                    type="button"
                    onClick={handleStartNewIngredient}
                    disabled={!normalizedQuery || hasExactMatch}
                    className="w-full rounded-lg border border-dashed border-slate-300 px-3 py-2 text-left text-sm text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 dark:border-slate-600 dark:text-slate-200 dark:hover:border-slate-400 dark:hover:text-white dark:disabled:border-slate-800 dark:disabled:text-slate-500"
                  >
                    Add new ingredient “{query.trim() || '…'}”
                  </button>

                  {suggestions.map((ingredient) => (
                    <button
                      key={ingredient.id}
                      type="button"
                      onClick={() => handleSelectExisting(ingredient)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-900"
                    >
                      Use existing: {ingredient.name}
                    </button>
                  ))}
                </>
              ) : null}

              {draftMode === 'new' ? (
                <div className="flex flex-col gap-3 text-left text-sm text-slate-700 dark:text-slate-200">
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Adding {query.trim() || 'ingredient'} to recipe
                  </div>
                </div>
              ) : null}
            </div>

            {draftMode === 'new' || draftMode === 'existing' ? (
              <div className="flex flex-col gap-3 text-left text-sm text-slate-700 dark:text-slate-200">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="form-label">
                    Recipe Quantity
                    <input
                      type="number"
                      inputMode="decimal"
                      value={detailQuantity}
                      onChange={(event) => setDetailQuantity(event.target.value)}
                      className="rounded-md border border-slate-200 bg-white px-2 py-2 text-sm text-slate-900 outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-400"
                    />
                    {detailErrors.quantity ? (
                      <span className="text-[11px] text-rose-500">
                        {detailErrors.quantity}
                      </span>
                    ) : null}
                  </label>

                  <label className="form-label">
                    Recipe Unit
                    <select
                      value={detailUnit}
                      onChange={(event) => setDetailUnit(event.target.value)}
                      className="rounded-md border border-slate-200 bg-white px-2 py-2 text-sm text-slate-900 outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-400"
                    >
                      <option value="">Select unit</option>
                      <option value="units">Units</option>
                      <option value="grams">Grams</option>
                      <option value="tsps">Tsps</option>
                      <option value="tbsp">Tbsp</option>
                      <option value="cups">Cups</option>
                    </select>
                    {detailErrors.unit ? (
                      <span className="text-[11px] text-rose-500">
                        {detailErrors.unit}
                      </span>
                    ) : null}
                  </label>
                </div>
                <label className="form-label">
                  Notes
                  <input
                    type="text"
                    value={detailNotes}
                    onChange={(event) => setDetailNotes(event.target.value)}
                    className="rounded-md border border-slate-200 bg-white px-2 py-2 text-sm text-slate-900 outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-400"
                  />
                </label>

                {draftMode === 'new' ? (
                  <div className="mt-2 flex flex-col gap-3">
                    <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300">
                      These optional settings apply to the ingredient itself (not
                      just this recipe) and will affect every recipe that uses it.
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="form-label">
                        Default Unit
                        <select
                          value={newUnit}
                          onChange={(event) => setNewUnit(event.target.value)}
                          className="rounded-md border border-slate-200 bg-white px-2 py-2 text-sm text-slate-900 outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-400"
                        >
                          <option value="">Select unit</option>
                          <option value="units">Units</option>
                          <option value="grams">Grams</option>
                          <option value="tsps">Tsps</option>
                          <option value="tbsp">Tbsp</option>
                          <option value="cups">Cups</option>
                        </select>
                      </label>

                      <label className="form-label">
                        Fresh (synergy core)
                        <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                          <input
                            type="checkbox"
                            checked={newIsFresh}
                            onChange={(event) => setNewIsFresh(event.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900/20 dark:border-slate-600 dark:bg-slate-950 dark:text-white dark:focus:ring-white/30"
                          />
                          <span>{newIsFresh ? 'Yes' : 'No'}</span>
                        </div>
                      </label>
                    </div>
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() => {
                    if (!validateDetails()) return
                    if (draftMode === 'existing' && selectedIngredient) {
                      addIngredientToRecipe(selectedIngredient.id)
                    } else if (draftMode === 'new') {
                      handleCreateIngredient()
                    }
                  }}
                  className="mt-3 w-full rounded-lg border border-slate-300 bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:border-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                >
                  {draftMode === 'new' ? 'Add New Ingredient' : 'Add Ingredient'}
                </button>
              </div>
            ) : null}

            {searching ? (
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="h-3 w-3 animate-spin rounded-full border border-slate-300 border-t-slate-900 dark:border-slate-600 dark:border-t-slate-300" />
                Searching ingredients…
              </div>
            ) : null}

            {actionStatus ? (
              <p className="mt-3 text-xs text-rose-300">{actionStatus}</p>
            ) : null}
          </div>
        ) : null}

        <button
          type="button"
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700 transition hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:text-white"
          onClick={() => {
            if (showForm) {
              resetDraftState()
              return
            }
            setShowForm(true)
            setActionStatus('')
          }}
        >
          {showForm ? 'Cancel' : 'Add Ingredient'}
        </button>
      </div>
    </section>
  )
}
