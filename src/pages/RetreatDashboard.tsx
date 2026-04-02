import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useRetreat, useRetreatMembers } from '../lib/queries'
import { useAuth } from '../components/layout/AuthGuard'
import AppShell from '../components/layout/AppShell'
import DayGrid from '../components/retreat/DayGrid'
import AttendanceMatrix from '../components/retreat/AttendanceMatrix'
import ParticipantList from '../components/retreat/ParticipantList'
import ShoppingList from '../components/shopping/ShoppingList'
import SnackRequests from '../components/snacks/SnackRequests'

type Tab = 'schedule' | 'people' | 'shopping' | 'snacks'

export default function RetreatDashboard() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { data: retreat, isLoading } = useRetreat(id!)
  const { data: members = [] } = useRetreatMembers(id!)
  const [activeTab, setActiveTab] = useState<Tab>('schedule')

  const currentMember = members.find((m) => m.user_id === user.id)

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-700 border-t-transparent" />
        </div>
      </AppShell>
    )
  }

  if (!retreat) {
    return (
      <AppShell>
        <div className="py-12 text-center text-stone-500">Retreat not found.</div>
      </AppShell>
    )
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'schedule', label: 'Schedule' },
    { key: 'people', label: 'People' },
    { key: 'shopping', label: 'Shopping List' },
    { key: 'snacks', label: 'Snacks' },
  ]

  return (
    <AppShell>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-stone-800">{retreat.name}</h1>
            <p className="text-sm text-stone-500">
              {new Date(retreat.start_date + 'T00:00:00').toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
              })}
              {' — '}
              {new Date(retreat.end_date + 'T00:00:00').toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-stone-400">Join code</p>
            <code className="rounded bg-stone-100 px-3 py-1 text-lg font-bold text-stone-800">
              {retreat.join_code}
            </code>
          </div>
        </div>

        {currentMember && (
          <p className="mt-1 text-xs text-stone-400">
            Signed in as {currentMember.display_name} ({currentMember.role})
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-stone-200">
        <nav className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-b-2 border-green-700 text-green-800'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'schedule' && <DayGrid retreatId={id!} />}
      {activeTab === 'people' && (
        <div className="space-y-8">
          <div>
            <h2 className="mb-4 text-lg font-semibold text-stone-800">Members</h2>
            <ParticipantList retreatId={id!} />
          </div>
          <div>
            <h2 className="mb-4 text-lg font-semibold text-stone-800">Attendance</h2>
            <AttendanceMatrix retreatId={id!} />
          </div>
        </div>
      )}
      {activeTab === 'shopping' && <ShoppingList retreatId={id!} />}
      {activeTab === 'snacks' && <SnackRequests retreatId={id!} />}
    </AppShell>
  )
}
