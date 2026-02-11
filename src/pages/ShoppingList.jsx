import { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const SECTION_ORDER = [
  'Fruit & Vegtables',
  'Fridge',
  'Bakery',
  'Cupboard',
  'Snacks and Sweets',
  'Alcohol',
  'Freezer',
]
const UNCLASSIFIED_SECTION = 'Unclassified'

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

function buildSupermarketSearchUrl(supermarket, ingredientName) {
  const query = encodeURIComponent(ingredientName?.trim() ?? '')
  if (!query) return ''

  if (supermarket === 'Sainsburys') {
    return `https://www.sainsburys.co.uk/gol-ui/SearchResults/${query}`
  }
  if (supermarket === 'Waitrose') {
    return `https://www.waitrose.com/ecom/shop/search?searchTerm=${query}`
  }
  if (supermarket === 'Ocado') {
    return `https://www.ocado.com/search?q=${query}`
  }
  if (supermarket === 'Asda') {
    return `https://groceries.asda.com/search/${query}`
  }
  if (supermarket === 'Tesco') {
    return `https://www.tesco.com/groceries/en-GB/search?query=${query}`
  }

  return ''
}

function groupItemsBySection(items) {
  const grouped = new Map()

  ;(items ?? []).forEach((item) => {
    const section = item.section?.trim() || UNCLASSIFIED_SECTION
    if (!grouped.has(section)) grouped.set(section, [])
    grouped.get(section).push(item)
  })

  const knownSections = SECTION_ORDER.filter((section) => grouped.has(section))
  const unknownSections = Array.from(grouped.keys())
    .filter(
      (section) =>
        section !== UNCLASSIFIED_SECTION && !SECTION_ORDER.includes(section)
    )
    .sort((a, b) => a.localeCompare(b))

  const orderedSections = [
    ...knownSections,
    ...unknownSections,
    ...(grouped.has(UNCLASSIFIED_SECTION) ? [UNCLASSIFIED_SECTION] : []),
  ]

  return orderedSections.map((section) => ({
    section,
    items: (grouped.get(section) ?? [])
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name)),
  }))
}

