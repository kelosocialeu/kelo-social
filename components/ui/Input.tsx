import { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export default function Input({
  className = "",
  ...props
}: InputProps) {
  return (
    <input
      {...props}
      className={`
        w-full
        rounded-2xl
        border
        border-kelo-border
        bg-white
        px-5
        py-3
        outline-none
        transition-all
        focus:border-kelo-primary
        focus:ring-4
        focus:ring-violet-100
        ${className}
      `}
    />
  );
}
