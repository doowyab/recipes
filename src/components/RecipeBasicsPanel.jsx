import { useMemo, useState } from 'react'

function formatValue(value, fallback = '—') {
  if (value === null || value === undefined || value === '') return fallback
  return value
}

function validateNonNegativeInt(value, fieldName) {
  if (value === '' || value === null || value === undefined) return ''
  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed) || parsed < 0) {
    return `${fieldName} must be a non-negative number.`
  }
  if (String(parsed) !== String(value).trim()) {
    return `${fieldName} must be a whole number.`
  }
  return ''
}

export default function RecipeBasicsPanel({
  recipeDraft,
  setRecipeDraft,
  onSave,
  loading,
  saving,
  status,
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [errors, setErrors] = useState({})

  const hasErrors = useMemo(() => Object.values(errors).some(Boolean), [errors])

  function handleCancel() {
    setIsEditing(false)
    setErrors({})
  }

  function validateAll() {
    const nextErrors = {
      title: recipeDraft.title.trim() ? '' : 'Title is required.',
      preMinutes: validateNonNegativeInt(recipeDraft.preMinutes, 'Prep time'),
      cookMinutes: validateNonNegativeInt(recipeDraft.cookMinutes, 'Cook time'),
      servings: validateNonNegativeInt(recipeDraft.servings, 'Servings'),
    }

    setErrors(nextErrors)
    return !Object.values(nextErrors).some(Boolean)
  }

  async function handleSave() {
    if (!validateAll()) return

    try {
      await onSave()
      setIsEditing(false)
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        form: err.message ?? 'Unable to save recipe basics.',
      }))
    }
  }

  return (
    <section className="rounded-2xl border border-sky-200 bg-white/80 p-6 shadow-lg shadow-black/5 dark:border-sky-800 dark:bg-sky-950/70 dark:shadow-black/20">

      {loading ? (
        <p className="text-sm text-sky-500 dark:text-sky-400">
          Loading recipe...
        </p>
      ) : isEditing ? (
        <div className="grid gap-6 md:grid-cols-2">
          <label className="form-label">
            <span>Title</span>
            <input
              className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-sky-900 outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 dark:border-blue-900/60 dark:bg-sky-900 dark:text-sky-100 dark:placeholder:text-slate-500 dark:focus:border-blue-300 dark:focus:ring-blue-400/30"
              value={recipeDraft.title}
              onChange={(event) =>
                setRecipeDraft((prev) => ({
                  ...prev,
                  title: event.target.value,
                }))
              }
              placeholder="Smoky Lemon Pasta"
            />
            {errors.title && (
              <span className="text-xs text-rose-300">{errors.title}</span>
            )}
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
                setRecipeDraft((prev) => ({
                  ...prev,
                  servings: event.target.value,
                }))
              }
              placeholder="4"
            />
            {errors.servings && (
              <span className="text-xs text-rose-300">{errors.servings}</span>
            )}
          </label>

          <label className="form-label md:col-span-2">
            <span>Description</span>
            <textarea
              className="min-h-[120px] rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm text-sky-900 outline-none placeholder:text-slate-400 focus:border-sky-900 focus:ring-2 focus:ring-sky-900/20 dark:border-sky-800 dark:bg-sky-900 dark:text-sky-100 dark:placeholder:text-slate-500 dark:focus:border-white dark:focus:ring-white/40"
              value={recipeDraft.description}
              onChange={(event) =>
                setRecipeDraft((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
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
            {errors.preMinutes && (
              <span className="text-xs text-rose-300">{errors.preMinutes}</span>
            )}
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
            {errors.cookMinutes && (
              <span className="text-xs text-rose-300">{errors.cookMinutes}</span>
            )}
          </label>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <h1 className="text-2xl font-semibold text-sky-900 dark:text-sky-100 sm:text-3xl">
                {formatValue(recipeDraft.title, 'Untitled Recipe')}
              </h1>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                disabled={loading || saving}
                className="rounded-full border border-sky-300 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:border-sky-400 hover:text-sky-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-sky-700 dark:text-sky-200 dark:hover:border-sky-500 dark:hover:text-white"
              >
                Edit
              </button>
            </div>
            <p className="mt-2 text-base text-sky-600 dark:text-sky-300">
              {formatValue(recipeDraft.description, 'No description yet.')}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {[
              ['Serves', recipeDraft.servings],
              ['Prep Time', recipeDraft.preMinutes],
              ['Cook Time', recipeDraft.cookMinutes],
              ['Heat Level', recipeDraft.heatLevel],
            ]
              .filter(([, value]) => value !== null && value !== undefined && value !== '')
              .map(([label, value]) => (
                <span
                  key={label}
                  className="rounded-full border border-sky-200 bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-600 dark:border-sky-700 dark:bg-sky-900/70 dark:text-sky-200"
                >
                  {label}: {value}
                </span>
              ))}
          </div>
        </div>
      )}

      {isEditing && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading || hasErrors}
            className="rounded-full bg-sky-900 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-black/10 transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-sky-900 dark:shadow-black/20 dark:hover:bg-sky-100"
          >
            {saving ? 'Saving...' : 'Save Basics'}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={saving || loading}
            className="rounded-full border border-sky-300 px-5 py-2 text-sm font-semibold text-sky-700 transition hover:border-sky-400 hover:text-sky-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-sky-700 dark:text-sky-200 dark:hover:border-sky-500 dark:hover:text-white"
          >
            Cancel
          </button>
          {errors.form && (
            <span className="text-sm text-rose-300">{errors.form}</span>
          )}
          {status && !errors.form && (
            <span className="text-sm text-sky-500 dark:text-sky-400">
              {status}
            </span>
          )}
        </div>
      )}
    </section>
  )
}
