import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {}

export default function Card({
  children,
  className = "",
  ...props
}: CardProps) {
  return (
    <div
      {...props}
      className={`
        rounded-[24px]
        border
        border-kelo-border
        bg-white
        p-6
        shadow-kelo
        ${className}
      `}
    >
      {children}
    </div>
  );
}
