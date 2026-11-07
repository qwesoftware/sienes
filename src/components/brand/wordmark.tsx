import { cn } from "@/lib/utils";

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-flex items-baseline gap-1 font-sans leading-none", className)}
      aria-label="Sienes"
    >
      <span className="text-2xl font-semibold tracking-tight text-primary">sienes</span>
      <span className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
        Neurorehabilitación
      </span>
    </span>
  );
}
