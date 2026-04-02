import { useState } from 'react'
import {
  useRetreatDays,
  useMeals,
  useAttendance,
  useShoppingItems,
  useRetreatMembers,
  useAddShoppingItem,
  useRemoveShoppingItem,
} from '../../lib/queries'
import { useAuth } from '../layout/AuthGuard'
import { generateShoppingList, mergeQuantities } from '../../lib/shopping-aggregator'
import Button from '../ui/Button'
import Input from '../ui/Input'

type ShoppingListProps = {
  retreatId: string
}

export default function ShoppingList({ retreatId }: ShoppingListProps) {
  const { user } = useAuth()
  const { data: days = [] } = useRetreatDays(retreatId)
  const { data: meals = [] } = useMeals(retreatId)
  const { data: attendance = [] } = useAttendance(retreatId)
  const { data: manualItems = [] } = useShoppingItems(retreatId)
  const { data: members = [] } = useRetreatMembers(retreatId)
  const addItem = useAddShoppingItem()
  const removeItem = useRemoveShoppingItem()

  const [showList, setShowList] = useState(false)
  const [newName, setNewName] = useState('')
  const [newQty, setNewQty] = useState('')
  const [copied, setCopied] = useState(false)

  const currentMember = members.find((m) => m.user_id === user.id)

  // Allergies banner
  const allAllergies = [...new Set(members.map((m) => m.allergies).filter(Boolean))]

  const aggregated = showList
    ? generateShoppingList(days, meals, attendance, manualItems)
    : []

  // Group by category
  const grouped = aggregated.reduce<Record<string, typeof aggregated>>((acc, item) => {
    const cat = item.category || 'misc'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    addItem.mutate(
      {
        retreat_id: retreatId,
        name: newName.trim(),
        quantity: newQty.trim() || undefined,
        added_by_member_id: currentMember?.id || null,
      },
      { onSuccess: () => { setNewName(''); setNewQty('') } }
    )
  }

  const handleCopy = () => {
    const lines: string[] = []
    for (const [cat, items] of Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b))) {
      lines.push(`## ${cat.charAt(0).toUpperCase() + cat.slice(1)}`)
      for (const item of items) {
        lines.push(`- ${item.name}: ${mergeQuantities(item.quantities)}`)
      }
      lines.push('')
    }
    if (allAllergies.length > 0) {
      lines.push(`## Allergies to note`)
      lines.push(allAllergies.join(', '))
    }
    navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Allergy banner */}
      {allAllergies.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">Allergies to note</p>
          <p className="text-sm text-amber-700">{allAllergies.join(', ')}</p>
        </div>
      )}

      {/* Generate button */}
      <div className="flex items-center gap-3">
        <Button onClick={() => setShowList(true)}>
          {showList ? 'Regenerate list' : 'Generate shopping list'}
        </Button>
        {showList && (
          <Button variant="secondary" onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy to clipboard'}
          </Button>
        )}
      </div>

      {/* Shopping list */}
      {showList && (
        <div className="space-y-6">
          {Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([category, items]) => (
              <div key={category}>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">
                  {category}
                </h3>
                <div className="space-y-1">
                  {items.map((item, i) => (
                    <div
                      key={`${item.name}-${i}`}
                      className="flex items-center justify-between rounded-lg bg-white px-4 py-2 text-sm border border-stone-100"
                    >
                      <span className="text-stone-800">{item.name}</span>
                      <span className="text-stone-500">{mergeQuantities(item.quantities)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

          {aggregated.length === 0 && (
            <p className="py-8 text-center text-stone-400">
              No items yet. Make sure attendance is filled out for meals.
            </p>
          )}
        </div>
      )}

      {/* Manual items from DB */}
      {manualItems.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-stone-700">Manually added items</h3>
          <div className="space-y-1">
            {manualItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg bg-white px-4 py-2 text-sm border border-stone-100"
              >
                <div>
                  <span className="text-stone-800">{item.name}</span>
                  {item.quantity && (
                    <span className="ml-2 text-stone-500">({item.quantity})</span>
                  )}
                </div>
                <button
                  onClick={() => removeItem.mutate({ id: item.id, retreat_id: retreatId })}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add manual item */}
      <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-4">
        <h3 className="mb-3 text-sm font-semibold text-stone-700">Add an item</h3>
        <form onSubmit={handleAddItem} className="flex gap-2">
          <Input
            placeholder="Item name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
          />
          <Input
            placeholder="Qty"
            value={newQty}
            onChange={(e) => setNewQty(e.target.value)}
            className="w-24"
          />
          <Button type="submit" size="sm" disabled={addItem.isPending}>
            Add
          </Button>
        </form>
      </div>
    </div>
  )
}
