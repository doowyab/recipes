import { useEffect, useState } from 'react'
import { Link, Navigate, Route, Routes } from 'react-router-dom'
import CreateRecipe from './pages/CreateRecipe'
import Home from './pages/Home'
import Login from './pages/Login'
import { supabase } from './lib/supabase'
import RecipeEdit from './pages/RecipeEdit.jsx'
import RecipeView from './pages/RecipeView.jsx'

function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadUser() {
      const { data } = await supabase.auth.getUser()
      if (isMounted) {
        setUser(data?.user ?? null)
        setAuthLoading(false)
      }
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        setAuthLoading(false)
      }
    )

    loadUser()

    return () => {
      isMounted = false
      authListener?.subscription?.unsubscribe()
    }
  }, [])

  return (
    <div className="min-h-screen bg-sky-50 text-sky-900 dark:bg-sky-950 dark:text-sky-100">
      <header className="border-b border-sky-200/70 bg-white/80 backdrop-blur dark:border-sky-800/70 dark:bg-sky-950/80">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <Link className="text-lg font-semibold tracking-tight" to="/">
            Recipes
          </Link>
          <nav className="flex items-center gap-6 text-sm text-sky-600 dark:text-sky-300">
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
                className="text-sm font-semibold text-sky-700 transition hover:text-sky-900 dark:text-sky-200 dark:hover:text-white"
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
        {authLoading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-sm text-sky-500 dark:text-sky-400">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-sky-300 border-t-sky-900 dark:border-sky-700 dark:border-t-sky-200" />
              Checking session…
            </div>
          </div>
        ) : (
        <Routes>
          <Route
            path="/"
            element={<Home />}
          />
          <Route
            path="/create"
            element={user ? <CreateRecipe /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/recipe/:recipeId/edit"
            element={user ? <RecipeEdit /> : <Navigate to="/login" replace />}
          />
          <Route path="/recipe/:recipeId/view" element={<RecipeView />} />
          <Route
            path="/login"
            element={
              <Login />
            }
          />
        </Routes>
        )}
      </main>
    </div>
  )
}

export default App
