import { useState } from 'react'
import { useMealAssignments } from '../../lib/queries'
import type { Meal, RetreatMember } from '../../types'
import MealDetail from './MealDetail'
import Avatar from '../ui/Avatar'

type MealCardProps = {
  meal: Meal
  retreatId: string
  members: RetreatMember[]
  attendanceCount: number
  prefillNames?: string[]
  isOrganiser?: boolean
  onDelete?: () => void
}

export default function MealCard({ meal, retreatId, members, attendanceCount, prefillNames = [], isOrganiser, onDelete }: MealCardProps) {
  const [expanded, setExpanded] = useState(false)
  const { data: assignments = [] } = useMealAssignments(meal.id)

  const formatTime = (time: string) => {
    const [h, m] = time.split(':')
    const hour = parseInt(h, 10)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${m} ${ampm}`
  }

  const lead = assignments.find((a) => a.duty === 'lead')
  const helpers = assignments.filter((a) => a.duty === 'helper')
  const leadMember = lead ? members.find((m) => m.id === lead.member_id) : null
  const helperMembers = helpers
    .map((a) => members.find((m) => m.id === a.member_id))
    .filter(Boolean)

  return (
    <>
      <div
        onClick={() => setExpanded(true)}
        className="cursor-pointer rounded-lg border border-stone-200 bg-white p-4 shadow-sm
          transition-shadow hover:shadow-md"
      >
        <div className="mb-2 flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-stone-800">{meal.label}</h3>
            <p className="text-sm text-stone-500">{formatTime(meal.time)}</p>
          </div>
          <div className="flex items-center gap-1">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                meal.style === 'assigned_recipe'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-stone-100 text-stone-600'
              }`}
            >
              {meal.style === 'assigned_recipe' ? 'Recipe' : 'Generic'}
            </span>
            {isOrganiser && onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirm(`Delete ${meal.label}?`)) onDelete()
                }}
                className="ml-1 flex h-8 w-8 items-center justify-center rounded-lg text-lg text-stone-400 hover:bg-red-50 hover:text-red-500"
                aria-label={`Delete ${meal.label}`}
              >
                &times;
              </button>
            )}
          </div>
        </div>

        {meal.style === 'assigned_recipe' && meal.recipe_title && (
          <p className="mb-2 text-sm italic text-amber-700">{meal.recipe_title}</p>
        )}

        {/* Pre-fill summary for generic meals */}
        {meal.style === 'generic' && prefillNames.length > 0 && (
          <p className="mb-2 text-xs text-stone-400">
            {prefillNames.slice(0, 4).join(', ')}
            {prefillNames.length > 4 && ` +${prefillNames.length - 4} more`}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
          <span>{attendanceCount} attending</span>
          {leadMember && (
            <span className="flex items-center gap-1.5">
              <span className="text-stone-400">Lead:</span>
              <Avatar name={leadMember.display_name} size="xs" />
              <span>{leadMember.display_name}</span>
            </span>
          )}
          {helperMembers.length > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="text-stone-400">Helpers:</span>
              <span className="flex -space-x-1">
                {helperMembers.map((m) => (
                  <Avatar key={m!.id} name={m!.display_name} size="xs" />
                ))}
              </span>
            </span>
          )}
        </div>
      </div>

      {expanded && (
        <MealDetail
          meal={meal}
          retreatId={retreatId}
          members={members}
          onClose={() => setExpanded(false)}
        />
      )}
    </>
  )
}
