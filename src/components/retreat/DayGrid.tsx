import { useState } from 'react'
import { useRetreatDays, useMeals, useRetreatMembers, useAttendance, useAddMeal, useDeleteMeal } from '../../lib/queries'
import { useAuth } from '../layout/AuthGuard'
import { getPrefillsForMealType } from '../../lib/prefills'
import type { Meal } from '../../types'
import MealCard from './MealCard'
import Button from '../ui/Button'
import Input from '../ui/Input'

type DayGridProps = {
  retreatId: string
}

export default function DayGrid({ retreatId }: DayGridProps) {
  const { user } = useAuth()
  const { data: days = [], isLoading: daysLoading } = useRetreatDays(retreatId)
  const { data: meals = [], isLoading: mealsLoading } = useMeals(retreatId)
  const { data: members = [] } = useRetreatMembers(retreatId)
  const { data: attendance = [] } = useAttendance(retreatId)
  const addMeal = useAddMeal()
  const deleteMeal = useDeleteMeal()

  const [addingMealForDay, setAddingMealForDay] = useState<string | null>(null)
  const [newMealLabel, setNewMealLabel] = useState('')
  const [newMealTime, setNewMealTime] = useState('12:00')

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

  const handleAddMeal = (dayId: string) => {
    if (!newMealLabel.trim()) return
    addMeal.mutate(
      { retreat_day_id: dayId, label: newMealLabel.trim(), time: newMealTime, retreatId },
      {
        onSuccess: () => {
          setAddingMealForDay(null)
          setNewMealLabel('')
          setNewMealTime('12:00')
        },
      }
    )
  }

  const handleDeleteMeal = (mealId: string) => {
    deleteMeal.mutate({ id: mealId, retreatId })
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
              <button
                onClick={() => setAddingMealForDay(addingMealForDay === day.id ? null : day.id)}
                className="text-sm font-medium text-green-700 hover:text-green-800"
              >
                + Add meal
              </button>
            )}
          </div>

          {/* Add meal form */}
          {addingMealForDay === day.id && (
            <div className="mb-3 flex items-end gap-2 rounded-lg border border-dashed border-stone-300 bg-stone-50 p-3">
              <Input
                label="Label"
                placeholder="e.g. Brunch"
                value={newMealLabel}
                onChange={(e) => setNewMealLabel(e.target.value)}
              />
              <Input
                label="Time"
                type="time"
                value={newMealTime}
                onChange={(e) => setNewMealTime(e.target.value)}
              />
              <Button size="sm" onClick={() => handleAddMeal(day.id)} disabled={addMeal.isPending}>
                Add
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setAddingMealForDay(null)}>
                Cancel
              </Button>
            </div>
          )}

          {dayMeals.length === 0 ? (
            <p className="text-sm text-stone-400 italic">No meals planned yet</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {dayMeals.map((meal: Meal) => {
                const mealAttendance = attendance.filter((a) => a.meal_id === meal.id)
                const prefills = meal.style === 'generic' ? getPrefillsForMealType(meal.label) : []
                return (
                  <MealCard
                    key={meal.id}
                    meal={meal}
                    retreatId={retreatId}
                    members={members}
                    attendanceCount={mealAttendance.length}
                    prefillNames={prefills.map((p) => p.name)}
                    isOrganiser={isOrganiser}
                    onDelete={() => handleDeleteMeal(meal.id)}
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
