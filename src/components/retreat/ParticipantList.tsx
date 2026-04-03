import { useState } from 'react'
import { useRetreatMembers, useAddMember, useUpdateMember } from '../../lib/queries'
import { useAuth } from '../layout/AuthGuard'
import Button from '../ui/Button'
import Input from '../ui/Input'

type ParticipantListProps = {
  retreatId: string
}

export default function ParticipantList({ retreatId }: ParticipantListProps) {
  const { user } = useAuth()
  const { data: members = [], isLoading } = useRetreatMembers(retreatId)
  const addMember = useAddMember()
  const updateMember = useUpdateMember()

  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [editingAllergies, setEditingAllergies] = useState<string | null>(null)
  const [allergiesValue, setAllergiesValue] = useState('')

  const currentMember = members.find((m) => m.user_id === user.id)
  const isOrganiser = currentMember?.role === 'organiser'

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    addMember.mutate(
      { retreat_id: retreatId, display_name: newName.trim(), email: newEmail.trim() || undefined },
      { onSuccess: () => { setNewName(''); setNewEmail('') } }
    )
  }

  const handleSaveAllergies = (memberId: string) => {
    updateMember.mutate({
      id: memberId,
      retreat_id: retreatId,
      updates: { allergies: allergiesValue },
    })
    setEditingAllergies(null)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-green-700 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Member list */}
      <div className="space-y-3">
        {members.map((member) => {
          const isMe = member.user_id === user.id
          const canEditAllergies = isMe || isOrganiser

          return (
            <div
              key={member.id}
              className="flex items-start justify-between rounded-lg border border-stone-200 bg-white p-4"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-stone-800">{member.display_name}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      member.role === 'organiser'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {member.role}
                  </span>
                  {!member.user_id && member.email && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                      invited
                    </span>
                  )}
                  {!member.user_id && !member.email && (
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">
                      not linked
                    </span>
                  )}
                </div>
                {member.email && (
                  <p className="mt-0.5 text-sm text-stone-500">{member.email}</p>
                )}

                {/* Allergies */}
                {editingAllergies === member.id ? (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      className="rounded border border-stone-300 px-2 py-1 text-sm focus:border-green-500 focus:outline-none"
                      value={allergiesValue}
                      onChange={(e) => setAllergiesValue(e.target.value)}
                      placeholder="e.g. nuts, gluten"
                    />
                    <Button size="sm" onClick={() => handleSaveAllergies(member.id)}>
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setEditingAllergies(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="mt-1 flex items-center gap-2">
                    {member.allergies ? (
                      <span className="text-sm text-amber-700">
                        Allergies: {member.allergies}
                      </span>
                    ) : (
                      <span className="text-sm text-stone-400 italic">No allergies listed</span>
                    )}
                    {canEditAllergies && (
                      <button
                        onClick={() => {
                          setEditingAllergies(member.id)
                          setAllergiesValue(member.allergies)
                        }}
                        className="text-xs text-green-700 hover:text-green-800"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add member form (organiser only) */}
      {isOrganiser && (
        <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-4">
          <h3 className="mb-3 text-sm font-semibold text-stone-700">Add a participant</h3>
          <form onSubmit={handleAddMember} className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
            />
            <Input
              placeholder="Email (optional)"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
            <Button type="submit" size="sm" disabled={addMember.isPending}>
              Add
            </Button>
          </form>
          {addMember.isError && (
            <p className="mt-2 text-sm text-red-600">{addMember.error.message}</p>
          )}
          <p className="mt-2 text-xs text-stone-400">
            Adding an email lets their account auto-link when they join with the code. No invite email is sent — share the join code manually.
          </p>
        </div>
      )}
    </div>
  )
}
