import { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({ label, error, className = "", id, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label htmlFor={id} className="text-sm font-semibold text-kelo-text">
          {label}
        </label>
      )}
      <input
        id={id}
        {...props}
        className={`
          w-full rounded-2xl border bg-white px-5 py-3 text-sm text-kelo-text
          outline-none transition-all focus:border-kelo-primary focus:ring-4 focus:ring-violet-100
          ${error ? "border-kelo-danger" : "border-kelo-border"}
          ${className}
        `}
      />
      {error && <p className="text-xs font-medium text-kelo-danger">{error}</p>}
    </div>
  );
}
