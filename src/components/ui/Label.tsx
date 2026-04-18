import * as React from "react";
import { cn } from "../../lib/utils";

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          "text-[10px] font-bold text-text-accent uppercase tracking-widest",
          className
        )}
        {...props}
      />
    );
  }
);

Label.displayName = "Label";
