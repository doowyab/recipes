import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { client, resetPasswordWithCode, sendPasswordResetCode } from '../lib/neon'

const MIN_PASSWORD_LENGTH = 8

const inputClass =
  'w-full rounded-xl border border-sky-200 bg-white px-4 py-3 text-sky-900 placeholder:text-sky-400 focus:border-sky-900 focus:outline-none focus:ring-2 focus:ring-sky-900/20 disabled:opacity-60 dark:border-sky-800 dark:bg-sky-900 dark:text-sky-100 dark:placeholder:text-sky-500 dark:focus:border-white dark:focus:ring-white/40'
const linkButtonClass = 'text-xs text-sky-600 underline dark:text-sky-300'

// Modes: "signin" (email + password), "reset-request" (email a code), "reset" (code + new password).
export default function Login() {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    let isMounted = true

    async function redirectIfAuthed() {
      const { data } = await client.auth.getUser()
      if (isMounted && data?.user) {
        navigate('/', { replace: true })
      }
    }

    const { data: authListener } = client.auth.onAuthStateChange(
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

  const switchMode = (nextMode) => {
    setMode(nextMode)
    setPassword('')
    setConfirmPassword('')
    setCode('')
    setMessage(null)
    setError(null)
  }

  const signIn = (signInPassword) =>
    client.auth.signInWithPassword({ email: email.trim(), password: signInPassword })

  const handleSignIn = async (event) => {
    event.preventDefault()
    setLoading(true)
    setMessage(null)
    setError(null)

    const { error: signInError } = await signIn(password)
    if (signInError) {
      setError(
        'Incorrect email or password. If you haven’t set a password yet, use “Set or reset password” below.'
      )
      setLoading(false)
      return
    }
    navigate('/', { replace: true })
  }

  const handleSendResetCode = async (event) => {
    event.preventDefault()
    setLoading(true)
    setMessage(null)
    setError(null)

    const { error: sendError } = await sendPasswordResetCode(email.trim())
    if (sendError) {
      setError(sendError.message || 'Couldn’t send a code. Please try again.')
    } else {
      setMode('reset')
      setMessage(
        `If ${email.trim()} has access, we’ve emailed it a code. Enter it below with your new password.`
      )
    }
    setLoading(false)
  }

  const handleResetPassword = async (event) => {
    event.preventDefault()
    setError(null)

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Your password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }
    if (password !== confirmPassword) {
      setError('The passwords don’t match.')
      return
    }

    setLoading(true)
    const { error: resetError } = await resetPasswordWithCode(
      email.trim(),
      code.trim(),
      password
    )
    if (resetError) {
      setError('That code didn’t work. Check it and try again, or request a new one.')
      setLoading(false)
      return
    }

    const { error: signInError } = await signIn(password)
    if (signInError) {
      switchMode('signin')
      setMessage('Your password is set. Please sign in.')
      setLoading(false)
      return
    }
    navigate('/', { replace: true })
  }

  const submitLabel = {
    signin: loading ? 'Signing in...' : 'Sign In',
    'reset-request': loading ? 'Sending...' : 'Email Me a Code',
    reset: loading ? 'Saving...' : 'Set Password & Sign In',
  }[mode]

  const onSubmit = {
    signin: handleSignIn,
    'reset-request': handleSendResetCode,
    reset: handleResetPassword,
  }[mode]

  return (
    <>
      <Helmet>
        <title>Sign In · Recipes</title>
      </Helmet>
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-sky-500 dark:text-sky-400">
          Account
        </p>
        <h1 className="text-2xl font-semibold">
          Friends & Family Access
        </h1>
        <p className="text-sm text-sky-600 dark:text-sky-300">
          This app is shared with friends and family only. Want access to build
          your own lists?{' '}
          <Link className="text-sky-900 underline dark:text-white" to="/contact">
            Reach out
          </Link>{' '}
          and we&apos;ll help.
        </p>
      </div>

      <div className="w-full max-w-md rounded-2xl border border-sky-200 bg-white/80 p-6 text-left shadow-lg shadow-black/5 dark:border-sky-800 dark:bg-sky-950/70 dark:shadow-black/20">
        {message ? (
          <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center text-emerald-900 dark:border-emerald-900/70 dark:bg-emerald-950/50 dark:text-emerald-100">
            <p className="font-medium">{message}</p>
          </div>
        ) : null}

        {error ? (
          <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-center text-rose-900 dark:border-rose-900/70 dark:bg-rose-950/50 dark:text-rose-100">
            <p className="font-medium">{error}</p>
          </div>
        ) : null}

        <form className="space-y-5" onSubmit={onSubmit}>
          {mode === 'reset-request' ? (
            <p className="text-center text-sm text-sky-600 dark:text-sky-300">
              Enter your email and we&apos;ll send you a code to set a new password.
            </p>
          ) : null}

          <div>
            <label className="form-label" htmlFor="email">
              <span>Email address</span>
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={mode === 'reset'}
              className={inputClass}
            />
          </div>

          {mode === 'signin' ? (
            <div>
              <label className="form-label" htmlFor="password">
                <span>Password</span>
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className={inputClass}
              />
            </div>
          ) : null}

          {mode === 'reset' ? (
            <>
              <div>
                <label className="form-label" htmlFor="code">
                  <span>Code</span>
                </label>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  required
                  autoFocus
                  className={`${inputClass} tracking-[0.3em]`}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="new-password">
                  <span>New password</span>
                </label>
                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="confirm-password">
                  <span>Confirm new password</span>
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  className={inputClass}
                />
              </div>
            </>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-900 px-6 py-3 font-semibold text-white shadow-lg shadow-black/10 transition hover:-transky-y-0.5 hover:bg-sky-800 disabled:transky-y-0 disabled:cursor-not-allowed disabled:bg-sky-300 dark:bg-white dark:text-sky-900 dark:shadow-black/20 dark:hover:bg-sky-100"
          >
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-200/40 border-t-sky-200 dark:border-sky-900/40 dark:border-t-sky-900" />
            ) : null}
            {submitLabel}
          </button>

          <div className="text-center">
            {mode === 'signin' ? (
              <button type="button" onClick={() => switchMode('reset-request')} className={linkButtonClass}>
                Set or reset password
              </button>
            ) : mode === 'reset-request' ? (
              <button type="button" onClick={() => switchMode('signin')} className={linkButtonClass}>
                Back to sign in
              </button>
            ) : (
              <button type="button" onClick={() => switchMode('reset-request')} className={linkButtonClass}>
                Resend the code
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
    </>
  )
}
