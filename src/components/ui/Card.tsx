import type { ReactNode } from 'react'

type CardProps = {
  title?: string
  children: ReactNode
  className?: string
}

export default function Card({ title, children, className = '' }: CardProps) {
  return (
    <div className={`rounded-xl border border-stone-200 bg-white p-5 shadow-sm ${className}`}>
      {title && (
        <h3 className="mb-3 text-lg font-semibold text-stone-800">{title}</h3>
      )}
      {children}
    </div>
  )
}
