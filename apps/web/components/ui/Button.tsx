import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "terracotta";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  icon,
  className = "",
  disabled,
  ...props
}) => {
  const baseClasses =
    "inline-flex items-center justify-center font-medium rounded transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-goldLeaf/60 disabled:opacity-50 disabled:cursor-not-allowed select-none";

  const sizeClasses = {
    sm: "px-2.5 py-1 text-xs gap-1.5",
    md: "px-4 py-2 text-sm gap-2",
    lg: "px-5 py-2.5 text-base gap-2.5",
  }[size];

  const variantClasses = {
    primary:
      "bg-gradient-to-r from-goldLeaf to-goldLeaf-glow text-parchment-950 font-semibold shadow-md hover:shadow-goldLeaf/20 hover:brightness-105 active:scale-[0.98]",
    secondary:
      "bg-parchment-900 border border-goldLeaf/30 text-parchment-100 hover:bg-parchment-800 hover:border-goldLeaf/60 active:scale-[0.98]",
    outline:
      "bg-transparent border border-sandstone/30 text-sandstone hover:border-goldLeaf hover:text-goldLeaf active:scale-[0.98]",
    ghost:
      "bg-transparent text-sandstone-warm hover:bg-parchment-900/60 hover:text-goldLeaf",
    terracotta:
      "bg-terracotta text-white font-medium hover:bg-terracotta-dark shadow-md active:scale-[0.98]",
  }[variant];

  return (
    <button
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </button>
  );
};
