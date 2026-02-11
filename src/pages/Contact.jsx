import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { supabase } from '../lib/supabase'

export default function Contact() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadUser() {
      const { data } = await supabase.auth.getUser()
      if (isMounted) {
        setIsLoggedIn(Boolean(data?.user))
      }
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setIsLoggedIn(Boolean(session?.user))
      }
    )

    loadUser()

    return () => {
      isMounted = false
      authListener?.subscription?.unsubscribe()
    }
  }, [])

  return (
    <>
      <Helmet>
        <title>Contact - Recipes</title>
      </Helmet>
      <div>
        <h1 className="text-2xl font-semibold text-sky-900 dark:text-sky-100">Contact</h1>
        {isLoggedIn ? (
          <p className="mt-4 text-sm text-sky-600 dark:text-sky-300 md:text-base">
            If you have any questions or find any issues let me know at{' '}
            <a
              href="mailto:josh.baywood@outlook.com"
              className="font-semibold text-sky-700 underline decoration-sky-300 underline-offset-2 transition hover:text-sky-900 dark:text-sky-200 dark:decoration-sky-600 dark:hover:text-white"
            >
              josh.baywood@outlook.com
            </a>
            .
          </p>
        ) : (
          <p className="mt-4 text-sm text-sky-600 dark:text-sky-300 md:text-base">
            This website is developed for friends and family. We aren&apos;t taking any external
            invitations at this time.
          </p>
        )}
      </div>
    </>
  )
}
