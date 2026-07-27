import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  loading?: boolean;
  loadingText?: string;
  variant?: "primary" | "secondary";
}

export default function Button({
  children,
  className = "",
  loading = false,
  loadingText,
  variant = "primary",
  disabled,
  ...props
}: ButtonProps) {
  const base =
    variant === "primary"
      ? "bg-kelo-gradient text-white hover:shadow-kelo"
      : "bg-kelo-background text-kelo-text hover:bg-kelo-border/60";

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`
        w-full rounded-full py-3 font-bold transition-all
        hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100
        ${base}
        ${className}
      `}
    >
      {loading ? loadingText ?? children : children}
    </button>
  );
}
