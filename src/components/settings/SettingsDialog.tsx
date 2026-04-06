import { useEffect, useRef, useState } from 'react'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Avatar from '../ui/Avatar'
import { getAiKey, setAiKey, clearAiKey, type AiProvider } from '../../lib/ai-settings'
import { useMyProfile, useUpdateMyAvatar, useRemoveMyAvatar } from '../../lib/queries'
import { supabase } from '../../lib/supabase'

type SettingsDialogProps = {
  onClose: () => void
}

export default function SettingsDialog({ onClose }: SettingsDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const existing = getAiKey()
  const [provider, setProvider] = useState<AiProvider>(existing?.provider ?? 'anthropic')
  const [keyValue, setKeyValue] = useState(existing?.key ?? '')
  const [showKey, setShowKey] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [displayName, setDisplayName] = useState('You')
  const [uploadError, setUploadError] = useState<string | null>(null)

  const { data: profile } = useMyProfile()
  const updateAvatar = useUpdateMyAvatar()
  const removeAvatar = useRemoveMyAvatar()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setDisplayName(
        (data.user?.user_metadata?.display_name as string | undefined) ||
          data.user?.email?.split('@')[0] ||
          'You'
      )
    })
  }, [])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)
    if (!file.type.startsWith('image/')) {
      setUploadError('Please pick an image file.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('Image is larger than 2 MB — please pick something smaller.')
      return
    }
    try {
      await updateAvatar.mutateAsync(file)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    dialogRef.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleSave = () => {
    if (!keyValue.trim()) return
    setAiKey(provider, keyValue.trim())
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1500)
  }

  const handleClear = () => {
    if (!confirm('Remove the saved API key from this device?')) return
    clearAiKey()
    setKeyValue('')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        tabIndex={-1}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl focus:outline-none"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-stone-800">Settings</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-2xl leading-none text-stone-400 hover:bg-stone-100 hover:text-stone-600"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="space-y-6">
          {/* Profile picture */}
          <div>
            <h3 className="text-sm font-semibold text-stone-700">Profile picture</h3>
            <p className="mt-1 text-xs text-stone-500">
              Shown next to your name across retreats you're a member of.
            </p>
            <div className="mt-3 flex items-center gap-4">
              <Avatar name={displayName} src={profile?.avatar_url ?? null} size="lg" />
              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={updateAvatar.isPending}
                  >
                    {updateAvatar.isPending ? 'Uploading…' : profile?.avatar_url ? 'Change' : 'Upload'}
                  </Button>
                  {profile?.avatar_url && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => removeAvatar.mutate()}
                      disabled={removeAvatar.isPending}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
              </div>
            </div>
          </div>

          <div className="border-t border-stone-200" />

          <div>
            <h3 className="text-sm font-semibold text-stone-700">AI recipe generator</h3>
            <p className="mt-1 text-xs text-stone-500">
              Add an API key to enable the "Generate recipe" button on assigned recipes. Stored only on this device — never sent to our servers.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-stone-700">Provider</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setProvider('anthropic')}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  provider === 'anthropic'
                    ? 'bg-green-700 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                Anthropic (Claude)
              </button>
              <button
                type="button"
                onClick={() => setProvider('openai')}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  provider === 'openai'
                    ? 'bg-green-700 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                OpenAI (GPT)
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="api-key" className="text-sm font-medium text-stone-700">
              API key
            </label>
            <div className="flex gap-2">
              <Input
                id="api-key"
                type={showKey ? 'text' : 'password'}
                value={keyValue}
                onChange={(e) => setKeyValue(e.target.value)}
                placeholder={provider === 'anthropic' ? 'sk-ant-...' : 'sk-...'}
                className="flex-1"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="rounded-lg border border-stone-300 px-3 text-xs text-stone-600 hover:bg-stone-50"
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="text-xs text-stone-400">
              {provider === 'anthropic' ? (
                <>Get one at console.anthropic.com → API Keys</>
              ) : (
                <>Get one at platform.openai.com → API Keys</>
              )}
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            {existing && (
              <button
                type="button"
                onClick={handleClear}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Remove key
              </button>
            )}
            <div className="ml-auto flex gap-2">
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
              <Button onClick={handleSave} disabled={!keyValue.trim()}>
                {savedFlash ? 'Saved!' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
