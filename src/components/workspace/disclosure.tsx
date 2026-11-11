import { ChevronRight } from "lucide-react";

// The one expandable row of the workspace.
export function Disclosure({ summary, children, className = "" }: { summary: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <details className={`text-sm ${className}`}>
      <summary className="flex w-fit cursor-pointer list-none items-center gap-1 rounded text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
        <ChevronRight className="size-3.5 shrink-0 transition-transform [details[open]>summary>&]:rotate-90" aria-hidden />
        {summary}
      </summary>
      <div className="mt-2 pl-[1.125rem]">{children}</div>
    </details>
  );
}
