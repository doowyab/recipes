import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'

const STORAGE_KEY = 'mortgage-calculator-scenarios'

const DEFAULTS = {
  salePrice: 420000,
  saleMortgageRemaining: 231000,
  purchasePrice: 660000,
  interestRate: 4.4,
  termYears: 23,
}

const currencyFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0,
})

function calculateMonthlyPayment({ salePrice, saleMortgageRemaining, purchasePrice, interestRate, termYears }) {
  const equity = salePrice - saleMortgageRemaining
  const loanAmount = purchasePrice - equity
  const n = termYears * 12
  if (n <= 0) return 0
  const r = interestRate / 100 / 12
  if (r === 0) return loanAmount / n
  return (loanAmount * r) / (1 - Math.pow(1 + r, -n))
}

const FIELDS = [
  { key: 'salePrice', label: 'Sale price' },
  { key: 'saleMortgageRemaining', label: 'Sale mortgage remaining' },
  { key: 'purchasePrice', label: 'Purchase price' },
  { key: 'interestRate', label: 'Interest rate (%)' },
  { key: 'termYears', label: 'Term (years)' },
]

function ScenarioModal({ initial, onSave, onClose }) {
  const [values, setValues] = useState(() => ({ ...DEFAULTS, ...initial }))

  const handleChange = (key, raw) => {
    setValues((prev) => ({ ...prev, [key]: raw }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const parsed = Object.fromEntries(
      FIELDS.map(({ key }) => {
        const numeric = Number(values[key])
        return [key, Number.isFinite(numeric) ? numeric : DEFAULTS[key]]
      })
    )
    onSave(parsed)
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-sky-950/60 px-6">
      <div className="w-full max-w-md rounded-2xl border border-sky-200 bg-white p-6 shadow-2xl dark:border-sky-800 dark:bg-sky-950">
        <h2 className="text-xl font-semibold text-sky-900 dark:text-sky-100">
          {initial ? 'Edit scenario' : 'Add scenario'}
        </h2>
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          {FIELDS.map(({ key, label }) => (
            <label
              key={key}
              className="flex flex-col gap-2 text-sm font-semibold text-sky-800 dark:text-sky-100"
            >
              {label}
              <input
                type="number"
                step="any"
                className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm text-sky-900 outline-none placeholder:text-slate-400 focus:border-sky-900 focus:ring-2 focus:ring-sky-900/20 dark:border-sky-800 dark:bg-sky-900 dark:text-sky-100 dark:placeholder:text-slate-500 dark:focus:border-white dark:focus:ring-white/40"
                value={values[key]}
                onChange={(event) => handleChange(key, event.target.value)}
              />
            </label>
          ))}
          <div className="mt-2 flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-sky-200 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:border-sky-400 hover:text-sky-900 dark:border-sky-700 dark:text-sky-200 dark:hover:border-sky-500 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-full bg-sky-900 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-black/10 transition hover:bg-sky-800 dark:bg-white dark:text-sky-900 dark:shadow-black/20 dark:hover:bg-sky-100"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Mortgage() {
  const [scenarios, setScenarios] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const parsed = raw ? JSON.parse(raw) : []
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios))
    } catch {
      // ignore quota/private-mode failures
    }
  }, [scenarios])

  const openAddModal = () => {
    setEditingId(null)
    setShowModal(true)
  }

  const openEditModal = (id) => {
    setEditingId(id)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
  }

  const handleSave = (values) => {
    if (editingId) {
      setScenarios((prev) => prev.map((s) => (s.id === editingId ? { ...s, ...values } : s)))
    } else {
      setScenarios((prev) => [...prev, { id: crypto.randomUUID(), ...values }])
    }
    closeModal()
  }

  const handleDelete = (id) => {
    setScenarios((prev) => prev.filter((s) => s.id !== id))
  }

  const editingScenario = editingId ? scenarios.find((s) => s.id === editingId) : null

  return (
    <div className="flex min-h-screen flex-col bg-sky-50 text-sky-900 dark:bg-sky-950 dark:text-sky-100">
      <Helmet>
        <title>Mortgage - Calculator</title>
      </Helmet>

      <header className="border-b border-sky-200/70 bg-white/80 backdrop-blur dark:border-sky-800/70 dark:bg-sky-950/80">
        <div className="mx-auto flex w-full max-w-5xl items-center px-6 py-4">
          <span className="text-lg font-semibold tracking-tight">🏠 Mortgage</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 pt-6 pb-10">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-sky-900 dark:text-sky-100">Scenarios</h1>
            <button
              type="button"
              onClick={openAddModal}
              className="rounded-full bg-sky-900 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-black/10 transition hover:bg-sky-800 dark:bg-white dark:text-sky-900 dark:shadow-black/20 dark:hover:bg-sky-100"
            >
              Add scenario
            </button>
          </div>

          {scenarios.length === 0 ? (
            <section className="rounded-2xl border border-dashed border-sky-200 bg-sky-50 p-10 text-center dark:border-sky-800 dark:bg-sky-900/50">
              <p className="text-sm text-sky-600 dark:text-sky-300">
                No scenarios yet. Add one to see the calculated monthly payment.
              </p>
            </section>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {scenarios.map((scenario, index) => {
                const letter = String.fromCharCode(65 + index)
                const monthly = calculateMonthlyPayment(scenario)

                return (
                  <div
                    key={scenario.id}
                    className="rounded-2xl border border-sky-200 bg-white/80 p-6 shadow-lg shadow-black/5 backdrop-blur dark:border-sky-800 dark:bg-sky-950/70 dark:shadow-black/20"
                  >
                    <span className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-500 dark:text-sky-400">
                      Scenario {letter}
                    </span>
                    <p className="mt-2 text-2xl font-semibold text-sky-900 dark:text-sky-100">
                      {currencyFormatter.format(monthly)}
                      <span className="text-sm font-normal">/mo</span>
                    </p>
                    <dl className="mt-4 space-y-1 text-sm text-sky-600 dark:text-sky-300">
                      <div className="flex justify-between">
                        <dt>Sale price</dt>
                        <dd>{currencyFormatter.format(scenario.salePrice)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Sale mortgage remaining</dt>
                        <dd>{currencyFormatter.format(scenario.saleMortgageRemaining)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Purchase price</dt>
                        <dd>{currencyFormatter.format(scenario.purchasePrice)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Rate</dt>
                        <dd>{scenario.interestRate}%</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Term</dt>
                        <dd>{scenario.termYears} yrs</dd>
                      </div>
                    </dl>
                    <div className="mt-4 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => openEditModal(scenario.id)}
                        className="rounded-full border border-sky-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700 transition hover:border-sky-400 hover:text-sky-900 dark:border-sky-700 dark:text-sky-200 dark:hover:border-sky-500 dark:hover:text-white"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(scenario.id)}
                        className="rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-rose-500 dark:bg-rose-500 dark:hover:bg-rose-400"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {showModal ? (
        <ScenarioModal
          key={editingId ?? 'new'}
          initial={editingScenario}
          onSave={handleSave}
          onClose={closeModal}
        />
      ) : null}
    </div>
  )
}
