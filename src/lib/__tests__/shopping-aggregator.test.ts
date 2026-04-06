import { describe, it, expect } from 'vitest'
import { generateShoppingList, mergeQuantities } from '../shopping-aggregator'
import type { Meal, Attendance, ShoppingItem, RetreatDay } from '../../types'

function makeDay(id: string, date: string): RetreatDay {
  return { id, retreat_id: 'r1', date }
}

function makeMeal(
  id: string,
  dayId: string,
  label: string,
  style: 'generic' | 'assigned_recipe' = 'generic'
): Meal {
  return { id, retreat_day_id: dayId, label, time: '12:00', style, recipe_title: null, recipe_notes: null }
}

function makeAttendance(mealId: string, memberId: string): Attendance {
  return { id: `a-${mealId}-${memberId}`, meal_id: mealId, member_id: memberId }
}

function makeShoppingItem(name: string, opts: Partial<ShoppingItem> = {}): ShoppingItem {
  return {
    id: `si-${name}`,
    retreat_id: 'r1',
    meal_id: null,
    name,
    quantity: null,
    category: 'misc',
    is_prefill: false,
    added_by: null,
    created_at: '',
    ...opts,
  }
}

describe('generateShoppingList', () => {
  it('returns empty list when no meals or attendance', () => {
    const result = generateShoppingList([], [], [], [])
    expect(result).toEqual([])
  })

  it('returns empty list when no attendance for generic meals', () => {
    const days = [makeDay('d1', '2026-04-03')]
    const meals = [makeMeal('m1', 'd1', 'Breakfast')]
    const result = generateShoppingList(days, meals, [], [])
    expect(result).toEqual([])
  })

  it('generates prefill items for generic breakfast with attendance', () => {
    const days = [makeDay('d1', '2026-04-03')]
    const meals = [makeMeal('m1', 'd1', 'Breakfast')]
    const attendance = [
      makeAttendance('m1', 'p1'),
      makeAttendance('m1', 'p2'),
      makeAttendance('m1', 'p3'),
    ]
    const result = generateShoppingList(days, meals, attendance, [])
    expect(result.length).toBeGreaterThan(0)
    const oats = result.find((i) => i.name === 'Porridge oats')
    expect(oats).toBeDefined()
    expect(oats!.is_prefill).toBe(true)
  })

  it('does not generate prefills for assigned_recipe meals', () => {
    const days = [makeDay('d1', '2026-04-03')]
    const meals = [makeMeal('m1', 'd1', 'Dinner', 'assigned_recipe')]
    const attendance = [makeAttendance('m1', 'p1')]
    const result = generateShoppingList(days, meals, attendance, [])
    // Should only have snack prefills, not dinner ones
    const dinnerItems = result.filter((i) => i.category === 'ingredients')
    expect(dinnerItems).toEqual([])
  })

  it('includes manual shopping items with their source ids', () => {
    const days = [makeDay('d1', '2026-04-03')]
    const meals = [makeMeal('m1', 'd1', 'Dinner', 'assigned_recipe')]
    const manualItems = [
      makeShoppingItem('Tofu', { quantity: '2 blocks', meal_id: 'm1', category: 'chilled' }),
    ]
    const result = generateShoppingList(days, meals, [], manualItems)
    const tofu = result.find((i) => i.name === 'Tofu')
    expect(tofu).toBeDefined()
    expect(tofu!.is_prefill).toBe(false)
    expect(tofu!.manualIds).toEqual(['si-Tofu'])
  })

  it('leaves manualIds empty for prefill-only rows', () => {
    const days = [makeDay('d1', '2026-04-03')]
    const meals = [makeMeal('m1', 'd1', 'Breakfast')]
    const attendance = [makeAttendance('m1', 'p1')]
    const result = generateShoppingList(days, meals, attendance, [])
    const oats = result.find((i) => i.name === 'Porridge oats')
    expect(oats!.manualIds).toEqual([])
  })

  it('aggregates same-name items across meals', () => {
    const days = [makeDay('d1', '2026-04-03'), makeDay('d2', '2026-04-04')]
    const meals = [
      makeMeal('m1', 'd1', 'Breakfast'),
      makeMeal('m2', 'd2', 'Breakfast'),
    ]
    const attendance = [
      makeAttendance('m1', 'p1'),
      makeAttendance('m2', 'p1'),
    ]
    const result = generateShoppingList(days, meals, attendance, [])
    const oats = result.find((i) => i.name === 'Porridge oats')
    expect(oats).toBeDefined()
    // Should have two quantities (one per meal)
    expect(oats!.quantities.length).toBe(2)
  })

  it('generates snack prefills based on daily headcount', () => {
    const days = [makeDay('d1', '2026-04-03')]
    const meals = [makeMeal('m1', 'd1', 'Lunch')]
    const attendance = [makeAttendance('m1', 'p1'), makeAttendance('m1', 'p2')]
    const result = generateShoppingList(days, meals, attendance, [])
    const nuts = result.find((i) => i.name === 'Mixed nuts')
    expect(nuts).toBeDefined()
    expect(nuts!.category).toBe('snacks')
  })

  it('sorts by category then name', () => {
    const days = [makeDay('d1', '2026-04-03')]
    const meals = [makeMeal('m1', 'd1', 'Breakfast')]
    const attendance = [makeAttendance('m1', 'p1')]
    const result = generateShoppingList(days, meals, attendance, [])
    for (let i = 1; i < result.length; i++) {
      const prev = result[i - 1]
      const curr = result[i]
      if (prev.category === curr.category) {
        expect(prev.name.localeCompare(curr.name)).toBeLessThanOrEqual(0)
      } else {
        expect(prev.category.localeCompare(curr.category)).toBeLessThan(0)
      }
    }
  })
})

describe('mergeQuantities', () => {
  it('sums numeric quantities with same unit', () => {
    expect(mergeQuantities(['2 kg', '3 kg'])).toBe('5 kg')
  })

  it('keeps different units separate', () => {
    const result = mergeQuantities(['2 kg', '3 loaves'])
    expect(result).toContain('2 kg')
    expect(result).toContain('3 loaves')
  })

  it('handles non-numeric quantities', () => {
    expect(mergeQuantities(['some', 'more'])).toBe('some, more')
  })

  it('returns dash for empty input', () => {
    expect(mergeQuantities([])).toBe('—')
  })

  it('rounds up numeric totals', () => {
    expect(mergeQuantities(['1.5 kg', '1.5 kg'])).toBe('3 kg')
    expect(mergeQuantities(['0.3 kg', '0.3 kg'])).toBe('1 kg')
  })
})
