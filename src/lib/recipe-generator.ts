import { getAiKey } from './ai-settings'

export type GeneratedIngredient = {
  name: string
  quantity: string
  category: string
}

export type GeneratedRecipe = {
  title: string
  notes: string
  ingredients: GeneratedIngredient[]
}

export type RecipeRequest = {
  mealLabel: string // e.g. "Dinner"
  numPeople: number
  allergies: string[] // pooled across attendees
  dietary: string[] // e.g. ["vegan"]
  cuisineHint?: string
}

const SYSTEM_PROMPT = `You are a helpful chef assistant for a group retreat meal planner. \
Generate a single recipe with cooking instructions and a shopping ingredient list. \
Quantities must be scaled for the requested headcount. \
Use UK supermarket-style units (g, kg, ml, l, "tin", "pack", "bunch", "head"). \
Categories must be one of: produce, dairy, meat, bakery, pantry, frozen, drinks, misc. \
Respond ONLY with valid JSON matching the requested schema. No prose, no markdown fences.`

function buildUserPrompt(req: RecipeRequest): string {
  const parts = [
    `Meal: ${req.mealLabel}`,
    `Number of people: ${req.numPeople}`,
  ]
  if (req.dietary.length > 0) parts.push(`Dietary requirements: ${req.dietary.join(', ')}`)
  if (req.allergies.length > 0) {
    parts.push(`STRICT ALLERGIES — must not contain: ${req.allergies.join(', ')}`)
  }
  if (req.cuisineHint?.trim()) parts.push(`Cuisine hint: ${req.cuisineHint.trim()}`)

  parts.push('')
  parts.push('Return JSON with this exact shape:')
  parts.push(`{
  "title": "Recipe name",
  "notes": "Step-by-step cooking instructions, numbered. Include prep time, cook time, and any tips.",
  "ingredients": [
    { "name": "ingredient name", "quantity": "500g", "category": "produce" }
  ]
}`)

  return parts.join('\n')
}

function stripJsonFences(text: string): string {
  return text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
}

export async function generateRecipe(req: RecipeRequest): Promise<GeneratedRecipe> {
  const stored = getAiKey()
  if (!stored) throw new Error('No AI API key configured. Add one in Settings.')

  const userPrompt = buildUserPrompt(req)

  let rawText: string
  if (stored.provider === 'anthropic') {
    rawText = await callAnthropic(stored.key, userPrompt)
  } else if (stored.provider === 'openai') {
    rawText = await callOpenAi(stored.key, userPrompt)
  } else {
    throw new Error(`Unknown provider: ${stored.provider}`)
  }

  let parsed: GeneratedRecipe
  try {
    parsed = JSON.parse(stripJsonFences(rawText))
  } catch {
    throw new Error('AI returned invalid JSON. Try again.')
  }

  if (!parsed.title || !Array.isArray(parsed.ingredients)) {
    throw new Error('AI response missing required fields.')
  }
  return parsed
}

async function callAnthropic(apiKey: string, userPrompt: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Anthropic API error (${res.status}): ${body.slice(0, 200)}`)
  }
  const data = await res.json()
  const text = data?.content?.[0]?.text
  if (typeof text !== 'string') throw new Error('Unexpected Anthropic response shape.')
  return text
}

async function callOpenAi(apiKey: string, userPrompt: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`OpenAI API error (${res.status}): ${body.slice(0, 200)}`)
  }
  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content
  if (typeof text !== 'string') throw new Error('Unexpected OpenAI response shape.')
  return text
}
