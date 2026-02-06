import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '../lib/supabase'

export default function AuthPanel() {
  return (
    <div className="w-full max-w-md rounded-2xl border border-sky-200 bg-white/80 p-6 shadow-lg shadow-black/5 dark:border-sky-800 dark:bg-sky-950/70 dark:shadow-black/20">
      <Auth
        supabaseClient={supabase}
        appearance={{
          theme: ThemeSupa,
        }}
        providers={[]}
        view="sign_in"
        showLinks
        magicLink
      />
    </div>
  )
}
