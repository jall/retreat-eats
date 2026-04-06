type AvatarProps = {
  name: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
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

export default function Avatar({ name, size = 'sm', className = '' }: AvatarProps) {
  const color = COLORS[hashString(name) % COLORS.length]
  const initials = getInitials(name)
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-1 ring-white ${color} ${SIZE_CLASSES[size]} ${className}`}
      title={name}
      aria-label={name}
    >
      {initials}
    </span>
  )
}
