import { SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export default function Select({ label, className = "", id, children, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label htmlFor={id} className="text-sm font-semibold text-kelo-text">
          {label}
        </label>
      )}
      <select
        id={id}
        {...props}
        className={`
          w-full rounded-2xl border border-kelo-border bg-white px-5 py-3 text-sm text-kelo-text
          outline-none transition-all focus:border-kelo-primary focus:ring-4 focus:ring-violet-100
          ${className}
        `}
      >
        {children}
      </select>
    </div>
  );
}
