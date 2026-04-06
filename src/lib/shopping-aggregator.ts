import type { Meal, Attendance, ShoppingItem, RetreatDay } from '../types'
import { getPrefillsForMealType, SNACK_PREFILLS } from './prefills'

export type AggregatedItem = {
  name: string
  category: string
  quantities: string[]
  is_prefill: boolean
  // IDs of underlying ShoppingItem rows (manual additions / recipe ingredients
  // / snack requests). Populated when this aggregated row has a removable
  // user-added source. Prefill-only rows leave this empty.
  manualIds: string[]
}

export const EXCLUDED_MARKER = 'EXCLUDED'

export function generateShoppingList(
  days: RetreatDay[],
  meals: Meal[],
  attendance: Attendance[],
  allItems: ShoppingItem[]
): AggregatedItem[] {
  const aggregation = new Map<string, AggregatedItem>()

  // Build set of excluded prefill names (items marked EXCLUDED)
  const excludedNames = new Set(
    allItems
      .filter((i) => i.is_prefill && i.quantity === EXCLUDED_MARKER)
      .map((i) => i.name.toLowerCase())
  )

  // Manual items are non-prefill items, or prefills that aren't exclusion markers
  const manualItems = allItems.filter(
    (i) => !i.is_prefill || (i.is_prefill && i.quantity !== EXCLUDED_MARKER)
  )

  function addItem(
    name: string,
    category: string,
    quantity: string,
    is_prefill: boolean,
    manualId?: string
  ) {
    const key = name.toLowerCase()
    const existing = aggregation.get(key)
    if (existing) {
      existing.quantities.push(quantity)
      if (manualId) existing.manualIds.push(manualId)
    } else {
      aggregation.set(key, {
        name,
        category,
        quantities: [quantity],
        is_prefill,
        manualIds: manualId ? [manualId] : [],
      })
    }
  }

  // Generic meals: apply prefills based on attendance (skip excluded items)
  for (const meal of meals) {
    const mealAttendance = attendance.filter((a) => a.meal_id === meal.id)
    const headcount = mealAttendance.length

    if (meal.style === 'generic' && headcount > 0) {
      const prefills = getPrefillsForMealType(meal.label)
      for (const prefill of prefills) {
        if (!excludedNames.has(prefill.name.toLowerCase())) {
          addItem(prefill.name, prefill.category, prefill.scalingFn(headcount), true)
        }
      }
    }
  }

  // Snack prefills based on average daily headcount (skip excluded)
  if (days.length > 0) {
    const dailyHeadcounts = days.map((day) => {
      const dayMeals = meals.filter((m) => m.retreat_day_id === day.id)
      const dayAttendees = new Set<string>()
      for (const meal of dayMeals) {
        for (const a of attendance) {
          if (a.meal_id === meal.id) dayAttendees.add(a.member_id)
        }
      }
      return dayAttendees.size
    })
    const avgHeadcount = Math.ceil(
      dailyHeadcounts.reduce((a, b) => a + b, 0) / days.length
    )
    if (avgHeadcount > 0) {
      for (const prefill of SNACK_PREFILLS) {
        if (!excludedNames.has(prefill.name.toLowerCase())) {
          const totalQuantity = prefill.scalingFn(avgHeadcount * days.length)
          addItem(prefill.name, prefill.category, totalQuantity, true)
        }
      }
    }
  }

  // Manual items (from assigned_recipe meals, snack requests, and custom generic additions)
  for (const item of manualItems) {
    addItem(item.name, item.category, item.quantity || '', false, item.id)
  }

  // Sort by category then name
  return Array.from(aggregation.values()).sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category)
    return a.name.localeCompare(b.name)
  })
}

export function mergeQuantities(quantities: string[]): string {
  const unitMap = new Map<string, number>()
  const nonNumeric: string[] = []

  for (const q of quantities) {
    const match = q.match(/^([\d.]+)\s*(.*)$/)
    if (match) {
      const num = parseFloat(match[1])
      const unit = match[2].trim() || 'units'
      unitMap.set(unit, (unitMap.get(unit) || 0) + num)
    } else if (q) {
      nonNumeric.push(q)
    }
  }

  const parts: string[] = []
  for (const [unit, total] of unitMap) {
    parts.push(`${Math.ceil(total)} ${unit}`)
  }
  parts.push(...nonNumeric)

  return parts.join(', ') || '—'
}
