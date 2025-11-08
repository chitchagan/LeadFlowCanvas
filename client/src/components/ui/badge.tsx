import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  // Whitespace-nowrap: Badges should never wrap.
  "whitespace-nowrap inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" +
  " hover-elevate " ,
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-xs",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow-xs",
        outline: " border [border-color:var(--badge-outline)] shadow-xs",
        
        // Dynamic status colors
        gray: "border-transparent bg-muted text-muted-foreground",
        blue: "border-transparent bg-blue-500/10 text-blue-600 dark:text-blue-400",
        green: "border-transparent bg-green-500/10 text-green-600 dark:text-green-400",
        yellow: "border-transparent bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
        red: "border-transparent bg-red-500/10 text-red-600 dark:text-red-400",
        purple: "border-transparent bg-purple-500/10 text-purple-600 dark:text-purple-400",
        pink: "border-transparent bg-pink-500/10 text-pink-600 dark:text-pink-400",
        orange: "border-transparent bg-orange-500/10 text-orange-600 dark:text-orange-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants }
