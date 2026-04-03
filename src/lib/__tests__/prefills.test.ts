import { describe, it, expect } from 'vitest'
import {
  BREAKFAST_PREFILLS,
  LUNCH_PREFILLS,
  SNACK_PREFILLS,
  getPrefillsForMealType,
} from '../prefills'

describe('prefills', () => {
  describe('BREAKFAST_PREFILLS', () => {
    it('has items', () => {
      expect(BREAKFAST_PREFILLS.length).toBeGreaterThan(0)
    })

    it('scales porridge oats', () => {
      const oats = BREAKFAST_PREFILLS.find((p) => p.name === 'Porridge oats')!
      expect(oats.scalingFn(10)).toBe('1 kg')
      expect(oats.scalingFn(20)).toBe('2 kg')
    })

    it('scales bread by groups of 5', () => {
      const bread = BREAKFAST_PREFILLS.find((p) => p.name === 'Sourdough bread')!
      expect(bread.scalingFn(5)).toBe('1 loaves')
      expect(bread.scalingFn(12)).toBe('3 loaves')
    })
  })

  describe('LUNCH_PREFILLS', () => {
    it('has items', () => {
      expect(LUNCH_PREFILLS.length).toBeGreaterThan(0)
    })

    it('scales wraps', () => {
      const wraps = LUNCH_PREFILLS.find((p) => p.name === 'Tortilla wraps')!
      expect(wraps.scalingFn(10)).toBe('15 wraps')
    })
  })

  describe('SNACK_PREFILLS', () => {
    it('has items', () => {
      expect(SNACK_PREFILLS.length).toBeGreaterThan(0)
    })

    it('all items are vegan', () => {
      const nonVegan = ['cheese', 'milk', 'butter', 'egg', 'honey', 'cream', 'yogurt']
      for (const prefill of [...BREAKFAST_PREFILLS, ...LUNCH_PREFILLS, ...SNACK_PREFILLS]) {
        const lower = prefill.name.toLowerCase()
        for (const word of nonVegan) {
          if (lower.includes(word)) {
            // Allow "plant butter", "oat milk" etc
            if (lower.includes('plant') || lower.includes('oat') || lower.includes('peanut')) continue
            expect.fail(`${prefill.name} contains non-vegan ingredient "${word}"`)
          }
        }
      }
    })
  })

  describe('getPrefillsForMealType', () => {
    it('returns breakfast prefills for "Breakfast"', () => {
      expect(getPrefillsForMealType('Breakfast')).toBe(BREAKFAST_PREFILLS)
    })

    it('returns breakfast prefills for "Brunch"', () => {
      expect(getPrefillsForMealType('Brunch')).toBe(BREAKFAST_PREFILLS)
    })

    it('returns lunch prefills for "Lunch"', () => {
      expect(getPrefillsForMealType('Lunch')).toBe(LUNCH_PREFILLS)
    })

    it('is case-insensitive', () => {
      expect(getPrefillsForMealType('BREAKFAST')).toBe(BREAKFAST_PREFILLS)
      expect(getPrefillsForMealType('lunch')).toBe(LUNCH_PREFILLS)
    })

    it('returns empty for "Dinner"', () => {
      expect(getPrefillsForMealType('Dinner')).toEqual([])
    })

    it('returns empty for unknown labels', () => {
      expect(getPrefillsForMealType('Snack')).toEqual([])
      expect(getPrefillsForMealType('Tea time')).toEqual([])
    })
  })
})
