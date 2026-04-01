import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'
import LoginForm from '../components/auth/LoginForm'
import CreateRetreatForm from '../components/auth/CreateRetreatForm'
import JoinRetreatForm from '../components/auth/JoinRetreatForm'
import AppShell from '../components/layout/AppShell'

export default function LandingPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-700 border-t-transparent" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-stone-50 px-4">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-green-800">Retreat Eats</h1>
          <p className="mt-2 text-lg text-stone-500">Plan meals for your retreat</p>
        </div>
        <div className="w-full max-w-sm">
          <LoginForm />
        </div>
      </div>
    )
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl py-12">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-green-800">Welcome back</h1>
          <p className="mt-1 text-stone-500">Create a new retreat or join an existing one</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <CreateRetreatForm />
          <JoinRetreatForm />
        </div>
      </div>
    </AppShell>
  )
}
