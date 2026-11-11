import { cn } from "@/lib/utils";

// The one mark for "Para revisar": something to check, not an error. Missing
// data carries no mark, and red stays for failures of the app.
export function CheckDot({ className }: { className?: string }) {
  return <span aria-hidden className={cn("inline-block size-1.5 shrink-0 rounded-full bg-brand-orange", className)} />;
}
