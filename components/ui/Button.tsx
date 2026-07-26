import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export default function Button({
  children,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={`
        w-full
        rounded-full
        bg-kelo-gradient
        py-3
        font-bold
        text-white
        transition-all
        hover:scale-[1.02]
        hover:shadow-kelo
        active:scale-95
        disabled:opacity-50
        ${className}
      `}
    >
      {children}
    </button>
  );
}
