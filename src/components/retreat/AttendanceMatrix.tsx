import {
  useRetreatMembers,
  useRetreatDays,
  useMeals,
  useAttendance,
  useToggleAttendance,
} from '../../lib/queries'
import type { Meal } from '../../types'

type AttendanceMatrixProps = {
  retreatId: string
}

export default function AttendanceMatrix({ retreatId }: AttendanceMatrixProps) {
  const { data: members = [] } = useRetreatMembers(retreatId)
  const { data: days = [], isLoading: daysLoading } = useRetreatDays(retreatId)
  const { data: meals = [], isLoading: mealsLoading } = useMeals(retreatId)
  const { data: attendance = [] } = useAttendance(retreatId)
  const toggleAttendance = useToggleAttendance()

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

  const allMealsOrdered = mealsByDay.flatMap(({ meals: dm }) => dm)

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const isAttending = (mealId: string, memberId: string) =>
    attendance.some((a) => a.meal_id === mealId && a.member_id === memberId)

  const headcount = (mealId: string) =>
    attendance.filter((a) => a.meal_id === mealId).length

  const handleToggle = (mealId: string, memberId: string) => {
    const attending = !isAttending(mealId, memberId)
    toggleAttendance.mutate({ mealId, memberId, attending, retreatId })
  }

  const memberAttendingAll = (memberId: string) =>
    allMealsOrdered.length > 0 && allMealsOrdered.every((meal) => isAttending(meal.id, memberId))

  const handleToggleAll = (memberId: string) => {
    const shouldAttendAll = !memberAttendingAll(memberId)
    for (const meal of allMealsOrdered) {
      const currently = isAttending(meal.id, memberId)
      if (shouldAttendAll && !currently) {
        toggleAttendance.mutate({ mealId: meal.id, memberId, attending: true, retreatId })
      } else if (!shouldAttendAll && currently) {
        toggleAttendance.mutate({ mealId: meal.id, memberId, attending: false, retreatId })
      }
    }
  }

  if (allMealsOrdered.length === 0) {
    return <p className="py-12 text-center text-stone-400">No meals to show attendance for.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-white px-3 py-2 text-left font-medium text-stone-600">
              Member
            </th>
            <th className="px-2 py-2 text-center font-medium text-stone-600 text-xs">
              All
            </th>
            <th className="bg-white px-3 py-2 text-left font-medium text-stone-600">
              Allergies
            </th>
            {mealsByDay.map(({ day, meals: dm }) =>
              dm.map((meal, i) => (
                <th
                  key={meal.id}
                  className="px-2 py-2 text-center font-medium text-stone-600"
                >
                  {i === 0 && (
                    <div className="text-xs text-stone-400">{formatDate(day.date)}</div>
                  )}
                  <div className="text-xs">{meal.label}</div>
                </th>
              ))
            )}
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr key={member.id} className="border-t border-stone-100">
              <td className="sticky left-0 z-10 bg-white px-3 py-2 font-medium text-stone-800 whitespace-nowrap">
                {member.display_name}
              </td>
              <td className="px-2 py-2 text-center">
                <input
                  type="checkbox"
                  checked={memberAttendingAll(member.id)}
                  onChange={() => handleToggleAll(member.id)}
                  className="h-4 w-4 rounded border-stone-300 text-green-700 focus:ring-green-500"
                  title="Toggle all meals"
                />
              </td>
              <td className="bg-white px-3 py-2 text-xs text-amber-700 whitespace-nowrap">
                {member.allergies || '-'}
              </td>
              {allMealsOrdered.map((meal) => (
                <td key={meal.id} className="px-2 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={isAttending(meal.id, member.id)}
                    onChange={() => handleToggle(meal.id, member.id)}
                    className="h-4 w-4 rounded border-stone-300 text-green-700 focus:ring-green-500"
                  />
                </td>
              ))}
            </tr>
          ))}
          {/* Headcount row */}
          <tr className="border-t-2 border-stone-300 bg-stone-50">
            <td className="sticky left-0 z-10 bg-stone-50 px-3 py-2 text-sm font-semibold text-stone-700">
              Total
            </td>
            <td className="bg-stone-50 px-3 py-2" />
            <td className="bg-stone-50 px-3 py-2" />
            {allMealsOrdered.map((meal) => (
              <td key={meal.id} className="px-2 py-2 text-center text-sm font-semibold text-green-800">
                {headcount(meal.id)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}
