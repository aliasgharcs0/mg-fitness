import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-sm border border-white/15 px-2 py-0.5 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-primary bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_18px_rgba(204,255,0,0.2)]",
        secondary: "border-secondary bg-secondary text-secondary-foreground hover:bg-secondary/90",
        destructive: "border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-[0_0_18px_rgba(255,60,60,0.18)]",
        outline: "border-input bg-background text-foreground hover:bg-accent/10",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
