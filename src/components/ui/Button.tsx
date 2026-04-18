import * as React from "react";
import { motion, type HTMLMotionProps } from "motion/react";
import { cn } from "../../lib/utils";

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const variants = {
      primary: "bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary-hover",
      secondary: "bg-white border border-border-main text-text-main hover:bg-bg-main",
      ghost: "bg-transparent text-text-muted hover:bg-gray-100",
      danger: "bg-red-50 text-red-500 border border-red-100 hover:bg-red-100",
      outline: "bg-transparent border border-border-main text-text-muted hover:border-gray-300 hover:bg-gray-50"
    };

    const sizes = {
      sm: "px-3 py-1.5 text-[10px]",
      md: "px-4 py-2 text-xs",
      lg: "px-6 py-3 text-sm",
      icon: "p-2"
    };

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed outline-none focus:ring-2 focus:ring-primary/20",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
