import { useState } from 'react'
import {
  useShoppingItems,
  useAddShoppingItem,
  useRemoveShoppingItem,
  useRetreatMembers,
} from '../../lib/queries'
import { useAuth } from '../layout/AuthGuard'
import { SNACK_PREFILLS } from '../../lib/prefills'
import Button from '../ui/Button'
import Input from '../ui/Input'

type SnackRequestsProps = {
  retreatId: string
}

export default function SnackRequests({ retreatId }: SnackRequestsProps) {
  const { user } = useAuth()
  const { data: allItems = [] } = useShoppingItems(retreatId)
  const { data: members = [] } = useRetreatMembers(retreatId)
  const addItem = useAddShoppingItem()
  const removeItem = useRemoveShoppingItem()

  const [newName, setNewName] = useState('')
  const [newQty, setNewQty] = useState('')

  const currentMember = members.find((m) => m.user_id === user.id)

  // Snack requests are shopping_items where meal_id is null
  const snackItems = allItems.filter((item) => !item.meal_id)

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    addItem.mutate(
      {
        retreat_id: retreatId,
        name: newName.trim(),
        quantity: newQty.trim() || undefined,
        category: 'snacks',
        meal_id: null,
        added_by_member_id: currentMember?.id || null,
      },
      { onSuccess: () => { setNewName(''); setNewQty('') } }
    )
  }

  const handleAddSuggestion = (name: string) => {
    addItem.mutate({
      retreat_id: retreatId,
      name,
      category: 'snacks',
      meal_id: null,
      added_by_member_id: currentMember?.id || null,
    })
  }

  // Filter out suggestions that are already added
  const addedNames = new Set(snackItems.map((i) => i.name.toLowerCase()))
  const suggestions = SNACK_PREFILLS.filter(
    (p) => !addedNames.has(p.name.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Existing snack requests */}
      {snackItems.length > 0 ? (
        <div className="space-y-2">
          {snackItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg border border-stone-200 bg-white px-4 py-3"
            >
              <div>
                <span className="text-sm font-medium text-stone-800">{item.name}</span>
                {item.quantity && (
                  <span className="ml-2 text-sm text-stone-500">({item.quantity})</span>
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
      ) : (
        <p className="py-8 text-center text-stone-400">
          No snack requests yet. Add some below or pick from the suggestions.
        </p>
      )}

      {/* Add form */}
      <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-4">
        <h3 className="mb-3 text-sm font-semibold text-stone-700">Add a snack request</h3>
        <form onSubmit={handleAdd} className="flex gap-2">
          <Input
            placeholder="e.g. Popcorn"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
          />
          <Input
            placeholder="Qty (optional)"
            value={newQty}
            onChange={(e) => setNewQty(e.target.value)}
            className="w-32"
          />
          <Button type="submit" size="sm" disabled={addItem.isPending}>
            Add
          </Button>
        </form>
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-stone-700">Suggestions</h3>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s.name}
                onClick={() => handleAddSuggestion(s.name)}
                className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-700 hover:border-green-300 hover:bg-green-50 transition-colors"
              >
                + {s.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
