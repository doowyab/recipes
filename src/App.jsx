import { useEffect, useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import About from './pages/About'
import Contact from './pages/Contact'
import CreateRecipe from './pages/CreateRecipe'
import Home from './pages/Home'
import Household from './pages/Household'
import Ingredients from './pages/Ingredients'
import Login from './pages/Login'
import Migrate from './pages/Migrate'
import Menu from './pages/Menu'
import Plan from './pages/Plan'
import Recipes from './pages/Recipes'
import ShoppingList from './pages/ShoppingList'
import { supabase } from './lib/supabase'
import RecipeEdit from './pages/RecipeEdit.jsx'
import RecipeView from './pages/RecipeView.jsx'

function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const location = useLocation()
  const publicPaths = new Set(['/', '/about', '/contact', '/login'])
  const isPublicPath = publicPaths.has(location.pathname)

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
    <div className="flex min-h-screen flex-col bg-sky-50 text-sky-900 dark:bg-sky-950 dark:text-sky-100">
      <header className="border-b border-sky-200/70 bg-white/80 backdrop-blur dark:border-sky-800/70 dark:bg-sky-950/80">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <Link className="text-lg font-semibold tracking-tight" to="/">
            🍳 Recipes
          </Link>
          <nav className="flex items-center gap-6 text-sm text-sky-600 dark:text-sky-300">
            <Link className="transition hover:text-sky-900 dark:hover:text-white" to="/create">
              Add
            </Link>
            <Link className="transition hover:text-sky-900 dark:hover:text-white" to="/plan">
              Plan
            </Link>
            <Link className="transition hover:text-sky-900 dark:hover:text-white" to="/shop">
              Shop
            </Link>
            <Link className="transition hover:text-sky-900 dark:hover:text-white" to="/menu">
              Cook
            </Link>
            {user ? (
              <button
                type="button"
                onClick={() => supabase.auth.signOut()}
                className="rounded-full border border-sky-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700 transition hover:border-sky-400 hover:text-sky-900 dark:border-sky-700 dark:text-sky-200 dark:hover:border-sky-500 dark:hover:text-white"
              >
                Log Out
              </button>
            ) : (
              <Link
                className="rounded-full bg-sky-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-lg shadow-black/10 transition hover:bg-sky-800 dark:bg-white dark:text-sky-900 dark:shadow-black/20 dark:hover:bg-sky-100"
                to="/login"
              >
                Log In
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 pt-6 pb-10">
        {authLoading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-sm text-sky-500 dark:text-sky-400">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-sky-300 border-t-sky-900 dark:border-sky-700 dark:border-t-sky-200" />
              Checking session…
            </div>
          </div>
        ) : !user && !isPublicPath ? (
          <Navigate to="/login" replace />
        ) : (
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/recipes" element={<Recipes />} />
            <Route path="/create" element={<CreateRecipe />} />
            <Route path="/ingredients" element={<Ingredients />} />
            <Route path="/plan" element={<Plan />} />
            <Route path="/migrate" element={<Migrate />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/shop" element={<ShoppingList />} />
            <Route path="/household" element={<Household />} />
            <Route path="/recipe/:recipeId/edit" element={<RecipeEdit />} />
            <Route path="/recipe/:recipeId/view" element={<RecipeView />} />
            <Route path="/login" element={<Login />} />
          </Routes>
        )}
      </main>

      <footer className="mt-auto border-t border-sky-200/70 bg-white/80 backdrop-blur dark:border-sky-800/70 dark:bg-sky-950/80">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-6 py-6 text-sm text-sky-600 dark:text-sky-300 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-sky-900 dark:text-sky-100">
              Made with ❤️ by doowyab.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold uppercase tracking-[0.2em]">
            <Link className="transition hover:text-sky-900 dark:hover:text-white" to="/recipes">
              Recipes
            </Link>
            <Link className="transition hover:text-sky-900 dark:hover:text-white" to="/ingredients">
              Ingredients
            </Link>
            <Link className="transition hover:text-sky-900 dark:hover:text-white" to="/about">
              About
            </Link>
            <Link className="transition hover:text-sky-900 dark:hover:text-white" to="/contact">
              Contact
            </Link>
            <Link className="transition hover:text-sky-900 dark:hover:text-white" to="/household">
              Household
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
