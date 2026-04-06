// Local-only storage for AI provider API keys.
// Kept in localStorage (per device) rather than Supabase user_metadata —
// keys never leave the user's browser, never touch our backend.

export type AiProvider = 'anthropic' | 'openai'

const STORAGE_KEY = 'retreat-eats:ai-key'

type StoredKey = {
  provider: AiProvider
  key: string
}

export function getAiKey(): StoredKey | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed.key === 'string' && parsed.key.length > 0) {
      return parsed as StoredKey
    }
    return null
  } catch {
    return null
  }
}

export function setAiKey(provider: AiProvider, key: string) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ provider, key }))
  window.dispatchEvent(new CustomEvent('ai-key-changed'))
}

export function clearAiKey() {
  localStorage.removeItem(STORAGE_KEY)
  window.dispatchEvent(new CustomEvent('ai-key-changed'))
}

export function hasAiKey(): boolean {
  return getAiKey() !== null
}
