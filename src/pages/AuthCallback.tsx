import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        navigate('/')
      }
    })

    const timeout = setTimeout(() => setTimedOut(true), 15000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [navigate])

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50">
      <div className="text-center">
        {timedOut ? (
          <>
            <p className="mb-2 text-stone-700 font-medium">Sign-in link may have expired</p>
            <p className="mb-4 text-sm text-stone-500">Try requesting a new magic link.</p>
            <a
              href="/"
              className="inline-block rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
            >
              Back to sign in
            </a>
          </>
        ) : (
          <>
            <div className="mb-4 h-8 w-8 mx-auto animate-spin rounded-full border-4 border-green-700 border-t-transparent" />
            <p className="text-stone-500">Signing you in...</p>
          </>
        )}
      </div>
    </div>
  )
}
