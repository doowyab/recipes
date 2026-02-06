import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    let isMounted = true

    async function redirectIfAuthed() {
      const { data } = await supabase.auth.getUser()
      if (isMounted && data?.user) {
        navigate('/', { replace: true })
      }
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          navigate('/', { replace: true })
        }
      }
    )

    redirectIfAuthed()

    return () => {
      isMounted = false
      authListener?.subscription?.unsubscribe()
    }
  }, [navigate])

  const handleLogin = async (event) => {
    event.preventDefault()
    setLoading(true)
    setMessage(null)
    setError(null)

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    })

    if (signInError) {
      setError(signInError.message)
    } else {
      setMessage('Check your email for your magic link!')
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
          Account
        </p>
        <h1 className="text-3xl font-semibold sm:text-4xl">
          Friends & Family Access
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          This app is shared with friends and family only. Want access to build
          your own lists?{' '}
          <Link className="text-slate-900 underline dark:text-white" to="/contact">
            Reach out
          </Link>{' '}
          and we&apos;ll help.
        </p>
      </div>

      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white/80 p-6 text-left shadow-lg shadow-black/5 dark:border-slate-800 dark:bg-slate-950/70 dark:shadow-black/20">
        {message ? (
          <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center text-emerald-900 dark:border-emerald-900/70 dark:bg-emerald-950/50 dark:text-emerald-100">
            <p className="font-medium">{message}</p>
            <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-200/80">
              This link expires in 1 hour.
            </p>
          </div>
        ) : null}

        {error ? (
          <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-center text-rose-900 dark:border-rose-900/70 dark:bg-rose-950/50 dark:text-rose-100">
            <p className="font-medium">{error}</p>
          </div>
        ) : null}

        <form className="space-y-5" onSubmit={handleLogin}>
          <div>
            <label className="form-label" htmlFor="email">
              <span>Email address</span>
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-white dark:focus:ring-white/40"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-300 dark:bg-white dark:text-slate-900 dark:shadow-black/20 dark:hover:bg-slate-100"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200/40 border-t-slate-200 dark:border-slate-900/40 dark:border-t-slate-900" />
                Sending...
              </>
            ) : (
              'Send Magic Link'
            )}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-slate-500 dark:text-slate-400">
          No password required. We&apos;ll email you a secure sign-in link.
        </p>
      </div>
    </div>
  )
}
