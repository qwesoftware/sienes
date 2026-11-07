import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// The one main action of a step, in the brand magenta.
export function MainAction({ className, ...props }: React.ComponentProps<typeof Button>) {
  return <Button {...props} className={cn("bg-brand-magenta text-white hover:bg-brand-magenta/85", className)} />;
}
