import { createClient } from '@neon/neon-js/supabase'

const authUrl = import.meta.env.VITE_NEON_AUTH_URL
const dataApiUrl = import.meta.env.VITE_NEON_DATA_API_URL

if (!authUrl || !dataApiUrl) {
  console.warn('Missing Neon env vars: VITE_NEON_AUTH_URL / VITE_NEON_DATA_API_URL')
}

// Supabase-compatible client: same .auth.* and .from() call shapes as supabase-js
export const client = createClient({
  auth: { url: authUrl ?? '' },
  dataApi: { url: dataApiUrl ?? '' },
})

// The Neon adapter's onAuthStateChange only fires for sign-ins/outs in *other*
// tabs (plus the initial session on subscribe). supabase-js also notified the
// current tab, and the UI relies on that, so emit same-tab events here.
const auth = client.auth
const sameTabListeners = new Set()

function notifySameTab(event, session) {
  for (const callback of sameTabListeners) {
    try {
      callback(event, session)
    } catch (error) {
      console.error('Auth state listener failed', error)
    }
  }
}

const originalOnAuthStateChange = auth.onAuthStateChange
auth.onAuthStateChange = (callback) => {
  sameTabListeners.add(callback)
  const { data } = originalOnAuthStateChange(callback)
  const unsubscribe = () => {
    sameTabListeners.delete(callback)
    data.subscription.unsubscribe()
  }
  return { data: { subscription: { ...data.subscription, unsubscribe } } }
}

const originalSignInWithPassword = auth.signInWithPassword
auth.signInWithPassword = async (credentials) => {
  const result = await originalSignInWithPassword(credentials)
  if (!result.error && result.data?.session) {
    notifySameTab('SIGNED_IN', result.data.session)
  }
  return result
}

// Password set/reset by emailed code. The Supabase-style resetPasswordForEmail
// sends a link, which needs custom SMTP; codes work with Neon's shared email.
// Neither call creates accounts.
const betterAuth = auth.getBetterAuthInstance()

async function callBetterAuth(fn) {
  try {
    const result = await fn()
    return { error: result?.error ?? null }
  } catch (error) {
    return { error }
  }
}

export const sendPasswordResetCode = (email) =>
  callBetterAuth(() =>
    betterAuth.emailOtp.sendVerificationOtp({ email, type: 'forget-password' })
  )

export const resetPasswordWithCode = (email, code, password) =>
  callBetterAuth(() =>
    betterAuth.emailOtp.resetPassword({ email, otp: code, password })
  )

const originalSignOut = auth.signOut
auth.signOut = async (...args) => {
  const result = await originalSignOut(...args)
  if (!result?.error) {
    notifySameTab('SIGNED_OUT', null)
  }
  return result
}
