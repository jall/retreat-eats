import { forwardRef, type InputHTMLAttributes } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, className = '', id, ...rest }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-stone-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900
            placeholder:text-stone-400 focus:border-green-500 focus:outline-none focus:ring-2
            focus:ring-green-500/20 disabled:bg-stone-50 disabled:cursor-not-allowed ${className}`}
          {...rest}
        />
      </div>
    )
  }
)

Input.displayName = 'Input'
export default Input
