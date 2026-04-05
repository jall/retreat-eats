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

const SUPERMARKETS = [
  { key: 'tesco', label: 'Tesco', url: 'tesco.com/groceries' },
  { key: 'sainsburys', label: "Sainsbury's", url: 'sainsburys.co.uk/gol-ui/groceries' },
  { key: 'ocado', label: 'Ocado', url: 'ocado.com' },
  { key: 'waitrose', label: 'Waitrose', url: 'waitrose.com/ecom/shop/browse/groceries' },
  { key: 'morrisons', label: 'Morrisons', url: 'groceries.morrisons.com' },
  { key: 'asda', label: 'Asda', url: 'groceries.asda.com' },
] as const

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
  const [showAiOrder, setShowAiOrder] = useState(false)
  const [selectedSupermarket, setSelectedSupermarket] = useState<string>(SUPERMARKETS[0].key)
  const [aiPromptCopied, setAiPromptCopied] = useState(false)

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

  const buildAiPrompt = () => {
    const supermarket = SUPERMARKETS.find((s) => s.key === selectedSupermarket)!
    const itemLines: string[] = []
    for (const [cat, items] of Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b))) {
      itemLines.push(`[${cat.charAt(0).toUpperCase() + cat.slice(1)}]`)
      for (const item of items) {
        itemLines.push(`- ${item.name}: ${mergeQuantities(item.quantities)}`)
      }
    }
    const allergyNote = allAllergies.length > 0
      ? `\n\nIMPORTANT - allergies to avoid: ${allAllergies.join(', ')}. Do NOT add any products containing these allergens.`
      : ''

    return `Go to ${supermarket.url} and add the following items to my basket. I'm already logged in.

For each item:
1. Use the search bar to find the item
2. Pick the best match — prefer own-brand/value range where sensible, check the size matches the quantity needed
3. Adjust the quantity if I need more than one
4. Add to basket
5. Move on to the next item

If an item is out of stock, skip it and note it at the end.
If you're unsure between two products, pick the cheaper one.${allergyNote}

Here's the shopping list:

${itemLines.join('\n')}

When done, tell me the total number of items added and list any that were skipped.`
  }

  const handleCopyAiPrompt = () => {
    navigator.clipboard.writeText(buildAiPrompt())
    setAiPromptCopied(true)
    setTimeout(() => setAiPromptCopied(false), 2000)
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
                  className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI ordering */}
      {showList && aggregated.length > 0 && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-indigo-900">Order via AI</h3>
              <p className="text-xs text-indigo-600">
                Copy a prompt for Claude Desktop (with computer use) to add items to your supermarket basket
              </p>
            </div>
            <button
              onClick={() => setShowAiOrder(!showAiOrder)}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
            >
              {showAiOrder ? 'Hide' : 'Set up'}
            </button>
          </div>

          {showAiOrder && (
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-indigo-900">Supermarket</label>
                <div className="flex flex-wrap gap-2">
                  {SUPERMARKETS.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => setSelectedSupermarket(s.key)}
                      className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                        selectedSupermarket === s.key
                          ? 'bg-indigo-700 text-white'
                          : 'bg-white text-indigo-700 border border-indigo-200 hover:border-indigo-400'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-white border border-indigo-200 p-3">
                <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap text-xs text-stone-700 font-mono">
                  {buildAiPrompt()}
                </pre>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button onClick={handleCopyAiPrompt}>
                  {aiPromptCopied ? 'Copied!' : 'Copy prompt'}
                </Button>
                <p className="text-xs text-indigo-600">
                  Paste into Claude Desktop with computer use enabled. Make sure you're logged into {SUPERMARKETS.find((s) => s.key === selectedSupermarket)?.label} first.
                </p>
              </div>

              <details className="text-xs text-indigo-500">
                <summary className="cursor-pointer hover:text-indigo-700">How does this work?</summary>
                <div className="mt-2 space-y-1.5 text-indigo-600">
                  <p>1. Open <strong>Claude Desktop</strong> (Mac or Windows) and enable <strong>computer use</strong> in Settings</p>
                  <p>2. Log into your supermarket website in your browser</p>
                  <p>3. Paste the prompt above into Claude Desktop</p>
                  <p>4. Claude will take control of your screen, search for each item, and add them to your basket</p>
                  <p>5. Review the basket and checkout yourself — Claude won't enter payment details</p>
                </div>
              </details>
            </div>
          )}
        </div>
      )}

      {/* Add manual item */}
      <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-4">
        <h3 className="mb-3 text-sm font-semibold text-stone-700">Add an item</h3>
        <form onSubmit={handleAddItem} className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="Item name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
          />
          <div className="flex gap-2">
            <Input
              placeholder="Qty"
              value={newQty}
              onChange={(e) => setNewQty(e.target.value)}
              className="w-24"
            />
            <Button type="submit" size="sm" disabled={addItem.isPending}>
              Add
            </Button>
          </div>
        </form>
        {addItem.isError && (
          <p className="mt-2 text-sm text-red-600">{addItem.error.message}</p>
        )}
      </div>
    </div>
  )
}
