import { useMemo } from 'react'

export default function RecipeFilterControls({
  sortBy,
  onSortByChange,
  selectedIngredients,
  onSelectedIngredientsChange,
  recipes,
  className = '',
}) {
  const ingredientOptions = useMemo(() => {
    const names = new Set()

    ;(recipes ?? []).forEach((recipe) => {
      ;(recipe.ingredients ?? []).forEach((ingredient) => {
        const name = ingredient?.name?.trim()
        if (name) names.add(name)
      })
    })

    return Array.from(names).sort((a, b) => a.localeCompare(b))
  }, [recipes])

  const selectedSet = useMemo(
    () => new Set(selectedIngredients ?? []),
    [selectedIngredients]
  )

  const handleToggleIngredient = (name) => {
    const next = selectedSet.has(name)
      ? (selectedIngredients ?? []).filter((item) => item !== name)
      : [...(selectedIngredients ?? []), name]

    onSelectedIngredientsChange(next)
  }

  return (
    <div className={`flex flex-col gap-3 md:flex-row md:items-end ${className}`.trim()}>
      <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-600 dark:text-sky-300">
        Sort by
        <select
          value={sortBy}
          onChange={(event) => onSortByChange(event.target.value)}
          className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-sky-900 outline-none focus:border-sky-900 focus:ring-2 focus:ring-sky-900/20 dark:border-sky-800 dark:bg-sky-900 dark:text-sky-100 dark:focus:border-white dark:focus:ring-white/40"
        >
          <option value="alphabetical">Alphabetical</option>
          <option value="cook-time">Cook time</option>
        </select>
      </label>

      <div className="flex min-w-[16rem] flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-600 dark:text-sky-300">
        <span>Ingredients</span>
        <details className="group relative">
          <summary className="cursor-pointer list-none rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-sky-900 outline-none transition hover:border-sky-400 dark:border-sky-800 dark:bg-sky-900 dark:text-sky-100">
            {selectedIngredients?.length
              ? `${selectedIngredients.length} selected`
              : 'All ingredients'}
          </summary>
          <div className="absolute z-20 mt-2 w-80 max-w-[90vw] rounded-lg border border-sky-200 bg-white p-3 shadow-xl shadow-black/10 dark:border-sky-800 dark:bg-sky-950 dark:shadow-black/30">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-500 dark:text-sky-400">
                Select one or more
              </span>
              <button
                type="button"
                onClick={() => onSelectedIngredientsChange([])}
                className="rounded-full border border-sky-200 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-700 transition hover:border-sky-400 hover:text-sky-900 dark:border-sky-700 dark:text-sky-200 dark:hover:border-sky-500 dark:hover:text-white"
              >
                Clear
              </button>
            </div>
            {ingredientOptions.length === 0 ? (
              <p className="text-xs normal-case tracking-normal text-sky-500 dark:text-sky-400">
                No ingredients available.
              </p>
            ) : (
              <ul className="max-h-56 overflow-auto pr-1 text-sm normal-case tracking-normal text-sky-800 dark:text-sky-100">
                {ingredientOptions.map((name) => (
                  <li key={name}>
                    <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-sky-50 dark:hover:bg-sky-900/60">
                      <input
                        type="checkbox"
                        checked={selectedSet.has(name)}
                        onChange={() => handleToggleIngredient(name)}
                        className="h-4 w-4 rounded border-sky-300 text-sky-900 focus:ring-sky-900/20 dark:border-sky-700 dark:bg-sky-900 dark:text-sky-200"
                      />
                      <span>{name}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </details>
      </div>
    </div>
  )
}
