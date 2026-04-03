import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'
import { useMyRetreats } from '../lib/queries'
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

        <MyRetreats />

        <div className="grid gap-6 sm:grid-cols-2">
          <CreateRetreatForm />
          <JoinRetreatForm />
        </div>
      </div>
    </AppShell>
  )
}

function MyRetreats() {
  const { data: retreats = [], isLoading } = useMyRetreats()

  if (isLoading) {
    return (
      <div className="mb-8 flex justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-green-700 border-t-transparent" />
      </div>
    )
  }

  if (retreats.length === 0) return null

  const fmt = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

  return (
    <div className="mb-8">
      <h2 className="mb-3 text-lg font-semibold text-stone-700">Your retreats</h2>
      <div className="space-y-2">
        {retreats.map((r) => (
          <Link
            key={r.id}
            to={`/retreat/${r.id}`}
            className="flex items-center justify-between rounded-lg border border-stone-200 bg-white px-4 py-3 shadow-sm transition hover:border-green-300 hover:shadow-md"
          >
            <div>
              <p className="font-medium text-stone-800">{r.name}</p>
              <p className="text-sm text-stone-400">{fmt(r.start_date)} – {fmt(r.end_date)}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                r.role === 'organiser' ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'
              }`}>
                {r.role}
              </span>
              <span className="text-stone-300">→</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
