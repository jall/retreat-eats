type AvatarProps = {
  name: string
  src?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg'
  badge?: string // optional emoji/char shown as a small badge at top-right
  className?: string
}

// 12 pleasant background colors (Tailwind-ish palette). Picked by hashing name.
const COLORS = [
  'bg-rose-400',
  'bg-pink-400',
  'bg-fuchsia-400',
  'bg-purple-400',
  'bg-violet-400',
  'bg-indigo-400',
  'bg-sky-400',
  'bg-teal-400',
  'bg-emerald-400',
  'bg-lime-500',
  'bg-amber-400',
  'bg-orange-400',
]

const SIZE_CLASSES: Record<NonNullable<AvatarProps['size']>, string> = {
  xs: 'h-5 w-5 text-[9px]',
  sm: 'h-7 w-7 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-12 w-12 text-base',
}

const BADGE_SIZE_CLASSES: Record<NonNullable<AvatarProps['size']>, string> = {
  xs: 'h-3 w-3 text-[8px] -top-0.5 -right-0.5',
  sm: 'h-4 w-4 text-[10px] -top-0.5 -right-0.5',
  md: 'h-5 w-5 text-xs -top-1 -right-1',
  lg: 'h-6 w-6 text-sm -top-1 -right-1',
}

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function Avatar({ name, src, size = 'sm', badge, className = '' }: AvatarProps) {
  const color = COLORS[hashString(name) % COLORS.length]
  const initials = getInitials(name)
  return (
    <span className={`relative inline-block shrink-0 ${className}`} title={name} aria-label={name}>
      {src ? (
        <img
          src={src}
          alt={name}
          className={`rounded-full object-cover ring-1 ring-white ${SIZE_CLASSES[size]}`}
        />
      ) : (
        <span
          className={`inline-flex items-center justify-center rounded-full font-semibold text-white ring-1 ring-white ${color} ${SIZE_CLASSES[size]}`}
        >
          {initials}
        </span>
      )}
      {badge && (
        <span
          aria-hidden="true"
          className={`absolute inline-flex items-center justify-center rounded-full bg-white ring-1 ring-stone-200 shadow-sm ${BADGE_SIZE_CLASSES[size]}`}
        >
          {badge}
        </span>
      )}
    </span>
  )
}
