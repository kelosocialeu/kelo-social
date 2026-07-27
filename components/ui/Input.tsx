import { InputHTMLAttributes, ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  startAdornment?: ReactNode;
  endAdornment?: ReactNode;
}

export default function Input({
  label,
  error,
  startAdornment,
  endAdornment,
  className = "",
  id,
  ...props
}: InputProps) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label htmlFor={id} className="text-sm font-semibold text-kelo-text">
          {label}
        </label>
      )}
      <div className="relative">
        {startAdornment && (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-kelo-muted">
            {startAdornment}
          </span>
        )}
        <input
          id={id}
          {...props}
          className={`
            w-full rounded-2xl border bg-white py-3 text-sm text-kelo-text
            outline-none transition-all focus:border-kelo-primary focus:ring-4 focus:ring-violet-100
            ${startAdornment ? "pl-10" : "pl-5"}
            ${endAdornment ? "pr-16" : "pr-5"}
            ${error ? "border-kelo-danger" : "border-kelo-border"}
            ${className}
          `}
        />
        {endAdornment && <span className="absolute right-4 top-1/2 -translate-y-1/2">{endAdornment}</span>}
      </div>
      {error && <p className="text-xs font-medium text-kelo-danger">{error}</p>}
    </div>
  );
}
