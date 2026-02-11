import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const SUPERMARKET_SECTIONS = [
  'Fruit & Vegtables',
  'Fridge',
  'Bakery',
  'Cupboard',
  'Snacks and Sweets',
  'Alcohol',
  'Freezer',
]

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
  const [newDefaultQuantity, setNewDefaultQuantity] = useState('')
  const [newSupermarketSection, setNewSupermarketSection] = useState('')
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
        'ingredient_id, quantity, unit, notes, ingredients ( id, name, default_unit, default_quantity, supermarket_section )'
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
        .select('id, name, default_unit, default_quantity, supermarket_section')
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

  function toPositiveWholeNumberOrNull(value) {
    if (value === '' || value === null || value === undefined) return null
    const parsed = Number.parseInt(value, 10)
    if (Number.isNaN(parsed)) return null
    if (String(parsed) !== String(value).trim()) return null
    if (parsed <= 0) return null
    return parsed
  }

  function resetDraftState() {
    setQuery('')
    setNewUnit('')
    setNewDefaultQuantity('')
    setNewSupermarketSection('')
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

  async function removeIngredientFromRecipe(ingredientId) {
    if (!recipeId || !ingredientId) return
    setActionStatus('')

    const { error: deleteError } = await supabase
      .from('recipe_ingredients')
      .delete()
      .eq('recipe_id', recipeId)
      .eq('ingredient_id', ingredientId)

    if (deleteError) {
      setActionStatus(deleteError.message ?? 'Unable to remove ingredient.')
      return
    }

    await loadIngredients()
  }

  async function handleCreateIngredient() {
    if (!normalizedQuery) return
    setActionStatus('')
    const parsedDefaultQuantity = toPositiveWholeNumberOrNull(newDefaultQuantity)
    const hasDefaultQuantity = String(newDefaultQuantity ?? '').trim() !== ''
    if (hasDefaultQuantity && parsedDefaultQuantity === null) {
      setActionStatus('Default quantity must be a whole number greater than 0.')
      return
    }

    const { data, error: createError } = await supabase
      .from('ingredients')
      .insert({
        name: query.trim(),
        default_unit: newUnit,
        default_quantity: parsedDefaultQuantity,
        supermarket_section: newSupermarketSection || null,
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
    setDetailQuantity(ingredient.default_quantity ?? '')
    setDetailUnit(ingredient.default_unit || 'count')
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
    setDetailUnit(newUnit || 'count')
    setDetailErrors({})
  }

  function handleDetailUnitChange(nextValue) {
    setDetailUnit(nextValue)
    if (draftMode === 'new') {
      setNewUnit(nextValue)
    }
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
    <section className="rounded-2xl border border-sky-200 bg-white/80 p-6 shadow-lg shadow-black/5 dark:border-sky-800 dark:bg-sky-950/70 dark:shadow-black/20">
      <header className="mb-2">
        <h2 className="text-xl font-semibold">Ingredients</h2>
      </header>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-sky-500 dark:text-sky-400">
            {loading && 'Loading ingredients...'}
          </p>
        </div>

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        {items.length === 0 && !loading ? (
          <div className="rounded-xl border border-dashed border-sky-200 bg-sky-50 p-6 text-center text-sm text-sky-500 dark:border-sky-800 dark:bg-sky-900/40 dark:text-sky-400">
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
                className="flex items-center justify-between gap-3 rounded-xl border border-sky-200 bg-white px-4 py-3 text-sm text-sky-700 dark:border-sky-800 dark:bg-sky-900/50 dark:text-sky-200"
              >
                <span>
                  {(() => {
                    const name = item.ingredients?.name ?? 'Unnamed ingredient'
                    if (item.quantity === null || item.quantity === undefined) {
                      return name
                    }
                    const unit = item.unit || item.ingredients?.default_unit
                    const normalizedUnit = unit?.toLowerCase().trim()
                    const showUnit = normalizedUnit && normalizedUnit !== 'count'
                    const prefix = [item.quantity, showUnit ? unit : null]
                      .filter(Boolean)
                      .join(' ')
                    return `${prefix} • ${name}`
                  })()}
                </span>
                <button
                  type="button"
                  onClick={() => removeIngredientFromRecipe(item.ingredient_id)}
                  className="rounded-md border border-rose-200 px-2 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-rose-600 transition hover:border-rose-300 hover:text-rose-700 dark:border-rose-900/60 dark:text-rose-300 dark:hover:border-rose-700 dark:hover:text-rose-200"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {showForm ? (
          <div className="flex flex-col gap-3">
            <hr className="my-4 border-sky-200 dark:border-sky-800" />
            {draftMode === null ? (
              <label className="form-label">
                Ingredient name
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="e.g. Smoked paprika"
                  className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm text-sky-900 outline-none transition focus:border-sky-900 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-100 dark:focus:border-sky-400"
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
                    className="w-full rounded-lg border border-dashed border-sky-300 px-3 py-2 text-left text-sm text-sky-700 transition hover:border-sky-400 hover:text-sky-900 disabled:cursor-not-allowed disabled:border-sky-200 disabled:text-sky-400 dark:border-sky-600 dark:text-sky-200 dark:hover:border-sky-400 dark:hover:text-white dark:disabled:border-sky-800 dark:disabled:text-sky-500"
                  >
                    Add new ingredient “{query.trim() || '…'}”
                  </button>

                  {suggestions.map((ingredient) => (
                    <button
                      key={ingredient.id}
                      type="button"
                      onClick={() => handleSelectExisting(ingredient)}
                      className="w-full rounded-lg border border-sky-200 bg-white px-3 py-2 text-left text-sm text-sky-700 transition hover:border-sky-400 hover:bg-sky-50 dark:border-sky-800 dark:bg-sky-950/70 dark:text-sky-200 dark:hover:border-sky-600 dark:hover:bg-sky-900"
                    >
                      Use existing: {ingredient.name}
                    </button>
                  ))}
                </>
              ) : null}

              {draftMode === 'new' || draftMode === 'existing' ? (
                <div className="flex flex-col gap-3 text-center text-sm text-sky-700 dark:text-sky-200">
                  <div className="text-base font-semibold text-sky-800 dark:text-sky-200">
                    Adding {selectedIngredient?.name || query.trim() || 'ingredient'}
                  </div>
                </div>
              ) : null}
            </div>

            {draftMode === 'new' || draftMode === 'existing' ? (
              <div className="flex flex-col gap-3 text-left text-sm text-sky-700 dark:text-sky-200">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="form-label">
                    Recipe Quantity
                    <input
                      type="number"
                      inputMode="decimal"
                      value={detailQuantity}
                      onChange={(event) => setDetailQuantity(event.target.value)}
                      className="rounded-md border border-sky-200 bg-white px-2 py-2 text-sm text-sky-900 outline-none focus:border-sky-900 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-100 dark:focus:border-sky-400"
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
                      onChange={(event) => handleDetailUnitChange(event.target.value)}
                      className="rounded-md border border-sky-200 bg-white px-2 py-2 text-sm text-sky-900 outline-none focus:border-sky-900 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-100 dark:focus:border-sky-400"
                    >
                      <option value="">Select unit</option>
                      <option value="count">count</option>
                      <option value="g">g</option>
                      <option value="tsp">tsp</option>
                      <option value="tbsp">tbsp</option>
                      <option value="cup">cup</option>
                    </select>
                    {detailErrors.unit ? (
                      <span className="text-[11px] text-rose-500">
                        {detailErrors.unit}
                      </span>
                    ) : null}
                  </label>
                </div>
                <label className="form-label">
                  Recipe Ingredient Notes
                  <input
                    type="text"
                    value={detailNotes}
                    onChange={(event) => setDetailNotes(event.target.value)}
                    className="rounded-md border border-sky-200 bg-white px-2 py-2 text-sm text-sky-900 outline-none focus:border-sky-900 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-100 dark:focus:border-sky-400"
                  />
                </label>

                {draftMode === 'new' ? (
                  <div className="mt-2 flex flex-col gap-3">
                    <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-600 dark:border-sky-800 dark:bg-sky-900/40 dark:text-sky-300">
                      These optional settings apply to the ingredient itself (not
                      just this recipe) and will affect every recipe that uses it.
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="form-label">
                        Default Unit
                        <select
                          value={newUnit}
                          onChange={(event) => setNewUnit(event.target.value)}
                          className="rounded-md border border-sky-200 bg-white px-2 py-2 text-sm text-sky-900 outline-none focus:border-sky-900 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-100 dark:focus:border-sky-400"
                        >
                          <option value="">Select unit</option>
                          <option value="count">count</option>
                          <option value="g">g</option>
                          <option value="tsp">tsp</option>
                          <option value="tbsp">tbsp</option>
                          <option value="cup">cup</option>
                        </select>
                      </label>

                      <label className="form-label">
                        Default Quantity
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={newDefaultQuantity}
                          onChange={(event) =>
                            setNewDefaultQuantity(event.target.value)
                          }
                          className="rounded-md border border-sky-200 bg-white px-2 py-2 text-sm text-sky-900 outline-none focus:border-sky-900 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-100 dark:focus:border-sky-400"
                          placeholder="1"
                        />
                      </label>

                      <label className="form-label">
                        Supermarket Section
                        <select
                          value={newSupermarketSection}
                          onChange={(event) =>
                            setNewSupermarketSection(event.target.value)
                          }
                          className="rounded-md border border-sky-200 bg-white px-2 py-2 text-sm text-sky-900 outline-none focus:border-sky-900 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-100 dark:focus:border-sky-400"
                        >
                          <option value="">Select section</option>
                          {SUPERMARKET_SECTIONS.map((section) => (
                            <option key={section} value={section}>
                              {section}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="form-label">
                        Fresh (synergy core)
                        <div className="flex items-center gap-2 rounded-md border border-sky-200 bg-white px-2 py-2 text-sm text-sky-900 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-100">
                          <input
                            type="checkbox"
                            checked={newIsFresh}
                            onChange={(event) => setNewIsFresh(event.target.checked)}
                            className="h-4 w-4 rounded border-sky-300 text-sky-900 focus:ring-sky-900/20 dark:border-sky-600 dark:bg-sky-950 dark:text-white dark:focus:ring-white/30"
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
                  className="mt-3 w-full rounded-lg border border-sky-300 bg-sky-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-sky-800 dark:border-sky-700 dark:bg-white dark:text-sky-900 dark:hover:bg-sky-100"
                >
                  {draftMode === 'new' ? 'Add New Ingredient' : 'Add Ingredient'}
                </button>
              </div>
            ) : null}

            {searching ? (
              <div className="mt-3 flex items-center gap-2 text-xs text-sky-500 dark:text-sky-400">
                <span className="h-3 w-3 animate-spin rounded-full border border-sky-300 border-t-sky-900 dark:border-sky-600 dark:border-t-sky-300" />
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
          className="w-full rounded-xl border border-sky-300 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700 transition hover:border-sky-400 hover:text-sky-900 dark:border-sky-700 dark:text-sky-200 dark:hover:border-sky-500 dark:hover:text-white"
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