export default function ShoppingList() {
  const [household, setHousehold] = useState(null)
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copyStatus, setCopyStatus] = useState('')
  const [checkedItems, setCheckedItems] = useState({})
  const [selectedSupermarket, setSelectedSupermarket] = useState('')

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
            supermarketSection: ingredient.supermarketSection || '',
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
        if (!entry.supermarketSection && ingredient.supermarketSection) {
          entry.supermarketSection = ingredient.supermarketSection
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
          section: entry.supermarketSection || UNCLASSIFIED_SECTION,
        }
      })
  }, [recipes])

  const recipeList = useMemo(
    () =>
      recipes
        .map((recipe) => ({ id: recipe.id, title: recipe.title }))
        .filter((recipe) => recipe.title)
        .sort((a, b) => a.title.localeCompare(b.title)),
    [recipes]
  )
  const recipeNames = useMemo(() => recipeList.map((recipe) => recipe.title), [recipeList])

  const uncheckedItems = useMemo(
    () => shoppingItems.filter((item) => !checkedItems[`${item.name}|||${item.unit}`]),
    [shoppingItems, checkedItems]
  )

  const checkedList = useMemo(
    () => shoppingItems.filter((item) => checkedItems[`${item.name}|||${item.unit}`]),
    [shoppingItems, checkedItems]
  )
  const groupedUncheckedItems = useMemo(
    () => groupItemsBySection(uncheckedItems),
    [uncheckedItems]
  )
  const groupedCheckedItems = useMemo(
    () => groupItemsBySection(checkedList),
    [checkedList]
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
          'id, title, recipe_ingredients ( quantity, unit, notes, ingredients ( id, name, default_unit, supermarket_section ) )'
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
            supermarketSection: entry.ingredients?.supermarket_section,
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
          .print-only {
            display: block !important;
          }
        }
        .print-only {
          display: none;
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
              <div className="flex flex-wrap items-start justify-between gap-4 md:flex-nowrap">
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <h1 className="text-2xl font-semibold text-sky-900 dark:text-sky-100">
                    Shopping List
                  </h1>
                  <p className="text-sm text-sky-600 dark:text-sky-300">
                    Tick off what&apos;s already in your kitchen, then copy what&apos;s left to send a
                    helper, print it for a proper paper run, or pick a supermarket to quickly order online.
                  </p>
                  <p className="text-sm text-sky-600 dark:text-sky-300">
                    To change recipes on this list, update your{' '}
                    <Link className="font-semibold text-sky-900 underline dark:text-white" to="/plan">
                      plan
                    </Link>
                    .
                  </p>
                  {recipeList.length > 0 ? (
                    <div className="no-print mt-1 flex flex-col gap-2">
                      <div className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700 dark:text-sky-200">
                        Recipes:
                      </div>
                      <ul className="rounded-lg border border-sky-100 bg-white px-5 py-3 pl-8 text-sm text-sky-700 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-200">
                        {recipeList.map((recipe) => (
                          <li key={recipe.id} className="list-disc pl-1">
                            <Link
                              to={`/recipe/${recipe.id}/view`}
                              className="underline decoration-sky-300 underline-offset-2 hover:text-sky-900 dark:decoration-sky-700 dark:hover:text-white"
                            >
                              {recipe.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                      <label className="mt-2 flex w-full max-w-xs flex-col gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-sky-700 dark:text-sky-200">
                        Online supermarket:
                        <select
                          value={selectedSupermarket}
                          onChange={(event) => setSelectedSupermarket(event.target.value)}
                          className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-sky-900 outline-none focus:border-sky-900 focus:ring-2 focus:ring-sky-900/20 dark:border-sky-800 dark:bg-sky-900 dark:text-sky-100 dark:focus:border-white dark:focus:ring-white/40"
                        >
                          <option value="">None</option>
                          <option value="Sainsburys">Sainsburys</option>
                          <option value="Waitrose">Waitrose</option>
                          <option value="Ocado">Ocado</option>
                          <option value="Asda">Asda</option>
                          <option value="Tesco">Tesco</option>
                        </select>
                      </label>
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-3 md:ml-auto md:flex-nowrap md:justify-end">
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
                  {recipeList.length > 0 ? (
                    <div className="print-only flex flex-col gap-2">
                      <div className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700 dark:text-sky-200">
                        Recipes:
                      </div>
                      <ul className="rounded-lg border border-sky-100 bg-white px-5 py-3 pl-8 text-sm text-sky-700 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-200">
                        {recipeList.map((recipe) => (
                          <li key={recipe.id} className="list-disc pl-1">
                            <Link
                              to={`/recipe/${recipe.id}/view`}
                              className="underline decoration-sky-300 underline-offset-2 hover:text-sky-900 dark:decoration-sky-700 dark:hover:text-white"
                            >
                              {recipe.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <div className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700 dark:text-sky-200">
                    Ingredient to Buy:
                  </div>
                  <div className="rounded-lg border border-sky-100 bg-white px-4 py-4 dark:border-sky-800 dark:bg-sky-950/60">
                    <div className="flex flex-col gap-4">
                      {groupedUncheckedItems.map((group) => (
                        <div key={`unchecked-${group.section}`} className="flex flex-col gap-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700 dark:text-sky-200">
                            {group.section}
                          </p>
                          <ul className="divide-y divide-sky-200 dark:divide-sky-800">
                            {group.items.map((item) => {
                              const itemKey = `${item.name}|||${item.unit}`
                              const searchUrl = buildSupermarketSearchUrl(selectedSupermarket, item.name)
                              return (
                                <li key={itemKey} className="py-2">
                                  <label className="flex w-full items-center gap-3">
                                    <input
                                      type="checkbox"
                                      checked={Boolean(checkedItems[itemKey])}
                                      onChange={() => handleToggleItem(itemKey)}
                                      className="h-4 w-4 rounded border-sky-300 text-sky-900 focus:ring-sky-900 dark:border-sky-700 dark:text-white dark:focus:ring-white"
                                    />
                                    <div className="flex flex-1 flex-wrap items-center gap-2">
                                      <span className="font-semibold text-sky-900 dark:text-sky-100">
                                        {item.display}
                                        {item.notes ? ` (${item.notes})` : ''}
                                      </span>
                                      {searchUrl ? (
                                        <a
                                          href={searchUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          aria-label={`Search ${selectedSupermarket} for ${item.name}`}
                                          title={`Search ${selectedSupermarket}`}
                                          className="no-print text-xs font-semibold text-sky-600 underline decoration-sky-300 underline-offset-2 transition hover:text-sky-900 dark:text-sky-300 dark:decoration-sky-700 dark:hover:text-white"
                                        >
                                          (Buy)
                                        </a>
                                      ) : null}
                                    </div>
                                  </label>
                                </li>
                              )
                            })}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {checkedList.length > 0 ? (
                  <div className="mt-4 flex flex-col gap-2">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700 dark:text-sky-200">
                      Ingredients you already have:
                    </p>
                    <div className="rounded-lg border border-sky-100 bg-white px-4 py-4 dark:border-sky-800 dark:bg-sky-950/60">
                      <div className="flex flex-col gap-4">
                        {groupedCheckedItems.map((group) => (
                          <div key={`checked-${group.section}`} className="flex flex-col gap-2">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700 dark:text-sky-200">
                              {group.section}
                            </p>
                            <ul className="divide-y divide-sky-200 dark:divide-sky-800">
                              {group.items.map((item) => {
                                const itemKey = `${item.name}|||${item.unit}`
                                return (
                                  <li key={`checked-${itemKey}`} className="py-2 text-sky-500 dark:text-sky-400">
                                    <label className="flex w-full items-center gap-3">
                                      <input
                                        type="checkbox"
                                        checked={Boolean(checkedItems[itemKey])}
                                        onChange={() => handleToggleItem(itemKey)}
                                        className="h-4 w-4 rounded border-sky-300 text-sky-900 focus:ring-sky-900 dark:border-sky-700 dark:text-white dark:focus:ring-white"
                                      />
                                      <div className="flex flex-1 flex-wrap items-center gap-2">
                                        <span className="font-semibold">
                                          {item.display}
                                          {item.notes ? ` (${item.notes})` : ''}
                                        </span>
                                      </div>
                                    </label>
                                  </li>
                                )
                              })}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
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
