import { useEffect, useState } from 'react'
import { Link, Navigate, Route, Routes } from 'react-router-dom'
import CreateRecipe from './pages/CreateRecipe'
import Login from './pages/Login'
import { supabase } from './lib/supabase'

function App() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    let isMounted = true

    async function loadUser() {
      const { data } = await supabase.auth.getUser()
      if (isMounted) {
        setUser(data?.user ?? null)
      }
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    loadUser()

    return () => {
      isMounted = false
      authListener?.subscription?.unsubscribe()
    }
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800/70 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <Link className="text-lg font-semibold tracking-tight" to="/">
            Recipes
          </Link>
          <nav className="flex items-center gap-6 text-sm text-slate-300">
            <Link className="transition hover:text-white" to="/">
              Home
            </Link>
            <Link className="transition hover:text-white" to="/create">
              Create
            </Link>
            {user ? (
              <button
                type="button"
                onClick={() => supabase.auth.signOut()}
                className="text-sm font-semibold text-slate-200 transition hover:text-white"
              >
                Sign out
              </button>
            ) : (
              <Link className="transition hover:text-white" to="/login">
                Sign in
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-6 py-12">
        <Routes>
          <Route
            path="/"
            element={
              <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 text-center">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  Welcome
                </p>
                <h1 className="text-4xl font-semibold sm:text-5xl">
                  Your Recipe Hub
                </h1>
                <p className="text-base text-slate-300">
                  Add your first recipe or browse what you have saved.
                </p>
              </div>
            }
          />
          <Route
            path="/create"
            element={user ? <CreateRecipe /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/login"
            element={
              <Login />
            }
          />
        </Routes>
      </main>
    </div>
  )
}

export default App
