import { useRetreatDays, useMeals, useRetreatMembers, useAttendance } from '../../lib/queries'
import { useAuth } from '../layout/AuthGuard'
import type { Meal } from '../../types'
import MealCard from './MealCard'

type DayGridProps = {
  retreatId: string
}

export default function DayGrid({ retreatId }: DayGridProps) {
  const { user } = useAuth()
  const { data: days = [], isLoading: daysLoading } = useRetreatDays(retreatId)
  const { data: meals = [], isLoading: mealsLoading } = useMeals(retreatId)
  const { data: members = [] } = useRetreatMembers(retreatId)
  const { data: attendance = [] } = useAttendance(retreatId)

  const currentMember = members.find((m) => m.user_id === user.id)
  const isOrganiser = currentMember?.role === 'organiser'

  if (daysLoading || mealsLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-green-700 border-t-transparent" />
      </div>
    )
  }

  const mealsByDay = days.map((day) => ({
    day,
    meals: meals
      .filter((m: Meal) => m.retreat_day_id === day.id)
      .sort((a: Meal, b: Meal) => a.time.localeCompare(b.time)),
  }))

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      {mealsByDay.map(({ day, meals: dayMeals }) => (
        <div key={day.id}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-stone-800">
              {formatDate(day.date)}
            </h2>
            {isOrganiser && (
              <button className="text-sm font-medium text-green-700 hover:text-green-800">
                + Add meal
              </button>
            )}
          </div>
          {dayMeals.length === 0 ? (
            <p className="text-sm text-stone-400 italic">No meals planned yet</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {dayMeals.map((meal: Meal) => {
                const mealAttendance = attendance.filter((a) => a.meal_id === meal.id)
                return (
                  <MealCard
                    key={meal.id}
                    meal={meal}
                    retreatId={retreatId}
                    members={members}
                    attendanceCount={mealAttendance.length}
                  />
                )
              })}
            </div>
          )}
        </div>
      ))}

      {days.length === 0 && (
        <p className="py-12 text-center text-stone-400">
          No days have been set up for this retreat yet.
        </p>
      )}
    </div>
  )
}
