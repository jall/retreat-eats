import { useState } from 'react'
import {
  useUpdateMeal,
  useMealAssignments,
  useAddMealAssignment,
  useRemoveMealAssignment,
  useAttendance,
  useRetreatMembers,
  useShoppingItems,
  useAddShoppingItem,
  useRemoveShoppingItem,
} from '../../lib/queries'
import { useAuth } from '../layout/AuthGuard'
import { getPrefillsForMealType } from '../../lib/prefills'
import { EXCLUDED_MARKER } from '../../lib/shopping-aggregator'
import type { Meal, RetreatMember, MealStyle } from '../../types'
import Button from '../ui/Button'
import Input from '../ui/Input'

type MealDetailProps = {
  meal: Meal
  retreatId: string
  members: RetreatMember[]
  onClose: () => void
}

export default function MealDetail({ meal, retreatId, members, onClose }: MealDetailProps) {
  const { user } = useAuth()
  const [label, setLabel] = useState(meal.label)
  const [time, setTime] = useState(meal.time)
  const [style, setStyle] = useState<MealStyle>(meal.style)
  const [recipeTitle, setRecipeTitle] = useState(meal.recipe_title || '')
  const [recipeNotes, setRecipeNotes] = useState(meal.recipe_notes || '')
  const [ingredientName, setIngredientName] = useState('')
  const [ingredientQty, setIngredientQty] = useState('')

  const updateMeal = useUpdateMeal()
  const { data: allMembers = [] } = useRetreatMembers(retreatId)
  const currentMember = allMembers.find((m) => m.user_id === user.id)
  const { data: assignments = [] } = useMealAssignments(meal.id)
  const addAssignment = useAddMealAssignment()
  const removeAssignment = useRemoveMealAssignment()
  const { data: attendance = [] } = useAttendance(retreatId)
  const { data: allShoppingItems = [] } = useShoppingItems(retreatId)
  const addShoppingItem = useAddShoppingItem()
  const removeShoppingItem = useRemoveShoppingItem()

  const mealAttendees = attendance.filter((a) => a.meal_id === meal.id)
  const attendeeMembers = mealAttendees
    .map((a) => members.find((m) => m.id === a.member_id))
    .filter(Boolean)
  const allergies = [...new Set(attendeeMembers.map((m) => m!.allergies).filter(Boolean))]

  const lead = assignments.find((a) => a.duty === 'lead')
  const helpers = assignments.filter((a) => a.duty === 'helper')

  // Pre-fill exclusions for this retreat
  const exclusions = allShoppingItems.filter(
    (i) => i.is_prefill && i.quantity === EXCLUDED_MARKER
  )
  const excludedNames = new Set(exclusions.map((i) => i.name.toLowerCase()))

  // Custom items added to this specific meal
  const mealCustomItems = allShoppingItems.filter(
    (i) => i.meal_id === meal.id && !i.is_prefill
  )

  const handleSave = () => {
    updateMeal.mutate({
      id: meal.id,
      retreatId,
      updates: {
        label,
        time,
        style,
        recipe_title: style === 'assigned_recipe' ? recipeTitle : null,
        recipe_notes: style === 'assigned_recipe' ? recipeNotes : null,
      },
    })
  }

  const handleAssignLead = (memberId: string) => {
    if (lead) {
      removeAssignment.mutate({ id: lead.id, meal_id: meal.id })
    }
    if (memberId) {
      addAssignment.mutate({ meal_id: meal.id, member_id: memberId, duty: 'lead' })
    }
  }

  const handleToggleHelper = (memberId: string) => {
    const existing = helpers.find((h) => h.member_id === memberId)
    if (existing) {
      removeAssignment.mutate({ id: existing.id, meal_id: meal.id })
    } else {
      addAssignment.mutate({ meal_id: meal.id, member_id: memberId, duty: 'helper' })
    }
  }

  const handleAddIngredient = (e: React.FormEvent) => {
    e.preventDefault()
    if (!ingredientName.trim()) return
    addShoppingItem.mutate({
      retreat_id: retreatId,
      name: ingredientName.trim(),
      quantity: ingredientQty.trim() || undefined,
      category: 'ingredients',
      meal_id: meal.id,
      added_by_member_id: currentMember?.id || null,
    })
    setIngredientName('')
    setIngredientQty('')
  }

  const handleTogglePrefill = (prefillName: string) => {
    const isExcluded = excludedNames.has(prefillName.toLowerCase())
    if (isExcluded) {
      // Re-include: remove the exclusion marker
      const exclusion = exclusions.find(
        (i) => i.name.toLowerCase() === prefillName.toLowerCase()
      )
      if (exclusion) {
        removeShoppingItem.mutate({ id: exclusion.id, retreat_id: retreatId })
      }
    } else {
      // Exclude: add an exclusion marker
      addShoppingItem.mutate({
        retreat_id: retreatId,
        name: prefillName,
        quantity: EXCLUDED_MARKER,
        category: 'excluded',
        meal_id: null,
        added_by_member_id: currentMember?.id || null,
        is_prefill: true,
      })
    }
  }

  const headcount = mealAttendees.length
  const prefills = getPrefillsForMealType(label)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-stone-800">Edit Meal</h2>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Allergy banner */}
        {allergies.length > 0 && (
          <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 p-3">
            <p className="text-sm font-medium text-amber-800">Allergy alert</p>
            <p className="text-sm text-amber-700">{allergies.join(', ')}</p>
          </div>
        )}

        <div className="space-y-4">
          {/* Label & time */}
          <Input label="Label" value={label} onChange={(e) => setLabel(e.target.value)} />
          <Input label="Time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />

          {/* Style toggle */}
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-stone-700">Style</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStyle('generic')}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  style === 'generic'
                    ? 'bg-green-700 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                Generic
              </button>
              <button
                type="button"
                onClick={() => setStyle('assigned_recipe')}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  style === 'assigned_recipe'
                    ? 'bg-amber-600 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                Assigned Recipe
              </button>
            </div>
          </div>

          {/* Generic meal: editable pre-fills + custom items */}
          {style === 'generic' && (
            <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
              <p className="mb-2 text-sm font-medium text-stone-700">
                Ingredients {headcount > 0 ? `(scaled for ${headcount})` : '(set attendance to see quantities)'}
              </p>
              {prefills.length > 0 ? (
                <div className="space-y-1">
                  {prefills.map((p) => {
                    const isExcluded = excludedNames.has(p.name.toLowerCase())
                    return (
                      <label
                        key={p.name}
                        className={`flex items-center justify-between text-sm cursor-pointer ${
                          isExcluded ? 'opacity-50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!isExcluded}
                            onChange={() => handleTogglePrefill(p.name)}
                            className="h-3.5 w-3.5 rounded border-stone-300 text-green-700 focus:ring-green-500"
                          />
                          <span className={isExcluded ? 'line-through text-stone-400' : 'text-stone-600'}>
                            {p.name}
                          </span>
                        </div>
                        <span className="text-stone-400">
                          {headcount > 0 && !isExcluded ? p.scalingFn(headcount) : '—'}
                        </span>
                      </label>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-stone-400 italic">
                  No pre-fill template for "{label}". Rename to include "breakfast" or "lunch" for defaults.
                </p>
              )}

              {/* Custom items for this meal */}
              {mealCustomItems.length > 0 && (
                <div className="mt-3 border-t border-stone-200 pt-2">
                  <p className="mb-1 text-xs font-medium text-stone-500">Custom additions</p>
                  {mealCustomItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span className="text-stone-600">{item.name}</span>
                      <div className="flex items-center gap-2">
                        {item.quantity && <span className="text-stone-400">{item.quantity}</span>}
                        <button
                          onClick={() => removeShoppingItem.mutate({ id: item.id, retreat_id: retreatId })}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          &times;
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add custom item */}
              <form onSubmit={handleAddIngredient} className="mt-3 flex gap-2">
                <Input
                  placeholder="Add custom item"
                  value={ingredientName}
                  onChange={(e) => setIngredientName(e.target.value)}
                />
                <Input
                  placeholder="Qty"
                  value={ingredientQty}
                  onChange={(e) => setIngredientQty(e.target.value)}
                  className="w-24"
                />
                <Button type="submit" size="sm">
                  Add
                </Button>
              </form>

              <p className="mt-2 text-xs text-stone-400">
                Uncheck items to exclude from the shopping list for this retreat. Changes apply to all {label.toLowerCase()} meals.
              </p>
            </div>
          )}

          {/* Recipe fields */}
          {style === 'assigned_recipe' && (
            <>
              <Input
                label="Recipe title"
                value={recipeTitle}
                onChange={(e) => setRecipeTitle(e.target.value)}
                placeholder="e.g. Thai Green Curry"
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-stone-700">Recipe notes</label>
                <textarea
                  className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900
                    placeholder:text-stone-400 focus:border-green-500 focus:outline-none focus:ring-2
                    focus:ring-green-500/20"
                  rows={3}
                  value={recipeNotes}
                  onChange={(e) => setRecipeNotes(e.target.value)}
                  placeholder="Instructions, links, etc."
                />
              </div>

              {/* Recipe ingredients */}
              {mealCustomItems.length > 0 && (
                <div>
                  <p className="mb-1 text-sm font-medium text-stone-700">Ingredients</p>
                  {mealCustomItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm py-0.5">
                      <span className="text-stone-600">{item.name}</span>
                      <div className="flex items-center gap-2">
                        {item.quantity && <span className="text-stone-400">{item.quantity}</span>}
                        <button
                          onClick={() => removeShoppingItem.mutate({ id: item.id, retreat_id: retreatId })}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          &times;
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleAddIngredient} className="flex gap-2">
                <Input
                  placeholder="Ingredient name"
                  value={ingredientName}
                  onChange={(e) => setIngredientName(e.target.value)}
                />
                <Input
                  placeholder="Qty"
                  value={ingredientQty}
                  onChange={(e) => setIngredientQty(e.target.value)}
                  className="w-24"
                />
                <Button type="submit" size="sm">
                  Add
                </Button>
              </form>
            </>
          )}

          {/* Assign lead */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-stone-700">Lead cook</label>
            <select
              value={lead?.member_id || ''}
              onChange={(e) => handleAssignLead(e.target.value)}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900
                focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
            >
              <option value="">None</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.display_name}
                </option>
              ))}
            </select>
          </div>

          {/* Assign helpers */}
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-stone-700">Helpers</span>
            <div className="space-y-1">
              {members.map((m) => (
                <label key={m.id} className="flex items-center gap-2 text-sm text-stone-700">
                  <input
                    type="checkbox"
                    checked={helpers.some((h) => h.member_id === m.id)}
                    onChange={() => handleToggleHelper(m.id)}
                    className="rounded border-stone-300 text-green-700 focus:ring-green-500"
                  />
                  {m.display_name}
                </label>
              ))}
            </div>
          </div>

          {/* Save / close */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateMeal.isPending}>
              {updateMeal.isPending ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
