import { useCallback, useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { supabase } from '../lib/supabase'

export default function Households() {
  const [userId, setUserId] = useState('')
  const [memberships, setMemberships] = useState([])
  const [availableHouseholds, setAvailableHouseholds] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [joiningId, setJoiningId] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [newHouseholdName, setNewHouseholdName] = useState('')
  const [creating, setCreating] = useState(false)
  const [pendingHousehold, setPendingHousehold] = useState(null)
  const [joiningCreated, setJoiningCreated] = useState(false)
  const [leavingId, setLeavingId] = useState('')
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [leaveTarget, setLeaveTarget] = useState(null)

  const loadHouseholds = useCallback(async () => {
    setLoading(true)
    setError('')

    const { data: userData, error: userError } = await supabase.auth.getUser()

    if (userError) {
      setError(userError.message ?? 'Unable to load your account.')
      setLoading(false)
      return
    }

    const user = userData?.user

    if (!user) {
      setError('Please sign in to view your households.')
      setLoading(false)
      return
    }

    setUserId(user.id)

    const { data: memberRows, error: memberError } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)

    if (memberError) {
      setError(memberError.message ?? 'Unable to load household membership.')
      setLoading(false)
      return
    }

    const householdIds = (memberRows ?? [])
      .map((row) => row.household_id)
      .filter(Boolean)

    if (householdIds.length > 0) {
      const { data: households, error: householdsError } = await supabase
        .from('households')
        .select('id, name')
        .in('id', householdIds)
        .order('name')

      if (householdsError) {
        setError(householdsError.message ?? 'Unable to load households.')
        setLoading(false)
        return
      }

      setMemberships(households ?? [])
      setAvailableHouseholds([])
      setLoading(false)
      return
    }

    const { data: allHouseholds, error: allHouseholdsError } = await supabase
      .from('households')
      .select('id, name')
      .order('name')

    if (allHouseholdsError) {
      setError(allHouseholdsError.message ?? 'Unable to load households.')
      setLoading(false)
      return
    }

    setMemberships([])
    setAvailableHouseholds(allHouseholds ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadHouseholds()
  }, [loadHouseholds])

  const handleJoin = async (householdId) => {
    if (!userId || !householdId) return

    setJoiningId(householdId)
    setError('')

    const { error: joinError } = await supabase
      .from('household_members')
      .insert({ user_id: userId, household_id: householdId })

    if (joinError) {
      setError(joinError.message ?? 'Unable to join household.')
      setJoiningId('')
      return
    }

    setJoiningId('')
    loadHouseholds()
  }

  const handleLeave = async (householdId) => {
    if (!userId || !householdId) return

    setLeavingId(householdId)
    setError('')

    const { error: leaveError } = await supabase
      .from('household_members')
      .delete()
      .eq('user_id', userId)
      .eq('household_id', householdId)

    if (leaveError) {
      setError(leaveError.message ?? 'Unable to leave household.')
      setLeavingId('')
      return
    }

    setLeavingId('')
    loadHouseholds()
  }

  const handleRequestLeave = (household) => {
    setLeaveTarget(household)
    setShowLeaveModal(true)
  }

  const handleConfirmLeave = async () => {
    if (!leaveTarget?.id) return
    await handleLeave(leaveTarget.id)
    setShowLeaveModal(false)
    setLeaveTarget(null)
  }

  const handleCreateHousehold = async (event) => {
    event.preventDefault()
    if (!newHouseholdName.trim()) return

    setCreating(true)
    setError('')

    const { data, error: createError } = await supabase
      .from('households')
      .insert({ name: newHouseholdName.trim() })
      .select('id, name')
      .single()

    if (createError) {
      setError(createError.message ?? 'Unable to create household.')
      setCreating(false)
      return
    }

    setCreating(false)
    setShowCreateModal(false)
    setNewHouseholdName('')
    setPendingHousehold(data ?? null)
    setShowJoinModal(true)
    loadHouseholds()
  }

  const handleJoinCreated = async () => {
    if (!pendingHousehold?.id || !userId) return

    setJoiningCreated(true)
    setError('')

    const { error: joinError } = await supabase.from('household_members').insert({
      user_id: userId,
      household_id: pendingHousehold.id,
    })

    if (joinError) {
      setError(joinError.message ?? 'Unable to join household.')
      setJoiningCreated(false)
      return
    }

    setJoiningCreated(false)
    setShowJoinModal(false)
    setPendingHousehold(null)
    loadHouseholds()
  }

  return (
    <>
      <Helmet>
        <title>Household - Recipes</title>
      </Helmet>
      <div className="flex flex-col gap-6">
        {loading ? (
          <p className="text-sm text-sky-500 dark:text-sky-400">
            Loading households...
          </p>
        ) : error ? (
          <p className="text-sm text-rose-300">{error}</p>
        ) : memberships.length > 0 ? (
          <section className="rounded-2xl border border-sky-200 bg-white/80 p-6 shadow-lg shadow-black/5 backdrop-blur dark:border-sky-800 dark:bg-sky-950/70 dark:shadow-black/20">
            <div className="flex flex-col gap-4">
              {memberships.map((household) => (
                <div key={household.id} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="flex-1">
                      <div className="text-base font-semibold text-sky-900 dark:text-sky-100">
                        You are part of the “{household.name || 'Untitled household'}” household.
                      </div>
                      <p className="mt-2 text-sm text-sky-600 dark:text-sky-300">
                        Now you can meal plan together, share menus, and generate shopping lists.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRequestLeave(household)}
                      disabled={leavingId === household.id || showLeaveModal}
                      className="w-full rounded-full border border-sky-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-600 transition hover:border-sky-400 hover:text-sky-900 disabled:cursor-not-allowed disabled:opacity-70 md:w-auto md:self-start dark:border-sky-700 dark:text-sky-300 dark:hover:border-sky-500 dark:hover:text-white"
                    >
                      {leavingId === household.id ? 'Leaving' : 'Leave'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-dashed border-sky-200 bg-sky-50 p-6 text-center dark:border-sky-800 dark:bg-sky-900/50">
            <h2 className="text-xl font-semibold text-sky-900 dark:text-sky-100">
              You are not in a household yet
            </h2>
            <p className="mt-2 text-sm text-sky-600 dark:text-sky-300">
              Pick a household to join and start planning together.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-left">
              <span className="text-sm font-semibold text-sky-700 dark:text-sky-200">
                All households
              </span>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="rounded-full bg-sky-900 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-black/10 transition hover:bg-sky-800 dark:bg-white dark:text-sky-900 dark:shadow-black/20 dark:hover:bg-sky-100"
              >
                Create household
              </button>
            </div>
            {availableHouseholds.length === 0 ? (
              <p className="mt-4 text-sm text-sky-500 dark:text-sky-400">
                No households available right now.
              </p>
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {availableHouseholds.map((household) => (
                  <button
                    key={household.id}
                    type="button"
                    onClick={() => handleJoin(household.id)}
                    disabled={joiningId === household.id}
                    className="flex items-center justify-between rounded-xl border border-sky-200 bg-white px-4 py-3 text-left text-sm font-semibold text-sky-800 transition hover:border-sky-400 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-70 dark:border-sky-800 dark:bg-sky-950/70 dark:text-sky-100 dark:hover:border-sky-600 dark:hover:bg-sky-900"
                  >
                    <span>{household.name || 'Untitled household'}</span>
                    <span className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-500 dark:text-sky-400">
                      {joiningId === household.id ? 'Joining' : 'Join'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {showCreateModal ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-sky-950/60 px-6">
          <div className="w-full max-w-md rounded-2xl border border-sky-200 bg-white p-6 shadow-2xl dark:border-sky-800 dark:bg-sky-950">
            <h2 className="text-xl font-semibold text-sky-900 dark:text-sky-100">
              Create a household
            </h2>
            <p className="mt-2 text-sm text-sky-600 dark:text-sky-300">
              Give your household a name so others can find it.
            </p>
            <form onSubmit={handleCreateHousehold} className="mt-6 flex flex-col gap-4">
              <label className="flex flex-col gap-2 text-sm font-semibold text-sky-800 dark:text-sky-100">
                Name
                <input
                  className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm text-sky-900 outline-none placeholder:text-slate-400 focus:border-sky-900 focus:ring-2 focus:ring-sky-900/20 dark:border-sky-800 dark:bg-sky-900 dark:text-sky-100 dark:placeholder:text-slate-500 dark:focus:border-white dark:focus:ring-white/40"
                  value={newHouseholdName}
                  onChange={(event) => setNewHouseholdName(event.target.value)}
                  placeholder="Sunday Supper Club"
                  autoFocus
                />
              </label>
              <div className="flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setNewHouseholdName('')
                  }}
                  className="rounded-full border border-sky-200 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:border-sky-400 hover:text-sky-900 dark:border-sky-700 dark:text-sky-200 dark:hover:border-sky-500 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newHouseholdName.trim() || creating}
                  className="rounded-full bg-sky-900 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-black/10 transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-sky-900 dark:shadow-black/20 dark:hover:bg-sky-100"
                >
                  {creating ? 'Creating...' : 'Create household'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showJoinModal && pendingHousehold ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-sky-950/60 px-6">
          <div className="w-full max-w-md rounded-2xl border border-sky-200 bg-white p-6 shadow-2xl dark:border-sky-800 dark:bg-sky-950">
            <h2 className="text-xl font-semibold text-sky-900 dark:text-sky-100">
              Join your new household?
            </h2>
            <p className="mt-2 text-sm text-sky-600 dark:text-sky-300">
              You just created <span className="font-semibold">{pendingHousehold.name}</span>.
              Want to join it now?
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowJoinModal(false)
                  setPendingHousehold(null)
                }}
                className="rounded-full border border-sky-200 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:border-sky-400 hover:text-sky-900 dark:border-sky-700 dark:text-sky-200 dark:hover:border-sky-500 dark:hover:text-white"
              >
                Not now
              </button>
              <button
                type="button"
                onClick={handleJoinCreated}
                disabled={joiningCreated}
                className="rounded-full bg-sky-900 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-black/10 transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-sky-900 dark:shadow-black/20 dark:hover:bg-sky-100"
              >
                {joiningCreated ? 'Joining...' : 'Join household'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showLeaveModal && leaveTarget ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-sky-950/60 px-6">
          <div className="w-full max-w-md rounded-2xl border border-sky-200 bg-white p-6 shadow-2xl dark:border-sky-800 dark:bg-sky-950">
            <h2 className="text-xl font-semibold text-sky-900 dark:text-sky-100">
              Leave this household?
            </h2>
            <p className="mt-2 text-sm text-sky-600 dark:text-sky-300">
              You are about to leave “{leaveTarget.name || 'Untitled household'}”.
              You can rejoin later if needed.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowLeaveModal(false)
                  setLeaveTarget(null)
                }}
                className="rounded-full border border-sky-200 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:border-sky-400 hover:text-sky-900 dark:border-sky-700 dark:text-sky-200 dark:hover:border-sky-500 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLeave}
                disabled={leavingId === leaveTarget.id}
                className="rounded-full bg-rose-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-black/10 transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-rose-500 dark:hover:bg-rose-400"
              >
                {leavingId === leaveTarget.id ? 'Leaving...' : 'Leave household'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
