export type PrefillItem = {
  name: string
  category: string
  scalingFn: (headcount: number) => string
}

export const BREAKFAST_PREFILLS: PrefillItem[] = [
  { name: 'Porridge oats', category: 'dry goods', scalingFn: (n) => `${Math.ceil(n * 0.08)} kg` },
  { name: 'Sourdough bread', category: 'bakery', scalingFn: (n) => `${Math.ceil(n / 5)} loaves` },
  { name: 'Plant butter', category: 'chilled', scalingFn: (n) => `${Math.ceil(n / 8)} packs` },
  { name: 'Jam (mixed)', category: 'dry goods', scalingFn: (n) => `${Math.ceil(n / 10)} jars` },
  { name: 'Peanut butter', category: 'dry goods', scalingFn: (n) => `${Math.ceil(n / 8)} jars` },
  { name: 'Oat milk', category: 'chilled', scalingFn: (n) => `${Math.ceil(n * 0.25)} litres` },
  { name: 'Maple syrup', category: 'dry goods', scalingFn: (n) => `${Math.ceil(n / 15)} bottles` },
  { name: 'Tea bags (mixed)', category: 'dry goods', scalingFn: (n) => `${Math.ceil(n * 3)} bags` },
  { name: 'Coffee (ground)', category: 'dry goods', scalingFn: (n) => `${Math.ceil(n * 0.02)} kg` },
  { name: 'Banana', category: 'produce', scalingFn: (n) => `${n} bananas` },
]

export const LUNCH_PREFILLS: PrefillItem[] = [
  { name: 'Tortilla wraps', category: 'bakery', scalingFn: (n) => `${Math.ceil(n * 1.5)} wraps` },
  { name: 'Mixed salad leaves', category: 'produce', scalingFn: (n) => `${Math.ceil(n * 0.04)} kg` },
  { name: 'Hummus', category: 'chilled', scalingFn: (n) => `${Math.ceil(n / 4)} tubs` },
  { name: 'Tomatoes', category: 'produce', scalingFn: (n) => `${Math.ceil(n * 0.5)} tomatoes` },
  { name: 'Cucumber', category: 'produce', scalingFn: (n) => `${Math.ceil(n / 6)} cucumbers` },
  { name: 'Avocado', category: 'produce', scalingFn: (n) => `${Math.ceil(n / 3)} avocados` },
  { name: 'Olives', category: 'dry goods', scalingFn: (n) => `${Math.ceil(n / 6)} jars` },
  { name: 'Canned chickpeas', category: 'dry goods', scalingFn: (n) => `${Math.ceil(n / 4)} cans` },
]

export const SNACK_PREFILLS: PrefillItem[] = [
  { name: 'Seasonal fruit (mixed)', category: 'produce', scalingFn: (n) => `${n * 2} pieces` },
  { name: 'Mixed nuts', category: 'snacks', scalingFn: (n) => `${Math.ceil(n * 0.04)} kg` },
  { name: 'Dark chocolate', category: 'snacks', scalingFn: (n) => `${Math.ceil(n / 3)} bars` },
  { name: 'Rice cakes', category: 'snacks', scalingFn: (n) => `${Math.ceil(n / 4)} packs` },
  { name: 'Dried mango', category: 'snacks', scalingFn: (n) => `${Math.ceil(n / 5)} packs` },
]

export function getPrefillsForMealType(label: string): PrefillItem[] {
  const lower = label.toLowerCase()
  if (lower.includes('breakfast') || lower.includes('brunch')) return BREAKFAST_PREFILLS
  if (lower.includes('lunch')) return LUNCH_PREFILLS
  return []
}
