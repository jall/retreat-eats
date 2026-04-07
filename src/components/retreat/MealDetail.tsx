import { useEffect, useRef, useState } from 'react'
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
  useMeals,
} from '../../lib/queries'
import { useAuth } from '../layout/AuthGuard'
import { getPrefillsForMealType } from '../../lib/prefills'
import { EXCLUDED_MARKER } from '../../lib/shopping-aggregator'
import { hasAiKey } from '../../lib/ai-settings'
import { generateRecipe, type GeneratedRecipe } from '../../lib/recipe-generator'
import type { Meal, RetreatMember, MealStyle } from '../../types'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Avatar from '../ui/Avatar'

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
  const [aiKeyPresent, setAiKeyPresent] = useState(hasAiKey())
  const [showRecipeGen, setShowRecipeGen] = useState(false)
  const [cuisineHint, setCuisineHint] = useState('')
  const [veganDefault, setVeganDefault] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [pendingRecipe, setPendingRecipe] = useState<GeneratedRecipe | null>(null)

  useEffect(() => {
    const onChange = () => setAiKeyPresent(hasAiKey())
    window.addEventListener('ai-key-changed', onChange)
    return () => window.removeEventListener('ai-key-changed', onChange)
  }, [])

  const updateMeal = useUpdateMeal()
  const { data: allMembers = [] } = useRetreatMembers(retreatId)
  const currentMember = allMembers.find((m) => m.user_id === user.id)
  const { data: assignments = [] } = useMealAssignments(meal.id)
  const addAssignment = useAddMealAssignment()
  const removeAssignment = useRemoveMealAssignment()
  const { data: attendance = [] } = useAttendance(retreatId)
  const { data: allShoppingItems = [] } = useShoppingItems(retreatId)
  const { data: allMeals = [] } = useMeals(retreatId)
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

  const saveFields = (overrides: Partial<{
    label: string
    time: string
    style: MealStyle
    recipeTitle: string
    recipeNotes: string
  }> = {}) => {
    const nextStyle = overrides.style ?? style
    const nextRecipeTitle = overrides.recipeTitle ?? recipeTitle
    const nextRecipeNotes = overrides.recipeNotes ?? recipeNotes
    updateMeal.mutate({
      id: meal.id,
      retreatId,
      updates: {
        label: overrides.label ?? label,
        time: overrides.time ?? time,
        style: nextStyle,
        recipe_title: nextStyle === 'assigned_recipe' ? nextRecipeTitle : null,
        recipe_notes: nextStyle === 'assigned_recipe' ? nextRecipeNotes : null,
      },
    })
  }

  const handleStyleChange = (nextStyle: MealStyle) => {
    setStyle(nextStyle)
    saveFields({ style: nextStyle })
  }

  const handleDone = () => {
    // Flush any unsaved text state then close
    saveFields()
    onClose()
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
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    dialogRef.current?.focus()
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleGenerateRecipe = async () => {
    setGenerating(true)
    setGenerateError(null)
    setPendingRecipe(null)
    try {
      const numPeople = headcount > 0 ? headcount : members.length
      const dietary = veganDefault ? ['vegan'] : []

      // Build context from sibling meals so the AI doesn't repeat itself.
      // Skip the current meal, and skip any meal with no useful signal
      // (generic meal types like "Breakfast" with no recipe still help
      // — they tell the model "this slot is already a generic breakfast").
      const otherMeals = allMeals
        .filter((m) => m.id !== meal.id)
        .map((m) => {
          const mWithDay = m as Meal & { retreat_day?: { date?: string } }
          return {
            label: m.label,
            recipeTitle: m.recipe_title,
            dayDate: mWithDay.retreat_day?.date,
          }
        })

      const recipe = await generateRecipe({
        mealLabel: label,
        numPeople,
        allergies,
        dietary,
        cuisineHint: cuisineHint.trim() || undefined,
        otherMeals,
      })
      setPendingRecipe(recipe)
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Failed to generate recipe')
    } finally {
      setGenerating(false)
    }
  }

  const handleAcceptRecipe = async () => {
    if (!pendingRecipe) return
    // Save title + notes to the meal
    updateMeal.mutate({
      id: meal.id,
      retreatId,
      updates: {
        recipe_title: pendingRecipe.title,
        recipe_notes: pendingRecipe.notes,
      },
    })
    setRecipeTitle(pendingRecipe.title)
    setRecipeNotes(pendingRecipe.notes)

    // Add ingredients to the shopping list, attached to this meal
    for (const ing of pendingRecipe.ingredients) {
      addShoppingItem.mutate({
        retreat_id: retreatId,
        name: ing.name,
        quantity: ing.quantity || undefined,
        category: ing.category || 'misc',
        meal_id: meal.id,
        added_by_member_id: currentMember?.id || null,
      })
    }

    setPendingRecipe(null)
    setShowRecipeGen(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="meal-dialog-title"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl outline-none"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="meal-dialog-title" className="text-lg font-bold text-stone-800">Edit Meal</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-stone-400 hover:bg-stone-100 hover:text-stone-600"
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
          <Input
            label="Label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={() => saveFields({ label })}
          />
          <Input
            label="Time"
            type="time"
            value={time}
            onChange={(e) => {
              setTime(e.target.value)
              saveFields({ time: e.target.value })
            }}
          />

          {/* Style toggle */}
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-stone-700">Style</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleStyleChange('generic')}
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
                onClick={() => handleStyleChange('assigned_recipe')}
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
              <form onSubmit={handleAddIngredient} className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Input
                  placeholder="Add custom item"
                  value={ingredientName}
                  onChange={(e) => setIngredientName(e.target.value)}
                />
                <div className="flex gap-2">
                  <Input
                    placeholder="Qty"
                    value={ingredientQty}
                    onChange={(e) => setIngredientQty(e.target.value)}
                    className="w-24"
                  />
                  <Button type="submit" size="sm">
                    Add
                  </Button>
                </div>
              </form>

              <p className="mt-2 text-xs text-stone-400">
                Uncheck items to exclude from the shopping list for this retreat. Changes apply to all {label.toLowerCase()} meals.
              </p>
            </div>
          )}

          {/* Recipe fields */}
          {style === 'assigned_recipe' && (
            <>
              {/* AI recipe generator */}
              {aiKeyPresent ? (
                <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-indigo-900">Generate with AI</h3>
                      <p className="text-xs text-indigo-600">
                        Auto-fill recipe + ingredients based on attendees and allergies
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowRecipeGen((v) => !v)}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
                    >
                      {showRecipeGen ? 'Hide' : 'Open'}
                    </button>
                  </div>

                  {showRecipeGen && (
                    <div className="mt-3 space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-xs text-indigo-900">
                        <div className="rounded bg-white px-2 py-1.5 border border-indigo-100">
                          <span className="text-indigo-500">People:</span>{' '}
                          <strong>{headcount > 0 ? headcount : members.length}</strong>
                          {headcount === 0 && <span className="text-indigo-400"> (all members)</span>}
                        </div>
                        <div className="rounded bg-white px-2 py-1.5 border border-indigo-100">
                          <span className="text-indigo-500">Meal:</span> <strong>{label}</strong>
                        </div>
                        <div className="col-span-2 rounded bg-white px-2 py-1.5 border border-indigo-100">
                          <span className="text-indigo-500">Allergies:</span>{' '}
                          {allergies.length > 0 ? <strong>{allergies.join(', ')}</strong> : <span className="text-indigo-400">none</span>}
                        </div>
                      </div>

                      <label className="flex items-center gap-2 text-sm text-indigo-900">
                        <input
                          type="checkbox"
                          checked={veganDefault}
                          onChange={(e) => setVeganDefault(e.target.checked)}
                          className="rounded border-indigo-300 text-indigo-700 focus:ring-indigo-500"
                        />
                        Vegan
                      </label>

                      <Input
                        placeholder="Cuisine hint (optional, e.g. Thai, Italian, comfort food)"
                        value={cuisineHint}
                        onChange={(e) => setCuisineHint(e.target.value)}
                      />

                      <Button onClick={handleGenerateRecipe} disabled={generating} size="sm">
                        {generating ? 'Generating…' : pendingRecipe ? 'Regenerate' : 'Generate recipe'}
                      </Button>

                      {generateError && (
                        <p className="text-xs text-red-600">{generateError}</p>
                      )}

                      {pendingRecipe && (
                        <div className="rounded-lg border border-indigo-200 bg-white p-3 space-y-2">
                          <h4 className="text-sm font-semibold text-stone-800">{pendingRecipe.title}</h4>
                          <p className="whitespace-pre-wrap text-xs text-stone-600">{pendingRecipe.notes}</p>
                          <div>
                            <p className="text-xs font-medium text-stone-700">Ingredients ({pendingRecipe.ingredients.length})</p>
                            <ul className="mt-1 space-y-0.5 text-xs text-stone-600">
                              {pendingRecipe.ingredients.map((ing, i) => (
                                <li key={i} className="flex justify-between">
                                  <span>{ing.name}</span>
                                  <span className="text-stone-400">{ing.quantity}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="flex gap-2 pt-1">
                            <Button size="sm" onClick={handleAcceptRecipe}>
                              Use this recipe
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => setPendingRecipe(null)}>
                              Discard
                            </Button>
                          </div>
                          <p className="text-xs text-stone-400">
                            Accepting will overwrite the current recipe and add all ingredients to the shopping list.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-stone-400">
                  Tip: add an AI API key in Settings to enable recipe generation.
                </p>
              )}

              <Input
                label="Recipe title"
                value={recipeTitle}
                onChange={(e) => setRecipeTitle(e.target.value)}
                onBlur={() => saveFields({ recipeTitle })}
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
                  onBlur={() => saveFields({ recipeNotes })}
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

              <form onSubmit={handleAddIngredient} className="flex flex-col gap-2 sm:flex-row">
                <Input
                  placeholder="Ingredient name"
                  value={ingredientName}
                  onChange={(e) => setIngredientName(e.target.value)}
                />
                <div className="flex gap-2">
                  <Input
                    placeholder="Qty"
                    value={ingredientQty}
                    onChange={(e) => setIngredientQty(e.target.value)}
                    className="w-24"
                  />
                  <Button type="submit" size="sm">
                    Add
                  </Button>
                </div>
              </form>
            </>
          )}

          {/* Assign lead */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-stone-700">Lead cook</label>
            <div className="flex items-center gap-2">
              {lead && (() => {
                const leadMember = members.find((m) => m.id === lead.member_id)
                return (
                  <Avatar
                    name={leadMember?.display_name || '?'}
                    src={leadMember?.avatar_url}
                    size="md"
                  />
                )
              })()}
              <select
                value={lead?.member_id || ''}
                onChange={(e) => handleAssignLead(e.target.value)}
                className="flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900
                  focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
              >
                <option value="">None</option>
                {[...members].sort((a, b) => a.display_name.localeCompare(b.display_name)).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.display_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Assign helpers */}
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-stone-700">Helpers</span>
            <div className="space-y-1">
              {[...members].sort((a, b) => a.display_name.localeCompare(b.display_name)).map((m) => (
                <label key={m.id} className="flex items-center gap-2 text-sm text-stone-700">
                  <input
                    type="checkbox"
                    checked={helpers.some((h) => h.member_id === m.id)}
                    onChange={() => handleToggleHelper(m.id)}
                    className="rounded border-stone-300 text-green-700 focus:ring-green-500"
                  />
                  <Avatar name={m.display_name} src={m.avatar_url} size="sm" />
                  {m.display_name}
                </label>
              ))}
            </div>
          </div>

          {/* Footer — everything autosaves on blur, this just closes */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-stone-400">
              {updateMeal.isPending ? 'Saving…' : 'Changes save automatically'}
            </span>
            <Button onClick={handleDone}>Done</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
