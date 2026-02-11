import { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function formatQuantity(quantity, unit, defaultUnit) {
  if (quantity === null || quantity === undefined || quantity === '') {
    return unit || defaultUnit || ''
  }
  if (unit) return `${quantity} ${unit}`
  if (defaultUnit) return `${quantity} ${defaultUnit}`
  return `${quantity}`
}

function formatNumber(value) {
  if (Number.isInteger(value)) return value.toString()
  return value.toFixed(2).replace(/\.?0+$/, '')
}

export default function ShoppingList() {
  const [household, setHousehold] = useState(null)
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copyStatus, setCopyStatus] = useState('')
  const [checkedItems, setCheckedItems] = useState({})

  const shoppingItems = useMemo(() => {
    const map = new Map()

    recipes.forEach((recipe) => {
      recipe.ingredients.forEach((ingredient) => {
        const name = ingredient.name || 'Unnamed ingredient'
        const unit = ingredient.unit || ingredient.defaultUnit || ''
        const key = `${name}|||${unit}`
        const quantityValue =
          ingredient.quantity === '' || ingredient.quantity === null
            ? null
            : Number(ingredient.quantity)
        const hasNumeric = Number.isFinite(quantityValue)

        if (!map.has(key)) {
          map.set(key, {
            name,
            unit,
            quantity: 0,
            hasNumeric: false,
            quantityNotes: [],
            notes: new Set(),
          })
        }

        const entry = map.get(key)

        if (hasNumeric) {
          entry.quantity += quantityValue
          entry.hasNumeric = true
        } else if (
          ingredient.quantity !== null &&
          ingredient.quantity !== undefined &&
          ingredient.quantity !== ''
        ) {
          entry.quantityNotes.push(String(ingredient.quantity))
        }

        if (ingredient.notes) {
          entry.notes.add(ingredient.notes)
        }
      })
    })

    return Array.from(map.values())
      .map((entry) => {
        const quantityParts = []
        if (entry.hasNumeric) {
          quantityParts.push(formatNumber(entry.quantity))
        }
        if (entry.quantityNotes.length > 0) {
          quantityParts.push(...entry.quantityNotes)
        }

        const quantityText =
          quantityParts.length > 0 ? quantityParts.join(' + ') : ''
        const unitText = entry.unit ? ` ${entry.unit}` : ''
        const display = quantityText
          ? `${quantityText}${unitText} ${entry.name}`
          : entry.name

        return {
          ...entry,
          display,
          notes: Array.from(entry.notes).join('; '),
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [recipes])

  const recipeNames = useMemo(
    () => recipes.map((recipe) => recipe.title).filter(Boolean).sort((a, b) => a.localeCompare(b)),
    [recipes]
  )

  const uncheckedItems = useMemo(
    () => shoppingItems.filter((item) => !checkedItems[`${item.name}|||${item.unit}`]),
    [shoppingItems, checkedItems]
  )

  const checkedList = useMemo(
    () => shoppingItems.filter((item) => checkedItems[`${item.name}|||${item.unit}`]),
    [shoppingItems, checkedItems]
  )

  useEffect(() => {
    let isMounted = true

    async function loadShoppingList() {
      setLoading(true)
      setError('')

      const { data: userData, error: userError } = await supabase.auth.getUser()

      if (!isMounted) return

      if (userError) {
        setError(userError.message ?? 'Unable to load your account.')
        setLoading(false)
        return
      }

      const user = userData?.user

      if (!user) {
        setError('Please sign in to view your shopping list.')
        setLoading(false)
        return
      }

      const { data: memberRow, error: memberError } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()

      if (memberError) {
        setError(memberError.message ?? 'Unable to load household membership.')
        setLoading(false)
        return
      }

      if (!memberRow?.household_id) {
        setHousehold(null)
        setRecipes([])
        setLoading(false)
        return
      }

      const { data: householdRow, error: householdError } = await supabase
        .from('households')
        .select('id, name')
        .eq('id', memberRow.household_id)
        .single()

      if (householdError) {
        setError(householdError.message ?? 'Unable to load household.')
        setLoading(false)
        return
      }

      setHousehold(householdRow ?? null)

      const { data: planRows, error: planError } = await supabase
        .from('plan_recipes')
        .select('recipe_id')
        .eq('household_id', memberRow.household_id)

      if (planError) {
        setError(planError.message ?? 'Unable to load plan recipes.')
        setRecipes([])
        setLoading(false)
        return
      }

      const recipeIds = (planRows ?? [])
        .map((row) => row.recipe_id)
        .filter(Boolean)

      if (recipeIds.length === 0) {
        setRecipes([])
        setLoading(false)
        return
      }

      const { data: plannedRows, error: plannedError } = await supabase
        .from('recipes')
        .select(
          'id, title, recipe_ingredients ( quantity, unit, notes, ingredients ( id, name, default_unit ) )'
        )
        .in('id', recipeIds)
        .order('title')

      if (plannedError) {
        setError(plannedError.message ?? 'Unable to load planned recipes.')
        setRecipes([])
        setLoading(false)
        return
      }

      const normalized = (plannedRows ?? []).map((recipe) => {
        const ingredients = (recipe.recipe_ingredients ?? [])
          .map((entry) => ({
            id: entry.ingredients?.id ?? entry.ingredient_id,
            name: entry.ingredients?.name ?? 'Unnamed ingredient',
            quantity: entry.quantity,
            unit: entry.unit,
            defaultUnit: entry.ingredients?.default_unit,
            notes: entry.notes,
          }))
          .sort((a, b) => a.name.localeCompare(b.name))

        return {
          id: recipe.id,
          title: recipe.title || 'Untitled recipe',
          ingredients,
        }
      })

      setRecipes(normalized)
      setLoading(false)
    }

    loadShoppingList()

    return () => {
      isMounted = false
    }
  }, [])

  const handleCopyShoppingList = async () => {
    if (uncheckedItems.length === 0) return
    const headerLines =
      recipeNames.length > 0
        ? [`Recipes: ${recipeNames.join(', ')}`, '']
        : []
    const lines = uncheckedItems.map((item) => {
      const notes = item.notes ? ` (${item.notes})` : ''
      return `- ${item.display}${notes}`
    })
    try {
      await navigator.clipboard.writeText([...headerLines, ...lines].join('\n'))
      setCopyStatus('Copied!')
      setTimeout(() => setCopyStatus(''), 2000)
    } catch (copyError) {
      setCopyStatus('Copy failed')
      setTimeout(() => setCopyStatus(''), 2000)
    }
  }

  const handlePrintShoppingList = () => {
    if (uncheckedItems.length === 0) return
    window.print()
  }

  const handleToggleItem = (itemKey) => {
    setCheckedItems((prev) => ({
      ...prev,
      [itemKey]: !prev[itemKey],
    }))
  }

  return (
    <>
      <Helmet>
        <title>Shop - Recipes</title>
      </Helmet>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area,
          .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print-area > div:first-child {
            column-span: all;
            border: none !important;
            background: transparent !important;
            padding: 0 0 0.5rem 0 !important;
            color: #000 !important;
            font-size: 0.85rem !important;
            text-transform: none !important;
            letter-spacing: normal !important;
          }
          .print-area > div:first-child > div:first-child {
            color: #000 !important;
            font-weight: 400 !important;
            text-transform: none !important;
            letter-spacing: normal !important;
          }
          .print-area > div:first-child ul {
            border: none !important;
            background: transparent !important;
            padding: 0 0 0 1.25rem !important;
            color: #000 !important;
          }
          .print-area > div:first-child li {
            color: #000 !important;
          }
          .print-area > div:nth-child(2) {
            column-span: all;
            color: #000 !important;
            font-size: 0.8rem !important;
            text-transform: none !important;
            letter-spacing: normal !important;
            font-weight: 400 !important;
            margin: 0 0 0.35rem 0 !important;
          }
          .print-area ul {
            list-style: disc;
            padding-left: 1.5rem;
            column-count: 2;
            column-gap: 2.5rem;
          }
          .print-area li {
            border: none !important;
            background: transparent !important;
            padding: 0.15rem 0 !important;
          }
          .print-area span {
            color: #000 !important;
          }
          .print-area li,
          .print-area span {
            font-weight: 400 !important;
            font-size: 12px !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      <div className="flex flex-col gap-6">
        {loading ? (
          <p className="text-sm text-sky-500 dark:text-sky-400">
            Loading shopping list...
          </p>
        ) : error ? (
          <p className="text-sm text-rose-300">{error}</p>
        ) : !household ? (
          <div className="rounded-2xl border border-dashed border-sky-200 bg-sky-50 p-6 text-center dark:border-sky-800 dark:bg-sky-900/50">
            <p className="text-sm text-sky-600 dark:text-sky-300">
              Join a{' '}
              <Link className="font-semibold text-sky-900 underline dark:text-white" to="/household">
                household
              </Link>{' '}
              to view your shopping list.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex flex-col gap-2">
                  <h2 className="text-lg font-semibold text-sky-900 dark:text-sky-100">
                    Shopping List
                  </h2>
                  <p className="text-sm text-sky-600 dark:text-sky-300">
                    To change recipes on this list, update your{' '}
                    <Link className="font-semibold text-sky-900 underline dark:text-white" to="/plan">
                      plan
                    </Link>
                    .
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                {copyStatus ? (
                  <span className="no-print text-xs font-semibold uppercase tracking-[0.2em] text-sky-500 dark:text-sky-400">
                    {copyStatus}
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={handleCopyShoppingList}
                  disabled={shoppingItems.length === 0}
                  className="no-print rounded-full border border-sky-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700 transition hover:border-sky-400 hover:text-sky-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-sky-700 dark:text-sky-200 dark:hover:border-sky-500 dark:hover:text-white"
                >
                  Copy
                </button>
                  <button
                    type="button"
                    onClick={handlePrintShoppingList}
                    disabled={shoppingItems.length === 0}
                    className="no-print rounded-full bg-sky-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-lg shadow-black/10 transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-sky-900 dark:shadow-black/20 dark:hover:bg-sky-100"
                  >
                    Print
                  </button>
                  {shoppingItems.length > 0 ? (
                    <Link
                      to="/migrate"
                      className="no-print rounded-full border border-sky-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700 transition hover:border-sky-400 hover:text-sky-900 dark:border-sky-700 dark:text-sky-200 dark:hover:border-sky-500 dark:hover:text-white"
                    >
                      Move to menu
                    </Link>
                  ) : null}
                </div>
              </div>
            {shoppingItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-sky-200 bg-sky-50 p-6 text-center dark:border-sky-800 dark:bg-sky-900/40">
                <p className="text-sm font-semibold text-sky-700 dark:text-sky-200">
                  No items yet.
                </p>
                <p className="mt-2 text-sm text-sky-600 dark:text-sky-300">
                  Add recipes to your plan to generate a shopping list.
                </p>
                <Link
                  to="/plan"
                  className="mt-4 inline-flex rounded-full bg-sky-900 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-lg shadow-black/10 transition hover:bg-sky-800 dark:bg-white dark:text-sky-900 dark:shadow-black/20 dark:hover:bg-sky-100"
                >
                  Go to plan
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-2 text-sm text-sky-700 dark:text-sky-200">
                <div className="print-area flex flex-col gap-3">
                  {recipeNames.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      <div className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700 dark:text-sky-200">
                        Recipes:
                      </div>
                      <ul className="rounded-lg border border-sky-100 bg-white px-5 py-3 pl-8 text-sm text-sky-700 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-200">
                        {recipeNames.map((name) => (
                          <li key={name} className="list-disc pl-1">
                            {name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <div className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700 dark:text-sky-200">
                    Ingredients:
                  </div>
                  <ul className="flex flex-col gap-2">
                    {uncheckedItems.map((item) => {
                      const itemKey = `${item.name}|||${item.unit}`
                      return (
                        <li
                          key={itemKey}
                          className="flex flex-wrap items-center gap-3 rounded-lg border border-sky-100 bg-white px-3 py-2 dark:border-sky-800 dark:bg-sky-950/60"
                        >
                          <label className="flex w-full items-start gap-3">
                            <input
                              type="checkbox"
                              checked={Boolean(checkedItems[itemKey])}
                              onChange={() => handleToggleItem(itemKey)}
                              className="mt-1 h-4 w-4 rounded border-sky-300 text-sky-900 focus:ring-sky-900 dark:border-sky-700 dark:text-white dark:focus:ring-white"
                            />
                            <span className="font-semibold text-sky-900 dark:text-sky-100">
                              {item.display}
                              {item.notes ? ` (${item.notes})` : ''}
                            </span>
                          </label>
                        </li>
                      )
                    })}
                  </ul>
                </div>
                {checkedList.length > 0 ? (
                  <div className="mt-4 flex flex-col gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-500 dark:text-sky-400">
                      Already have
                    </p>
                    <ul className="flex flex-col gap-2">
                      {checkedList.map((item) => {
                        const itemKey = `${item.name}|||${item.unit}`
                        return (
                          <li
                            key={`checked-${itemKey}`}
                            className="flex flex-wrap items-center gap-3 rounded-lg border border-sky-100 bg-white/70 px-3 py-2 text-sky-500 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-400"
                          >
                            <label className="flex w-full items-start gap-3">
                              <input
                                type="checkbox"
                                checked={Boolean(checkedItems[itemKey])}
                                onChange={() => handleToggleItem(itemKey)}
                                className="mt-1 h-4 w-4 rounded border-sky-300 text-sky-900 focus:ring-sky-900 dark:border-sky-700 dark:text-white dark:focus:ring-white"
                              />
                              <span className="font-semibold">
                                {item.display}
                                {item.notes ? ` (${item.notes})` : ''}
                              </span>
                            </label>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
