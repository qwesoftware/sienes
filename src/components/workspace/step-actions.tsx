// The bar of a stage: what is pending on the left, the actions on the right.
// It stays at the bottom of the viewport, so the main action is always in the
// same place whatever the length of the stage.
export function StepActions({ status, children }: { status?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 mt-auto flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t bg-background px-6 py-3">
      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">{status}</div>
      <div className="ml-auto flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

// The stage's own content, above the bar.
export function StepBody({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`px-6 py-6 ${className}`}>{children}</div>;
}
