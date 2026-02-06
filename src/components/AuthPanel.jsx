import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '../lib/supabase'

export default function AuthPanel() {
  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950/70 p-6 shadow-lg shadow-black/20">
      <Auth
        supabaseClient={supabase}
        appearance={{
          theme: ThemeSupa,
          variables: {
            default: {
              colors: {
                brand: '#ffffff',
                brandAccent: '#e2e8f0',
                inputBackground: '#0f172a',
                inputBorder: '#1e293b',
                inputText: '#e2e8f0',
                messageText: '#94a3b8',
                anchorTextColor: '#e2e8f0',
              },
            },
          },
          className: {
            container: 'text-slate-100',
            button: 'bg-white text-slate-900',
            input: 'text-slate-100',
            anchor: 'text-slate-200',
          },
        }}
        providers={[]}
        view="sign_in"
        showLinks
        magicLink
      />
    </div>
  )
}
